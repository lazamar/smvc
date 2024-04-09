const { init, h, text } = UI;


const root = document.querySelector("#container");

const initialState = { selected: -1 };

init(root, initialState, update, view);

function update(state, msg) {
    state.selected = msg;
    return state;
}

function row(highlighted, rowNumber) {
    return h("div", {class: "row",  onClick: () => highlighted + 1 }, [
        h("div", {class: "box", style: addHighlight(highlighted, boxNumber(rowNumber, 0))}, []),
        h("div", {class: "box", style: addHighlight(highlighted, boxNumber(rowNumber, 1))}, []),
        h("div", {class: "box", style: addHighlight(highlighted, boxNumber(rowNumber, 2))}, []),
        h("div", {class: "box", style: addHighlight(highlighted, boxNumber(rowNumber, 3))}, []),
        h("div", {class: "box", style: addHighlight(highlighted, boxNumber(rowNumber, 4))}, []),
        h("div", {class: "box", style: addHighlight(highlighted, boxNumber(rowNumber, 5))}, []),
        h("div", {class: "box", style: addHighlight(highlighted, boxNumber(rowNumber, 6))}, []),
        h("div", {class: "box", style: addHighlight(highlighted, boxNumber(rowNumber, 7))}, []),
    ]);
}

function view(state) {
    return [
        h("h1", {id:"title"}, [text("Checkers")]),

        h("div", {class: "board"}, [
            row(state.selected, 0),
            row(state.selected, 1),
            row(state.selected, 2),
            row(state.selected, 3),
            row(state.selected, 4),
            row(state.selected, 5),
            row(state.selected, 6),
            row(state.selected, 7),
        ]),
    ];
}

function addHighlight (n, boxNumber) {
    return n == boxNumber ? "background-color: yellow" : "";

}

function boxNumber(rowNumber, columnNumber){
    let i = rowNumber * 8 + columnNumber
    return i;
}
