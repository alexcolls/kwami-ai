import type { AgentPipeline, PipelineConnectOptions } from '../../types'
import type { AgentAdapter, LiveKitAdapterConfig } from './types'
import { logger } from '../../utils/logger'

/**
 * LiveKit Adapter
 * 
 * Connects Kwami to LiveKit for real-time voice AI.
 * The actual agent runs on the backend (via kwami-api).
 */
export class LiveKitAdapter implements AgentAdapter {
  private config: LiveKitAdapterConfig

  constructor(config?: LiveKitAdapterConfig) {
    this.config = config ?? {}
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
    return new LiveKitPipeline(this.config)
  }

  dispose(): void {
    // Nothing to cleanup at adapter level
  }
}

/**
 * LiveKit Pipeline Implementation
 * 
 * Handles the actual WebRTC connection to LiveKit.
 */
class LiveKitPipeline implements AgentPipeline {
  private config: LiveKitAdapterConfig
  private connected = false
  
  // Callbacks (used when connected)
  private userSpeechCb?: (transcript: string) => void
  private agentSpeechCb?: (audio: ArrayBuffer) => void
  private agentTextCb?: (text: string) => void

  constructor(config: LiveKitAdapterConfig) {
    this.config = config
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

    // TODO: Implement actual LiveKit connection using livekit-client
    // This is a placeholder for the actual implementation
    logger.info('LiveKit pipeline connected (placeholder)')
    this.connected = true
  }

  async disconnect(): Promise<void> {
    logger.info('LiveKit pipeline disconnecting...')
    this.connected = false
  }

  isConnected(): boolean {
    return this.connected
  }

  onUserSpeech(callback: (transcript: string) => void): void {
    this.userSpeechCb = callback
  }

  onAgentSpeech(callback: (audio: ArrayBuffer) => void): void {
    this.agentSpeechCb = callback
  }

  onAgentText(callback: (text: string) => void): void {
    this.agentTextCb = callback
  }

  // Trigger callbacks (called when events occur from LiveKit)
  protected triggerUserSpeech(transcript: string): void {
    this.userSpeechCb?.(transcript)
  }

  protected triggerAgentSpeech(audio: ArrayBuffer): void {
    this.agentSpeechCb?.(audio)
  }

  protected triggerAgentText(text: string): void {
    this.agentTextCb?.(text)
  }

  interrupt(): void {
    logger.info('Interrupting agent...')
    // TODO: Implement interruption via data channel
  }

  sendText(text: string): void {
    logger.info('Sending text to agent:', text)
    // TODO: Implement text sending via data channel
  }

  dispose(): void {
    this.disconnect()
  }

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
