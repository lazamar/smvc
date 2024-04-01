// Spec
//    = { tag : string
//      , attributes : { attribute: string }
//      , listeners : { event: listener } -- support a single listener
//      , children : [Spec]
//      }
//    | { textContent : string }
//
// ElementDiff
//    = Replace Element
//    | Remove
//    | Create Element
//    | Modify ContentsDiff
//    | Noop
//
// ContentsDiff
//    = { removeAttr :: [String]
//      , setAttr :: { attribute: value }
//      , removeListeners :: { event: f }
//      , addListeners :: { event: f }
//      , children : [ElementDiff]
//      }
//
const UI = (function () {

let props = new Set([ "autoplay", "checked", "checked", "contentEditable", "controls",
  "default", "hidden", "loop", "selected", "spellcheck", "value", "id", "title",
  "accessKey", "dir", "dropzone", "lang", "src", "alt", "preload", "poster",
  "kind", "label", "srclang", "sandbox", "srcdoc", "type", "value", "accept",
  "placeholder", "acceptCharset", "action", "autocomplete", "enctype", "method",
  "name", "pattern", "htmlFor", "max", "min", "step", "wrap", "useMap", "shape",
  "coords", "align", "cite", "href", "target", "download", "download",
  "hreflang", "ping", "start", "headers", "scope", "span" ]);

function setAttribute(attr, value, el) {
  if (props.has(attr)) {
    el[attr] = value;
  } else {
    el.setAttribute(attr, value);
  }
}

function eventName(str) {
  if (str.indexOf("on") == 0) {
    return str.slice(2).toLowerCase();
  }
  return null;
}

const noop = { noop : true };

// diff two specs
function diffOne(l, r) {
  let isText = l.textContent !== undefined;
  if (isText) {
    return l.textContent !== r.textContent
      ? { replace: r }
      : noop;
  }

  if (l.tag !== r.tag) {
    return { replace: r };
  }

  const removeAttr = [];
  const setAttr = {};
  const removeListeners = {};
  const addListeners = {};
  for (const attr in l.attributes) {
    if (r.attributes[attr] === undefined) {
      let event = eventName(attr);
      if (event !== null) {
        removeListeners[event] = l.attributes[attr];
      } else {
        removeAttr.push(attr);
      }
    }
  }

  for (const attr in r.attributes) {
    if (r.attributes[attr] !== l.attributes[attr]) {
      let event = eventName(attr);
      if (event === null) {
        setAttr[attr] = r.attributes[attr];
      } else {
        removeListeners[event] = l.attributes[attr];
        addListeners[event] = r.attributes[attr];
      }
    }
  }

  const children = diffList(l.children, r.children);
  const noChildrenChange = children.every(e => e.noop);
  const noAttributeChange =
        (removeAttr.length === 0) &&
        (Array.from(Object.keys(setAttr)).length == 0)

  if (noChildrenChange && noAttributeChange) {
    return noop;
  }

  return { modify: { removeAttr, setAttr, removeListeners, addListeners, children } };
}

function diffList(ls, rs) {
  let len = Math.max(ls.length, rs.length);
  let diffs = [];
  for (let i = 0; i < len; i++) {
    diffs.push(
      (ls[i] === undefined)
      ? { create: rs[i] }
      : (rs[i] == undefined)
      ? { remove: true }
      : diffOne(ls[i], rs[i])
    );
  }
  return diffs;
}

function addListener(enqueue, el, event, handle) {
  if (typeof handle !== "function") {
    throw Error(`Event listener for ${attr} is not a function`);
  }
  const listener = e => enqueue(handle(e));
  el._ui.listeners[event] = listener;
  el.addEventListener(event, listener);
}

function create(enqueue, spec) {
  if (spec.textContent !== undefined) {
    let el = document.createTextNode(spec.textContent);
    return el;
  }

  let el = document.createElement(spec.tag);
  el._ui = { listeners : [] };

  for (const attr in spec.attributes) {
    let event = eventName(attr);
    let value = spec.attributes[attr];
    event
      ? addListener(enqueue, el, event, value)
      : setAttribute(attr, value, el);
  }

  for (let i in spec.children) {
    const childSpec = spec.children[i];
    const child = create(enqueue, childSpec);
    el.appendChild(child);
  }

  return el;
}

function modify(el, enqueue, diff) {
  for (const attr in diff.removeAttr) {
    el.removeAttribute(attr);
  }
  for (const attr in diff.setAttr) {
    setAttribute(attr, diff.setAttr[attr], el);
  }
  for (const event in diff.removeListeners) {
    el.removeEventListener(event, el._ui.listeners[event]);
  }
  for (const event in diff.addListeners) {
    let handle = diff.addListeners[event];
    addListener(enqueue, el, event, handle);
  }
  if (diff.children.length < el.childNodes.length) {
    throw new Error("unmatched children lengths");
  }

  apply(el, enqueue, diff.children);
}

function apply(el, enqueue, childrenDiff) {
  for (let i = 0, k = 0; i < childrenDiff.length; i++, k++) {
    let diff = childrenDiff[i];
    let action = Object.keys(diff)[0];
    switch (action) {
      case "remove":
        el.childNodes[k].remove();
        k--;
        break;

      case "modify":
        modify(el.childNodes[k], enqueue, diff.modify);
        break;

      case "create": {
        if (k < el.childNodes.length) {
          throw new Error("Adding in the middle of children: " + k + " " + el.childNodes.length);
        }
        let child = create(enqueue, diff.create);
        el.appendChild(child);
        break;
      }

      case "replace": {
        let child = create(enqueue, diff.replace);
        el.childNodes[k].replaceWith(child);
        break;
      }

      case "noop":
        break;

      default:
        throw new Error("Unexpected diff option: " + Object.keys(diff));
    }
  }
}

// Create an HTML element
function h(tag, attributes, children) {
  console.assert(typeof tag === "string");
  console.assert(typeof attributes === "object");
  console.assert(Array.isArray(children) && !children.includes(undefined));
  return { tag, attributes, children };
}

// Create a text element
function text(textContent) {
  return { textContent }
}

// Start managing the contents of an HTML node.
function init(root, initialState, update, view) {
  let state = initialState; // client application state
  let spec = []; // elements spec
  let queue = []; // msg queue

  function enqueue(msg) {
    queue.push(msg);
  }

  // draws the current state
  function draw() {
    let newSpec = view(state);
    apply(root, enqueue, diffList(spec, newSpec));
    spec = newSpec;
  }

  function updateState() {
    if (queue.length > 0) {
      let msgs = queue;
      queue = [];

      msgs.forEach(msg => {
        try {
          state = update(state, msg, enqueue);
        } catch (e) {
          console.error(e);
        }
      });

      draw();
    }

    window.requestAnimationFrame(updateState);
  }

  draw();
  updateState();

  return { enqueue };
}

return { init, h, text };
})();
