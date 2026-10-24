import type { BoardObject } from '../types/board';

export class HistoryManager {
  private states: BoardObject[][] = [];
  private cursor = -1;
  private maxDepth = 60;

  constructor(maxDepth = 60, initialState: BoardObject[] = []) {
    this.maxDepth = maxDepth;
    if (initialState.length > 0) {
      this.states = [[...initialState]];
      this.cursor = 0;
    }
  }

  public pushState(state: BoardObject[]): void {
    // Drop redo future branches
    this.states = this.states.slice(0, this.cursor + 1);
    this.states.push([...state]);

    if (this.states.length > this.maxDepth) {
      this.states.shift();
    } else {
      this.cursor++;
    }
  }

  public canUndo(): boolean {
    return this.cursor > 0;
  }

  public canRedo(): boolean {
    return this.cursor < this.states.length - 1;
  }

  public undo(_currentState?: BoardObject[]): BoardObject[] | null {
    if (!this.canUndo()) return null;
    this.cursor--;
    return [...this.states[this.cursor]];
  }

  public redo(_currentState?: BoardObject[]): BoardObject[] | null {
    if (!this.canRedo()) return null;
    this.cursor++;
    return [...this.states[this.cursor]];
  }

  public clear(initialState: BoardObject[] = []): void {
    this.states = [[...initialState]];
    this.cursor = 0;
  }
}
