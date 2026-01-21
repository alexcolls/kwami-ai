import type { MemoryConfig, MemoryAdapter, MemoryContext, MemorySearchResult } from '../types'
import { ZepAdapter } from './adapters/ZepAdapter'
import { logger } from '../utils/logger'

/**
 * Memory - Manages long-term memory for the AI companion
 * 
 * Supports different memory backends:
 * - Zep Cloud (recommended for production)
 * - Local (in-memory, for development)
 */
export class Memory {
  private config: MemoryConfig
  private adapter: MemoryAdapter | null = null
  private initialized = false

  constructor(config?: MemoryConfig) {
    this.config = config ?? {}
    this.initAdapter()
  }

  private initAdapter(): void {
    const adapterType = this.config.adapter ?? 'zep'
    
    switch (adapterType) {
      case 'zep':
        this.adapter = new ZepAdapter(this.config.zep)
        break
      case 'local':
        // TODO: Implement LocalAdapter for development
        logger.warn('Local memory adapter not implemented, using Zep')
        this.adapter = new ZepAdapter(this.config.zep)
        break
      default:
        logger.warn(`Unknown memory adapter: ${adapterType}, falling back to Zep`)
        this.adapter = new ZepAdapter(this.config.zep)
    }
  }

  /**
   * Initialize memory for a user
   */
  async initialize(userId: string): Promise<void> {
    if (!this.adapter) {
      throw new Error('No memory adapter configured')
    }
    
    await this.adapter.initialize(userId)
    this.initialized = true
    logger.info(`Memory initialized for user: ${userId}`)
  }

  /**
   * Check if memory is initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Add a message to memory
   */
  async addMessage(role: 'user' | 'assistant', content: string): Promise<void> {
    if (!this.adapter) {
      throw new Error('No memory adapter configured')
    }
    await this.adapter.addMessage(role, content)
  }

  /**
   * Get memory context for the current conversation
   */
  async getContext(): Promise<MemoryContext> {
    if (!this.adapter) {
      throw new Error('No memory adapter configured')
    }
    return this.adapter.getContext()
  }

  /**
   * Search memory for relevant context
   */
  async search(query: string, limit?: number): Promise<MemorySearchResult[]> {
    if (!this.adapter) {
      throw new Error('No memory adapter configured')
    }
    return this.adapter.search(query, limit)
  }

  /**
   * Clear all memory
   */
  async clear(): Promise<void> {
    if (!this.adapter) {
      throw new Error('No memory adapter configured')
    }
    await this.adapter.clear()
  }

  /**
   * Get current configuration
   */
  getConfig(): MemoryConfig {
    return { ...this.config }
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.adapter?.dispose()
    this.adapter = null
    this.initialized = false
  }
}
