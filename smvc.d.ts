
declare namespace SMVC {
  function init<State, Msg>(
    root: HTMLElement,
    initialState: State,
    update: UpdateFunction<State, Msg>,
    view: ViewFunction<State, Msg>
  ): { enqueue : EnqueueFunction<Msg> };

  function h<Msg>(
    tag: string,
    properties: Properties<Msg>,
    children: Array<VNode<Msg>>
  ) : VNode<Msg>;

  function t(content: string) : VNode<unknown>;
}


class VNode<Msg> {
  private hidden : Properties<Msg>;
}

// User-defined function to update the state
type UpdateFunction<State, Msg> =
  ( state: State,
    msg: Msg,
    enqueue: EnqueueFunction<Msg>
  ) => State

// User-defined function to produce a view
type ViewFunction<State, Msg> = (state: State) => Array<VNode<Msg>>

type EnqueueFunction<Msg> = (msg: Msg) => void

