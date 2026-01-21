import type { KwamiConfig, KwamiState, KwamiCallbacks, MemoryContext, MemorySearchResult } from './types'
import { Avatar } from './avatar'
import { Agent } from './agent'
import { Persona } from './persona'
import { Memory } from './memory'
import { ToolRegistry } from './tools'
import { SkillManager } from './skills'
import { logger } from './utils/logger'

/**
 * Kwami - 3D AI Companion
 * 
 * The main orchestrator that brings together:
 * - Avatar: Visual representation (3D blob)
 * - Agent: AI processing (voice pipelines)
 * - Persona: Personality and prompts
 * - Memory: Long-term recall (Zep)
 * - Tools: External capabilities (MCP)
 * - Skills: Native behaviors
 * 
 * @example
 * ```typescript
 * const kwami = new Kwami(canvas, {
 *   avatar: { renderer: 'blob' },
 *   agent: { adapter: 'livekit' },
 *   persona: { name: 'Assistant', personality: 'friendly' },
 *   memory: { adapter: 'zep' },
 * })
 * 
 * await kwami.connect()
 * ```
 */
export class Kwami {
  /** Visual representation */
  public avatar: Avatar
  
  /** AI processing */
  public agent: Agent
  
  /** Personality and prompts */
  public persona: Persona
  
  /** Long-term memory */
  public memory: Memory
  
  /** External tools (MCP) */
  public tools: ToolRegistry
  
  /** Native behaviors */
  public skills: SkillManager

  private state: KwamiState = 'idle'
  private callbacks: KwamiCallbacks = {}
  private userId: string | null = null

  /**
   * Get the library version
   */
  static getVersion(): string {
    return '2.0.0'
  }

  constructor(canvas: HTMLCanvasElement, config?: KwamiConfig) {
    // Initialize all modules
    this.avatar = new Avatar(canvas, config?.avatar)
    this.agent = new Agent(config?.agent)
    this.persona = new Persona(config?.persona)
    this.memory = new Memory(config?.memory)
    this.tools = new ToolRegistry(config?.tools)
    this.skills = new SkillManager(config?.skills)

    // Set Kwami reference in skills for context
    this.skills.setKwamiRef(this)

    // Wire up internal events
    this.wireUp()

    logger.info(`Kwami v${Kwami.getVersion()} initialized`)
  }

  /**
   * Wire up internal event handlers
   */
  private wireUp(): void {
    // Agent events → Avatar state
    this.agent.onUserSpeech((transcript) => {
      this.callbacks.onUserTranscript?.(transcript)
      this.memory.addMessage('user', transcript).catch(e => logger.error('Failed to save user message:', e))
    })

    this.agent.onAgentText((text) => {
      this.callbacks.onAgentResponse?.(text)
      this.memory.addMessage('assistant', text).catch(e => logger.error('Failed to save agent message:', e))
    })

    this.agent.onError((error) => {
      this.callbacks.onError?.(error)
      this.setState('idle')
    })
  }

  /**
   * Get current state
   */
  getState(): KwamiState {
    return this.state
  }

  /**
   * Set state (updates avatar)
   */
  setState(state: KwamiState): void {
    this.state = state
    this.avatar.setState(state)
    this.callbacks.onStateChange?.(state)
  }

  /**
   * Connect to AI backend and start conversation
   * 
   * @param userId - User identifier for memory
   * @param callbacks - Event callbacks
   */
  async connect(userId?: string, callbacks?: KwamiCallbacks): Promise<void> {
    if (callbacks) {
      this.callbacks = { ...this.callbacks, ...callbacks }
    }

    this.userId = userId ?? `user_${Date.now()}`

    try {
      // Initialize memory for this user
      if (this.memory.getConfig().adapter) {
        await this.memory.initialize(this.userId)
      }

      // Get memory context for system prompt
      let memoryContext: MemoryContext | undefined
      if (this.memory.isInitialized()) {
        memoryContext = await this.memory.getContext()
      }

      // Get system prompt with memory context
      const systemPrompt = this.persona.getSystemPrompt(memoryContext)

      // Get tool definitions
      const tools = this.tools.getToolDefinitions()

      // Connect agent
      await this.agent.connect({
        persona: {
          systemPrompt,
        },
        tools,
      })

      this.setState('listening')
      logger.info('Kwami connected')
    } catch (error) {
      logger.error('Failed to connect:', error)
      this.setState('idle')
      throw error
    }
  }

  /**
   * Disconnect from AI backend
   */
  async disconnect(): Promise<void> {
    await this.agent.disconnect()
    this.setState('idle')
    logger.info('Kwami disconnected')
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.agent.isConnected()
  }

  /**
   * Send a text message to the agent
   */
  sendMessage(text: string): void {
    if (!this.isConnected()) {
      logger.warn('Cannot send message: not connected')
      return
    }
    this.agent.send(text)
  }

  /**
   * Interrupt the current agent response
   */
  interrupt(): void {
    this.agent.interrupt()
  }

  /**
   * Register event callbacks
   */
  on(callbacks: KwamiCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks }
  }

  /**
   * Execute a skill by name
   */
  async executeSkill(skillName: string, params?: Record<string, unknown>): Promise<void> {
    await this.skills.execute(skillName, params)
  }

  /**
   * Execute a tool by name
   */
  async executeTool(toolName: string, params: Record<string, unknown>): Promise<unknown> {
    return this.tools.execute(toolName, params)
  }

  /**
   * Get memory context
   */
  async getMemoryContext(): Promise<MemoryContext> {
    return this.memory.getContext()
  }

  /**
   * Search memory
   */
  async searchMemory(query: string, limit?: number): Promise<MemorySearchResult[]> {
    return this.memory.search(query, limit)
  }

  /**
   * Cleanup all resources
   */
  async dispose(): Promise<void> {
    await this.disconnect()
    this.avatar.dispose()
    this.agent.dispose()
    this.memory.dispose()
    await this.tools.dispose()
    this.skills.dispose()
    logger.info('Kwami disposed')
  }
}
