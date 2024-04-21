# html-ui

This is a simple-as-it-gets library for using a virtual DOM to separate the handling of state and view.

The entire API consists of 4 functions.

It uses simple JavaScript, has no dependencies, requires no transpilation, and has fewer than 300 lines of code.

### Example

Visit the [demos](https://lazamar.github.io/html-ui/demos/) page.

A complete example. See it in action [here](https://lazamar.github.io/html-ui/demos/minimal.html).

```html
<html>
  <body>
    <div id="container"></div>
    <script src="./ui.js"></script>
    <script>
      const { init, h, text } = UI;
      const root = document.querySelector("#container");
      const initialState = 0;

      const update = (state, msg, enqueue) => state + msg;

      const view = (state) => [
        h("div", { style: "color: red", onClick: () => 2 }, [
          h("p", {}, [
            text(`The count is ${state}. Click here to increment.`)
          ])
        ])
      ];

      const { enqueue } = init(root, initialState, update, view);
      enqueue(1);
    </script>
  </body>
</html>
```

## Quickstart

After importing `ui.js` start your application by calling `UI.init` with the appropriate arguments.

You can use the library as follows:

```javascript
// `UI` is the only identifier the library adds to the global
// scope. It is an object with a function to start the
// application and two functions to build html elements
const { init, h, text } = UI;

// Where the application will be rendered
const root = document.querySelector("#container");

// An initial state for the application.
const initialState = { ... };

// How to update that state
function update(state, msg, enqueue) { ... }

// A function to build the view using the `h` and `text`
// functions from in the UI object.
function view(state) { ... }

// Start the application. `init` returns an object with the
// enqueue function, which is is used to scheduled messages
// to be used to update the state.
const { enqueue } = init(root, initialState, update, view);
```

### Creating HTML

This library creates elements in the page based on a description of how the page should look like.

The user-defined `view` function should return this description in the form of an
array of element descriptions.

There are two functions to create HTML element descriptions.

* `text(str: string) : Element` - Describe a text node.
* `h(tag: string, properties: Object, children: Array<Element>) : Element` - Describe an HTML element.

The `properties` object should contain HTML properties and attributes as keys.

Keys that start with the `on` prefix in the `properties` attributes are treated as event listeners
and its values should be functions.

If an event listener returns a value different from `undefined` this value will
be used as a message and queued to be sent to the update function.

Examples:

```javascript
function view(state) {
  return [
    // A `div` with a class.
    h("div", { class: "container" }, [ ... ]),

    // A disabled button.
    h("button", { disabled: "true" }, [ ... ]),

    // A button that will emit the string `"toggle"` as a message when clicked.
    h("button", { onClick: () => "toggle" }, [ ... ]),

    // A button that will emit a message containing the HTML event handled by the onClick listener.
    h("button", { onClick: e => e }, [ ... ])
  ]
}
```

### Emitting messages

The state is updated by handling messages in the user-defined `update` function.

There are two ways to emit messages.

**Returning from an event listener**

Any value that is not `undefined` returned by an event listener will be emitted as a message.

```javascript
// A button which when clicked will emit as a message
// the object { tag: "clicked, event: <event> }
// where <event> is the HTML event being handled.
h(
    "button",
    {
        onClick : function (e) {
            return { tag: "clicked", event: e }
        }
    },
    [ text("click") ]
)
```

**Using the `enqueue` function**

This function is in the object returned by `init` and will schedule a message to be handled.

``` javascript
const { enqueue } = init(root, initialState, update, view);

// Emit a message.
enqueue({ tag: "setCounter", value: 2 });
```

It is safe to call `enqueue` inside the `update` function.

Messages are put in a queue and the `update` function is called for each of them in order.

### Updating the state

The user-defined `update` function is the part of the program where the state
should be changed. It must return the new state.

It takes three arguments:

* The current state.
* The message to be handled.
* The `enqueue` function.

It is safe to call `enqueue` from inside `update`.
