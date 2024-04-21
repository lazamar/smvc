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

function assert(predicate, ...args) {
  if (!predicate) {
    console.error(...args);
    throw new Error("fatal");
  }
}

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

function listener(event) {
  const el = event.currentTarget;
  const handler = el._ui.listeners[event.type];
  const enqueue = el._ui.enqueue;
  assert(typeof enqueue == "function", "Invalid enqueue");
  const msg = handler(event);
  if (msg !== undefined) {
    enqueue(msg);
  }
}

function setListener(el, event, handle) {
  assert(typeof handle == "function", "Event listener is not a function for event:", event);

  if (el._ui.listeners[event] === undefined) {
    el.addEventListener(event, listener);
  }

  el._ui.listeners[event] = handle;
}

function eventName(str) {
  if (str.indexOf("on") == 0) {
    return str.slice(2).toLowerCase();
  }
  return null;
}

// diff two specs
function diffOne(l, r) {
  assert(r instanceof Element, "Expected an instance of Element, found", r);
  let isText = l.textContent !== undefined;
  if (isText) {
    return l.textContent !== r.textContent
      ? { replace: r }
      : { noop : true };
  }

  if (l.tag !== r.tag) {
    return { replace: r };
  }

  const remove = [];
  const set = {};

  for (const attr in l.attributes) {
    if (r.attributes[attr] === undefined) {
      remove.push(attr);
    }
  }

  for (const attr in r.attributes) {
    if (r.attributes[attr] !== l.attributes[attr]) {
      set[attr] = r.attributes[attr];
    }
  }

  const children = diffList(l.children, r.children);
  const noChildrenChange = children.every(e => e.noop);
  const noAttributeChange =
        (remove.length === 0) &&
        (Array.from(Object.keys(set)).length == 0);

  return (noChildrenChange && noAttributeChange)
    ? { noop : true }
    : { modify: { remove, set, children } };
}

function diffList(ls, rs) {
  assert(rs instanceof Array, "Expected an array, found", rs);
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

function create(enqueue, spec) {
  assert(spec instanceof Element, "Expected an instance of Element, found", spec);

  if (spec.textContent !== undefined) {
    let el = document.createTextNode(spec.textContent);
    return el;
  }

  let el = document.createElement(spec.tag);
  el._ui = { listeners : {}, enqueue };

  for (const attr in spec.attributes) {
    let event = eventName(attr);
    let value = spec.attributes[attr];
    (event === null)
      ? setAttribute(attr, value, el)
      : setListener(el, event, value);
  }

  for (let childSpec of spec.children) {
    const child = create(enqueue, childSpec);
    el.appendChild(child);
  }

  return el;
}

function modify(el, enqueue, diff) {
  for (const attr of diff.remove) {
    const event = eventName(attr);
    if (event === null) {
      el.removeAttribute(attr);
    } else {
      el._ui.listeners[event] = undefined;
      el.removeEventListener(event, listener);
    }
  }

  for (const attr in diff.set) {
    const value = diff.set[attr];
    const event = eventName(attr);
    (event === null)
      ? setAttribute(attr, value, el)
      : setListener(el, event, value);
  }

  assert(diff.children.length >= el.childNodes.length, "unmatched children lengths");
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
        const len = el.childNodes.length;
        assert(k === len, "adding to the middle of children", k, len);
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

class Element {
  constructor(any) { Object.assign(this, any) }
}

// Create an HTML element
function h(tag, attributes, children) {
  assert(typeof tag === "string", "Invalid tag value:", tag);
  assert(typeof attributes === "object", "Expected attributes object. Found:", attributes);
  assert(Array.isArray(children), "Expected children array. Found:", children);
  return new Element({ tag, attributes, children });
}

// Create a text element
function text(textContent) {
  return new Element({ textContent });
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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = UI
}
