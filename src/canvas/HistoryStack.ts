export interface Action {
  undo(): void
  redo(): void
}

export class HistoryStack {
  private stack: Action[] = []
  private index = -1

  push(action: Action): void {
    this.stack.splice(this.index + 1)
    this.stack.push(action)
    this.index = this.stack.length - 1
  }

  undo(): void {
    if (this.index < 0) return
    this.stack[this.index].undo()
    this.index--
  }

  redo(): void {
    if (this.index >= this.stack.length - 1) return
    this.index++
    this.stack[this.index].redo()
  }

  canUndo(): boolean {
    return this.index >= 0
  }

  canRedo(): boolean {
    return this.index < this.stack.length - 1
  }
}
