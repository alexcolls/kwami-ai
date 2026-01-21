import type { AgentConfig, AgentPipeline, PipelineConnectOptions, PersonaConfig, ToolDefinition } from '../types'
import type { AgentAdapter } from './adapters/types'
import type { VoicePipelineConfig } from './voice/types'
import { LiveKitAdapter } from './adapters/LiveKitAdapter'
import { logger } from '../utils/logger'

// Forward declaration to avoid circular dependency
interface KwamiRef {
  id: string
  persona: { getConfig(): PersonaConfig }
}

/**
 * Agent - Manages AI processing pipelines
 * 
 * The Agent is responsible for:
 * - Creating and managing the appropriate pipeline (voice, realtime, multimodal)
 * - Connecting to backend services via adapters (LiveKit, etc.)
 * - Handling conversation flow
 * - Syncing configuration updates to the backend in real-time
 * 
 * The actual AI processing happens on the backend (Python agent deployed to LiveKit).
 * This class manages the frontend connection and configuration.
 */
export class Agent {
  private config: AgentConfig
  private adapter: AgentAdapter | null = null
  private pipeline: AgentPipeline | null = null
  
  // Callbacks
  private onUserSpeechCallback?: (transcript: string) => void
  private onAgentTextCallback?: (text: string) => void
  private _onErrorCallback?: (error: Error) => void

  constructor(config?: AgentConfig, _kwamiRef?: KwamiRef) {
    this.config = config ?? {}
    this.initAdapter()
  }

  private initAdapter(): void {
    const adapterType = this.config.adapter ?? 'livekit'
    
    switch (adapterType) {
      case 'livekit':
        this.adapter = new LiveKitAdapter(this.config.livekit)
        break
      default:
        logger.warn(`Unknown adapter type: ${adapterType}, falling back to livekit`)
        this.adapter = new LiveKitAdapter(this.config.livekit)
    }
    
    logger.debug(`Agent initialized with ${this.adapter.getName()} adapter`)
  }

  /**
   * Connect to the AI backend and start conversation
   * Dispatches a unique agent instance with the provided configuration
   */
  async connect(options?: PipelineConnectOptions): Promise<void> {
    if (!this.adapter) {
      throw new Error('No adapter configured')
    }
    
    if (!this.adapter.isConfigured()) {
      throw new Error('Adapter is not properly configured. Check your credentials.')
    }
    
    // Create pipeline from adapter
    this.pipeline = this.adapter.createPipeline()
    
    // Wire up callbacks
    if (this.onUserSpeechCallback) {
      this.pipeline.onUserSpeech(this.onUserSpeechCallback)
    }
    if (this.onAgentTextCallback) {
      this.pipeline.onAgentText(this.onAgentTextCallback)
    }
    
    // Connect with full Kwami config for agent dispatch
    await this.pipeline.connect(options ?? {})
    logger.info('Agent connected')
  }

  /**
   * Disconnect from the AI backend
   */
  async disconnect(): Promise<void> {
    await this.pipeline?.disconnect()
    this.pipeline = null
    logger.info('Agent disconnected')
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.pipeline?.isConnected() ?? false
  }

  // ---------------------------------------------------------------------------
  // Voice Configuration
  // ---------------------------------------------------------------------------

  /**
   * Get the current voice pipeline configuration
   */
  getVoiceConfig(): VoicePipelineConfig | undefined {
    return this.config.livekit?.voice
  }

  /**
   * Update voice pipeline configuration
   * Use syncConfigToBackend() to push changes to the running agent
   */
  updateVoiceConfig(config: Partial<VoicePipelineConfig>): void {
    if (!this.config.livekit) {
      this.config.livekit = {}
    }
    this.config.livekit.voice = {
      ...this.config.livekit.voice,
      ...config,
    }
    
    // Update adapter config
    if (this.adapter && 'updateConfig' in this.adapter) {
      (this.adapter as LiveKitAdapter).updateConfig({ voice: this.config.livekit.voice })
    }
  }

  /**
   * Sync configuration changes to the backend agent in real-time
   * This sends a data message to the running agent to update its config
   */
  syncConfigToBackend(
    type: 'voice' | 'persona' | 'tools' | 'full',
    config: VoicePipelineConfig | PersonaConfig | ToolDefinition[] | Record<string, unknown>
  ): void {
    if (!this.pipeline?.isConnected()) {
      logger.warn('Cannot sync config: not connected')
      return
    }
    
    // Send config update via the pipeline's data channel
    if (this.pipeline && 'sendConfigUpdate' in this.pipeline) {
      (this.pipeline as AgentPipeline & { sendConfigUpdate: (type: string, config: unknown) => void })
        .sendConfigUpdate(type, config)
    }
  }

  // ---------------------------------------------------------------------------
  // Callbacks
  // ---------------------------------------------------------------------------

  /**
   * Register callback for user speech transcripts
   */
  onUserSpeech(callback: (transcript: string) => void): void {
    this.onUserSpeechCallback = callback
    this.pipeline?.onUserSpeech(callback)
  }

  /**
   * Register callback for agent text responses
   */
  onAgentText(callback: (text: string) => void): void {
    this.onAgentTextCallback = callback
    this.pipeline?.onAgentText(callback)
  }

  /**
   * Register callback for agent audio responses
   */
  onAgentSpeech(callback: (audio: ArrayBuffer) => void): void {
    this.pipeline?.onAgentSpeech(callback)
  }

  /**
   * Register error callback
   */
  onError(callback: (error: Error) => void): void {
    this._onErrorCallback = callback
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  /**
   * Send text message to agent
   */
  send(text: string): void {
    if (!this.pipeline?.isConnected()) {
      logger.warn('Cannot send text: not connected')
      return
    }
    this.pipeline.sendText(text)
  }

  /**
   * Interrupt the current agent response
   */
  interrupt(): void {
    this.pipeline?.interrupt()
  }

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------

  /**
   * Get the error callback
   */
  getErrorCallback(): ((error: Error) => void) | undefined {
    return this._onErrorCallback
  }

  /**
   * Get current configuration
   */
  getConfig(): AgentConfig {
    return { ...this.config }
  }

  /**
   * Update configuration (may require reconnect for some changes)
   */
  updateConfig(config: Partial<AgentConfig>): void {
    this.config = { ...this.config, ...config }
    
    // Reinitialize adapter if adapter type changed
    if (config.adapter) {
      this.adapter?.dispose()
      this.initAdapter()
    }
    
    // Update adapter config for livekit changes
    if (config.livekit && this.adapter && 'updateConfig' in this.adapter) {
      (this.adapter as LiveKitAdapter).updateConfig(config.livekit)
    }
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.pipeline?.dispose()
    this.adapter?.dispose()
    this.pipeline = null
    this.adapter = null
  }
}
