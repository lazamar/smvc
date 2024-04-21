const { init, h, text } = UI;

const emit = v => _ => v;

function update (s, msg) {
  switch (true) {
    case "Noop" in msg:
      return s;
    case "UpdateField" in msg:
      const { UpdateField: value } = msg;
      return Object.assign({}, s, {
        field: value,
      });
    case "Add" in msg: {
      return Object.assign({}, s,
        { uid: s.uid + 1,
          field: "",
          entries: s.field.trim().length === 0
            ? s.entries
            : s.entries.concat([newEntry(s.field, s.uid)]),
        },
      );
    }
    case "EditingEntry" in msg: {
      const { EditingEntry: { id, isEditing } } = msg;
      requestAnimationFrame(() => {
        const input = document.querySelector("#todo-" + id);
        const end = input.value.length;
        input.setSelectionRange(end, end);
        input.focus();
      });
      return Object.assign({}, s, {
        entries: s.entries.map(entry => {
            if (entry.id == id) {
              entry.editing = isEditing;
            }
            return entry;
          })
      });
    }
    case "UpdateEntry" in msg: {
      const { UpdateEntry: { id, value } } = msg;
      return Object.assign({}, s, {
        entries: s.entries.map(entry => {
            if (entry.id == id) {
              entry.description = value;
            }
            return entry;
          })
      });
    }
    case "Delete" in msg: {
      const { Delete : id } = msg;
      return Object.assign({}, s, {
        entries: s.entries.filter(e => e.id !== id)
      });
    }
    case "DeleteComplete" in msg: {
      return Object.assign({}, s, {
        entries: s.entries.filter(e => !e.completed)
      });
    }
    case "Check" in msg: {
      const { Check : { id, isCompleted } } = msg;
      return Object.assign({}, s, {
        entries: s.entries.map(entry => {
          if (entry.id === id) {
            entry.completed = isCompleted;
          }
          return entry
        })
      });
    }
    case "CheckAll" in msg: {
      const { CheckAll : completed } = msg;
      return Object.assign({}, s, {
        entries: s.entries.map(entry => {
          entry.completed = completed;
          return entry
        })
      });
    }
    case "ChangeVisibility" in msg: {
      const { ChangeVisibility : visibility } = msg;
      return Object.assign({}, s, { visibility });
    }
  }
  return s;
}

const newEntry = (description, id) =>
  ({
    description,
    id,
    completed: false,
    editing: false,
  });

const view = (state) =>
  [
    h("div", { class: "todomvc-wrapper" }, [
      h("section", { class: "todoapp" }, [
        viewInput(state.field),
        viewEntries(state.visibility, state.entries),
        viewControls(state.visibility, state.entries)
      ]),
      infoFooter
    ])
  ]

const noop = { Noop : true };

function viewInput(value) {
  return h("header", { class : "header" }, [
    h("h1", {}, [text("todos")]),
    h("input",
      { class : "new-todo",
        placeholder: "what needs to be done?",
        autofocus: "true",
        value: value,
        name: "newTodo",
        onInput: e => ({ UpdateField : e.target.value }),
        onKeydown : onEnter({ Add : true })
      }, [])
  ]);
}

const onEnter = msg => event =>
  (event.keyCode == 13)
    ? msg
    : noop

function viewEntries(visibility, entries) {
  const isVisible = todo =>
        (visibility === "Completed")
        ? todo.completed
        : (visibility === "Active")
        ? !todo.completed
        : true;
  const allCompleted = entries.every(e => e.completed);
  const cssVisibility = entries.length === 0 ? "hidden" : "visible";
  return h("section", { class : "main", style: `visibility: ${cssVisibility}` }, [
    h("input", {
      class: "toggle-all",
      id: "toggle-all",
      type: "checkbox",
      checked: allCompleted,
      onClick: emit({ CheckAll : !allCompleted })
    },[]),
    h("label", { for: "toggle-all" }, [
      text("Mark all as complete")
    ]),
    h("ul", { class : "todo-list" },
      entries.filter(e => isVisible(e)).map(viewEntry)
    )
  ]);
}

const classes = obj => Object.keys(obj).filter(key => obj[key]).join(" ");

const viewEntry = (todo) =>
  h("li", { class: classes({ completed: todo.completed, editing: todo.editing }) }, [
    h("div", { class: "view" }, [
      h("input", {
        class: "toggle",
        type: "checkbox",
        checked: todo.completed,
        onClick: emit({ Check: { id: todo.id, isCompleted: !todo.completed } })
      }, []),
      h("label", { onDblclick : emit({ EditingEntry : { id: todo.id, isEditing: true } }) }, [
        text(todo.description)
      ]),
      h("button", { class: "destroy", onClick : emit({ Delete : todo.id  }) }, [])
    ]),
    h("input", {
      class: "edit",
      value: todo.description,
      id: "todo-" + todo.id.toString(),
      onInput: e => ({ UpdateEntry: { id: todo.id, value: e.target.value } }),
      onBlur: emit({ EditingEntry: { id: todo.id, isEditing: false } }),
      onKeydown: onEnter({ EditingEntry: { id: todo.id, isEditing: false } })
      }, [])
  ]);


function viewControls(visibility, entries) {
  const entriesCompleted = entries.filter(e => e.completed).length;
  const entriesLeft = entries.length - entriesCompleted;
  return h("footer", { class: "footer", hidden: entries.length === 0 }, [
    viewControlsCount(entriesLeft),
    viewControlsFilters(visibility),
    viewControlsClear(entriesCompleted),
  ]);
}

const viewControlsCount = (entriesLeft) =>
  h("span", { class : "todo-count" }, [
    h("strong",{},[
      text(entriesLeft.toString())
    ]),
    text(entriesLeft === 1 ? " item left" : " items left")
  ]);

const viewControlsFilters = (visibility) =>
  h("ul", { class: "filters" }, [
    visibilitySwap("#/", "All", visibility),
    text(" "),
    visibilitySwap("#/active", "Active", visibility),
    text(" "),
    visibilitySwap("#/completed", "Completed", visibility),
  ]);


const visibilitySwap = (url, visibility, actualVisibility) =>
  h("li", { onClick : emit({ ChangeVisibility : visibility }) }, [
    h("a", { href: url, class: classes({ selected: visibility === actualVisibility }) }, [
      text(visibility)
    ])
  ])

const viewControlsClear = (entriesCompleted) =>
  h("button", {
    class: "clear-completed",
    hidden: entriesCompleted === 0,
    onClick: emit({ DeleteComplete: true }),
  },[
    text("Clear completed (" + entriesCompleted.toString() + ")")
  ]);


const infoFooter =
  h("footer", { class: "info" }, [
    h("p", {}, [ text("Double-click to edit a todo") ]),
    h("p", {}, [
      text("Written by "),
      h("a", { href: "https://github.com/lazamar" }, [ text("Marcelo Lazaroni") ])
    ]),
    h("p", {}, [
      text("Port of "),
      h("a", { href: "http://todomvc.com" }, [ text("TodoMVC") ])
    ]),
  ]);

const root = document.querySelector("#todomvc");
const initialState = {
  entries: [],
  visibility: "All",
  field: "",
  uid: 0,
};
init(root, initialState, update, view);



