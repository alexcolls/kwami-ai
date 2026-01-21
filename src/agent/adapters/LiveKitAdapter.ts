import type { AgentPipeline, PipelineConnectOptions } from '../../types'
import type { AgentAdapter, LiveKitAdapterConfig } from './types'
import type { VoiceLatencyMetrics, VoicePipelineMetrics } from '../voice/types'
import { VoiceSession } from '../voice/VoiceSession'
import { logger } from '../../utils/logger'

/**
 * LiveKit Adapter
 * 
 * Connects Kwami to LiveKit for real-time voice AI.
 * Supports full configuration of the voice pipeline including:
 * - VAD (Voice Activity Detection)
 * - STT (Speech-to-Text)
 * - LLM (Large Language Model)
 * - TTS (Text-to-Speech)
 * - Realtime models
 * - Voice enhancements (turn detection, noise cancellation)
 * - Metrics collection
 * 
 * @example
 * ```typescript
 * const adapter = new LiveKitAdapter({
 *   url: 'wss://your-livekit-server.com',
 *   tokenEndpoint: '/api/livekit/token',
 *   voice: {
 *     stt: { provider: 'deepgram', model: 'nova-3', language: 'en', useInference: true },
 *     llm: { provider: 'openai', model: 'gpt-4.1-mini', useInference: true },
 *     tts: { provider: 'cartesia', model: 'sonic-3', voice: 'jacqueline', useInference: true },
 *     enhancements: {
 *       turnDetection: { enabled: true, model: 'multilingual' },
 *       noiseCancellation: { enabled: true, mode: 'bvc' },
 *     },
 *   },
 * })
 * ```
 */
export class LiveKitAdapter implements AgentAdapter {
  private config: LiveKitAdapterConfig
  private voiceSession: VoiceSession

  constructor(config?: LiveKitAdapterConfig) {
    this.config = config ?? {}
    
    // Initialize voice session with config
    this.voiceSession = new VoiceSession({
      pipeline: this.config.voice,
      instructions: this.config.instructions,
      events: this.config.events,
      userAwayTimeout: this.config.userAwayTimeout,
      minConsecutiveSpeechDelay: this.config.minConsecutiveSpeechDelay,
    })
  }

  getName(): string {
    return 'livekit'
  }

  isConfigured(): boolean {
    // Need either a token, token endpoint, or api key+secret for local dev
    return !!(
      this.config.token || 
      this.config.tokenEndpoint ||
      (this.config.apiKey && this.config.apiSecret)
    )
  }

  createPipeline(): AgentPipeline {
    return new LiveKitPipeline(this.config, this.voiceSession)
  }

  /**
   * Get the voice session for configuration
   */
  getVoiceSession(): VoiceSession {
    return this.voiceSession
  }

  /**
   * Get current configuration
   */
  getConfig(): LiveKitAdapterConfig {
    return { ...this.config }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LiveKitAdapterConfig>): void {
    this.config = { ...this.config, ...config }
    
    // Update voice session if voice config changed
    if (config.voice) {
      this.voiceSession.updateConfig(config.voice)
    }
    if (config.instructions !== undefined) {
      this.voiceSession.setInstructions(config.instructions)
    }
  }

  dispose(): void {
    // Nothing to cleanup at adapter level
  }
}

/**
 * LiveKit Pipeline Implementation
 * 
 * Handles the actual WebRTC connection to LiveKit and voice pipeline management.
 */
class LiveKitPipeline implements AgentPipeline {
  private config: LiveKitAdapterConfig
  private voiceSession: VoiceSession
  private connected = false
  
  // Timestamps for latency tracking
  private sttStartTime = 0
  private llmStartTime = 0
  private ttsStartTime = 0
  private turnStartTime = 0
  
  // Callbacks (used when connected)
  private userSpeechCb?: (transcript: string) => void
  private agentSpeechCb?: (audio: ArrayBuffer) => void
  private agentTextCb?: (text: string) => void

  constructor(config: LiveKitAdapterConfig, voiceSession: VoiceSession) {
    this.config = config
    this.voiceSession = voiceSession
  }

  async connect(_options: PipelineConnectOptions): Promise<void> {
    logger.info('LiveKit pipeline connecting...')
    
    // Get token (either from config, generate locally, or fetch from endpoint)
    let token = this.config.token
    
    if (!token && this.config.apiKey && this.config.apiSecret) {
      // Local development: generate token client-side
      logger.warn('⚠️ Generating token client-side - ONLY use for local development!')
      token = await this.generateLocalToken()
    } else if (!token && this.config.tokenEndpoint) {
      token = await this.fetchToken()
    }
    
    if (!token) {
      throw new Error('No LiveKit token available. Provide token, tokenEndpoint, or apiKey+apiSecret.')
    }
    
    const serverUrl = this.config.url
    if (!serverUrl) {
      throw new Error('No LiveKit server URL configured.')
    }

    // Start voice session metrics
    this.voiceSession.startMetrics()
    this.voiceSession.setState('initializing')

    // Export voice session config for backend
    const voiceConfig = this.voiceSession.toLiveKitConfig()
    logger.debug('Voice pipeline config:', voiceConfig)

    // TODO: Implement actual LiveKit connection using livekit-client
    // This will connect to the room and the backend agent
    // The backend agent (Python/Node.js) handles the actual AI processing
    // This frontend just manages the WebRTC connection and audio/video

    logger.info('LiveKit pipeline connected (placeholder)')
    this.connected = true
    this.voiceSession.setState('listening')
  }

  async disconnect(): Promise<void> {
    logger.info('LiveKit pipeline disconnecting...')
    this.connected = false
    this.voiceSession.setState('idle')
  }

  isConnected(): boolean {
    return this.connected
  }

  // ---------------------------------------------------------------------------
  // Callbacks
  // ---------------------------------------------------------------------------

  onUserSpeech(callback: (transcript: string) => void): void {
    this.userSpeechCb = callback
    this.voiceSession.on({
      onUserSpeechEnded: callback,
    })
  }

  onAgentSpeech(callback: (audio: ArrayBuffer) => void): void {
    this.agentSpeechCb = callback
  }

  onAgentText(callback: (text: string) => void): void {
    this.agentTextCb = callback
    this.voiceSession.on({
      onAgentSpeechEnded: callback,
    })
  }

  // ---------------------------------------------------------------------------
  // Latency Tracking
  // ---------------------------------------------------------------------------

  /**
   * Start tracking STT latency
   */
  startSTTTracking(): void {
    this.sttStartTime = Date.now()
  }

  /**
   * End STT tracking and record latency
   */
  endSTTTracking(): void {
    if (this.sttStartTime > 0) {
      const sttLatency = Date.now() - this.sttStartTime
      this.voiceSession.updateLatency({ stt: sttLatency })
      this.sttStartTime = 0
    }
  }

  /**
   * Start tracking end of turn detection latency
   */
  startTurnTracking(): void {
    this.turnStartTime = Date.now()
  }

  /**
   * End turn tracking and record latency
   */
  endTurnTracking(): void {
    if (this.turnStartTime > 0) {
      const turnLatency = Date.now() - this.turnStartTime
      this.voiceSession.updateLatency({ endOfTurn: turnLatency })
      this.turnStartTime = 0
    }
  }

  /**
   * Start tracking LLM latency
   */
  startLLMTracking(): void {
    this.llmStartTime = Date.now()
  }

  /**
   * End LLM tracking and record latency (time to first token)
   */
  endLLMTracking(): void {
    if (this.llmStartTime > 0) {
      const llmLatency = Date.now() - this.llmStartTime
      this.voiceSession.updateLatency({ llm: llmLatency })
      this.llmStartTime = 0
    }
  }

  /**
   * Start tracking TTS latency
   */
  startTTSTracking(): void {
    this.ttsStartTime = Date.now()
  }

  /**
   * End TTS tracking and record latency
   */
  endTTSTracking(): void {
    if (this.ttsStartTime > 0) {
      const ttsLatency = Date.now() - this.ttsStartTime
      this.voiceSession.updateLatency({ tts: ttsLatency })
      this.ttsStartTime = 0
    }
  }

  /**
   * Record overall latency (from user speech end to agent speech start)
   */
  recordOverallLatency(overallMs: number): void {
    this.voiceSession.updateLatency({ overall: overallMs })
  }

  /**
   * Get current metrics
   */
  getMetrics(): VoicePipelineMetrics {
    return this.voiceSession.getMetrics()
  }

  /**
   * Get current latency metrics
   */
  getLatency(): VoiceLatencyMetrics {
    return this.voiceSession.getMetrics().latency
  }

  // ---------------------------------------------------------------------------
  // Event Triggers (called by WebRTC event handlers)
  // ---------------------------------------------------------------------------

  protected triggerUserSpeech(transcript: string): void {
    this.userSpeechCb?.(transcript)
    this.voiceSession.triggerUserSpeechEnded(transcript)
  }

  protected triggerAgentSpeech(audio: ArrayBuffer): void {
    this.agentSpeechCb?.(audio)
  }

  protected triggerAgentText(text: string): void {
    this.agentTextCb?.(text)
    this.voiceSession.triggerAgentSpeechEnded(text)
  }

  protected triggerInterruption(): void {
    this.voiceSession.triggerInterruption()
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  interrupt(): void {
    logger.info('Interrupting agent...')
    this.triggerInterruption()
    // TODO: Send interrupt signal via data channel
  }

  sendText(text: string): void {
    logger.info('Sending text to agent:', text)
    // TODO: Implement text sending via data channel
  }

  dispose(): void {
    this.disconnect()
  }

  // ---------------------------------------------------------------------------
  // Token Management
  // ---------------------------------------------------------------------------

  private async fetchToken(): Promise<string> {
    if (!this.config.tokenEndpoint) {
      throw new Error('No token endpoint configured')
    }

    const response = await fetch(this.config.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey ? { 'Authorization': `Bearer ${this.config.apiKey}` } : {}),
      },
      body: JSON.stringify({
        roomName: this.config.roomName,
        // Include voice config for backend to configure agent
        voiceConfig: this.voiceSession.toLiveKitConfig(),
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch token: ${response.statusText}`)
    }

    const data = await response.json()
    return data.token
  }

  /**
   * Generate a LiveKit token locally using API key and secret.
   * ⚠️ WARNING: This is for LOCAL DEVELOPMENT ONLY!
   * Never expose your API secret in production client code.
   */
  private async generateLocalToken(): Promise<string> {
    const apiKey = this.config.apiKey
    const apiSecret = this.config.apiSecret
    const roomName = this.config.roomName || 'kwami-dev-room'
    const identity = `kwami-user-${Date.now()}`

    if (!apiKey || !apiSecret) {
      throw new Error('API key and secret required for local token generation')
    }

    // Create JWT header and payload for LiveKit
    const header = {
      alg: 'HS256',
      typ: 'JWT',
    }

    const now = Math.floor(Date.now() / 1000)
    const payload = {
      iss: apiKey,
      sub: identity,
      iat: now,
      exp: now + 86400, // 24 hours
      nbf: now,
      jti: identity,
      video: {
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      },
    }

    // Encode header and payload
    const encodedHeader = this.base64UrlEncode(JSON.stringify(header))
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload))
    const message = `${encodedHeader}.${encodedPayload}`

    // Sign with HMAC-SHA256
    const encoder = new TextEncoder()
    const keyData = encoder.encode(apiSecret)
    const messageData = encoder.encode(message)

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
    const encodedSignature = this.base64UrlEncode(
      String.fromCharCode(...new Uint8Array(signature))
    )

    return `${message}.${encodedSignature}`
  }

  private base64UrlEncode(str: string): string {
    return btoa(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  }
}
