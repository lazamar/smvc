// VirtualNode
//    = { tag : string
//      , properties : { property: string }
//      , children : [VirtualNode]
//      }
//    | { text : string }
//
// Diff
//    = { replace : VirtualNode }
//    | { remove : true }
//    | { create : VirtualNode }
//    | { modify : { remove :: string[], set :: { property : value }, children :: Diff[] } }
//    | { noop : true }
//
const SMVC = (function () {

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

function setProperty(prop, value, el) {
  if (props.has(prop)) {
    el[prop] = value;
  } else {
    el.setAttribute(prop, value);
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

// diff two virtual nodes
function diffOne(l, r) {
  assert(r instanceof VirtualNode, "Expected an instance of VirtualNode, found", r);
  let isText = l.text !== undefined;
  if (isText) {
    return l.text !== r.text
      ? { replace: r }
      : { noop : true };
  }

  if (l.tag !== r.tag) {
    return { replace: r };
  }

  const remove = [];
  const set = {};

  for (const prop in l.properties) {
    if (r.properties[prop] === undefined) {
      remove.push(prop);
    }
  }

  for (const prop in r.properties) {
    if (r.properties[prop] !== l.properties[prop]) {
      set[prop] = r.properties[prop];
    }
  }

  const children = diffList(l.children, r.children);
  const noChildrenChange = children.every(e => e.noop);
  const noPropertyChange =
        (remove.length === 0) &&
        (Array.from(Object.keys(set)).length == 0);

  return (noChildrenChange && noPropertyChange)
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

function create(enqueue, vnode) {
  assert(vnode instanceof VirtualNode, "Expected an instance of VirtualNode, found", vnode);

  if (vnode.text !== undefined) {
    let el = document.createTextNode(vnode.text);
    return el;
  }

  let el = document.createElement(vnode.tag);
  el._ui = { listeners : {}, enqueue };

  for (const prop in vnode.properties) {
    let event = eventName(prop);
    let value = vnode.properties[prop];
    (event === null)
      ? setProperty(prop, value, el)
      : setListener(el, event, value);
  }

  for (let childVNode of vnode.children) {
    const child = create(enqueue, childVNode);
    el.appendChild(child);
  }

  return el;
}

function modify(el, enqueue, diff) {
  for (const prop of diff.remove) {
    const event = eventName(prop);
    if (event === null) {
      el.removeAttribute(prop);
    } else {
      el._ui.listeners[event] = undefined;
      el.removeEventListener(event, listener);
    }
  }

  for (const prop in diff.set) {
    const value = diff.set[prop];
    const event = eventName(prop);
    (event === null)
      ? setProperty(prop, value, el)
      : setListener(el, event, value);
  }

  assert(diff.children.length >= el.childNodes.length, "unmatched children lengths");
  apply(el, enqueue, diff.children);
}

function apply(el, enqueue, childrenDiff) {
  let children = Array.from(el.childNodes);

  childrenDiff.forEach((diff, i) => {
    let action = Object.keys(diff)[0];
    switch (action) {
      case "remove":
        children[i].remove();
        break;

      case "modify":
        modify(children[i], enqueue, diff.modify);
        break;

      case "create": {
        assert(i >= children.length, "adding to the middle of children", i, children.length);
        let child = create(enqueue, diff.create);
        el.appendChild(child);
        break;
      }

      case "replace": {
        let child = create(enqueue, diff.replace);
        children[i].replaceWith(child);
        break;
      }

      case "noop":
        break;

      default:
        throw new Error("Unexpected diff option: " + Object.keys(diff));
    }
  });
}

class VirtualNode {
  constructor(any) { Object.assign(this, any) }
}

// Create an HTML element description (a virtual node)
function h(tag, properties, children) {
  assert(typeof tag === "string", "Invalid tag value:", tag);
  assert(typeof properties === "object", "Expected properties object. Found:", properties);
  assert(Array.isArray(children), "Expected children array. Found:", children);
  return new VirtualNode({ tag, properties, children });
}

// Create a text element description (a virtual text node)
function text(content) {
  return new VirtualNode({ text: content });
}

// Start managing the contents of an HTML element.
function init(root, initialState, update, view) {
  let state = initialState; // client application state
  let nodes = []; // virtual DOM nodes
  let queue = []; // msg queue

  function enqueue(msg) {
    queue.push(msg);
  }

  // draws the current state
  function draw() {
    let newNodes = view(state);
    apply(root, enqueue, diffList(nodes, newNodes));
    nodes = newNodes;
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

if (typeof define !== 'undefined' && define.amd) { // AMD
  define([], function () { return SMVC })
} else if (typeof module !== 'undefined' && module.exports) { // CommonJS
  module.exports = SMVC
} else if (typeof window !== 'undefined') { // Script tag
  window.SMVC = SMVC
}
