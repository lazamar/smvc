export {
  init, h, text,
  EnqueueFunction, UpdateFunction, ViewFunction, VirtualNode
};

declare type Listener<Msg> = (e: Event) => Msg | undefined;

declare type Properties<Msg> =
  { [key: string]: string | boolean | Listener<Msg>
  , [key: `on${string}`]: Listener<Msg>
  }

declare function init<State, Msg>(
    root: Element,
    initialState: State,
    update: UpdateFunction<State, Msg>,
    view: ViewFunction<State, Msg>
  ): { enqueue : EnqueueFunction<Msg> };

declare function h<Msg>(
    tag: string,
    properties: Properties<Msg>,
    children: Array<VirtualNode<Msg>>
  ) : VirtualNode<Msg>;

declare function text<T>(content: string) : VirtualNode<T>;

// User-defined function to update the state
declare type UpdateFunction<State, Msg> =
  ( state: State,
    msg: Msg,
    enqueue: EnqueueFunction<Msg>
  ) => State

// User-defined function to produce a view
declare type ViewFunction<State, Msg> = (state: State) => Array<VirtualNode<Msg>>

declare type EnqueueFunction<Msg> = (msg: Msg) => void

declare class VirtualNode<Msg> {
  private hidden : Properties<Msg>;
}

