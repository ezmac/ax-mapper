export interface Tool {
  readonly id: string
  onEnter(): void
  onExit(): void
  onPointerMove(): void
  onPointerDown(): void
  onKeyDown(e: KeyboardEvent): void
}

type ToolChangeListener = (toolId: string | null) => void

export class ToolManager {
  private tools = new Map<string, Tool>()
  private currentTool: Tool | null = null
  private changeListeners: ToolChangeListener[] = []

  get currentToolId(): string | null {
    return this.currentTool?.id ?? null
  }

  register(tool: Tool): void {
    this.tools.set(tool.id, tool)
  }

  onToolChange(fn: ToolChangeListener): void {
    this.changeListeners.push(fn)
  }

  setTool(id: string | null): void {
    this.currentTool?.onExit()
    this.currentTool = id ? (this.tools.get(id) ?? null) : null
    this.currentTool?.onEnter()
    for (const l of this.changeListeners) l(this.currentTool?.id ?? null)
  }

  handlePointerMove(): void {
    this.currentTool?.onPointerMove()
  }

  handlePointerDown(): void {
    this.currentTool?.onPointerDown()
  }

  handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.setTool(null)
      return
    }
    this.currentTool?.onKeyDown(e)
  }
}
