export interface Transition<S extends string> {
  from: S;
  to: S;
  requiredPermission?: string;
  label: string;
}

export interface StateMachine<S extends string> {
  initialState: S;
  transitions: Transition<S>[];
  getAvailableTransitions(currentState: S): Transition<S>[];
  canTransition(from: S, to: S): boolean;
  getNextStates(currentState: S): S[];
}

export function createStateMachine<S extends string>(
  initialState: S,
  transitions: Transition<S>[],
): StateMachine<S> {
  return {
    initialState,
    transitions,
    getAvailableTransitions(currentState: S): Transition<S>[] {
      return transitions.filter((t) => t.from === currentState);
    },
    canTransition(from: S, to: S): boolean {
      return transitions.some((t) => t.from === from && t.to === to);
    },
    getNextStates(currentState: S): S[] {
      return transitions
        .filter((t) => t.from === currentState)
        .map((t) => t.to);
    },
  };
}
