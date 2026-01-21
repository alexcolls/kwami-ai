import type { AgentPipeline, LiveKitConfig } from '../../types'

/**
 * Agent Adapter Interface
 * 
 * Adapters connect Kwami to specific backend services (LiveKit, etc.)
 */
export interface AgentAdapter {
  /**
   * Create a pipeline instance using this adapter
   */
  createPipeline(): AgentPipeline
  
  /**
   * Get the adapter name
   */
  getName(): string
  
  /**
   * Check if the adapter is properly configured
   */
  isConfigured(): boolean
  
  /**
   * Cleanup resources
   */
  dispose(): void
}

/**
 * LiveKit-specific adapter configuration
 */
export interface LiveKitAdapterConfig extends LiveKitConfig {
  // Room connection options
  autoSubscribe?: boolean
  dynacast?: boolean
  adaptiveStream?: boolean
  
  // Audio options
  echoCancellation?: boolean
  noiseSuppression?: boolean
  autoGainControl?: boolean
  
  // API key for token endpoint
  apiKey?: string
}

/**
 * Adapter factory function type
 */
export type AdapterFactory<TConfig = unknown> = (config?: TConfig) => AgentAdapter
