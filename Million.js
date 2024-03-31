const { init, h, text } = UI;

function randomPrimary() {
  return 1 + Math.ceil(Math.random() * 255);
}

function randomColour() {
  return `rgb(${randomPrimary()}, ${randomPrimary()}, ${randomPrimary()})`;
}

function update({ nodes }, _, enqueue) {
  enqueue("repaint");
  return { nodes : nodes.map(c => {
      if (Math.random() < 0.05) {
        return randomColour()
      }
      return c;
  }) };
}

function view(s) {
  return s.nodes.map(colour =>
    h("div", { style: `background-color: ${colour};` }, [])
  )
}

const node_count = 10_000;
const nodes = [];
for (let i = 0; i < node_count; i++) {
  nodes.push(randomColour());
}
const root = document.querySelector("main");
const initialState = { nodes };
const { enqueue } = init(root, initialState, update, view);
enqueue("repaint")
