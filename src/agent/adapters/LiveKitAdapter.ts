import type {
  TrackPublication,
  RemoteTrack,
  RemoteParticipant,
  LocalParticipant,
  DataPacket_Kind,
  LocalAudioTrack} from 'livekit-client';
import {
  Room,
  RoomEvent,
  Track,
  ConnectionState,
  createLocalTracks
} from 'livekit-client'
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
    // Need either a token or token endpoint
    return !!(this.config.token || this.config.tokenEndpoint)
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
 * Data message types from the backend agent
 */
interface AgentDataMessage {
  type: 'transcript' | 'agent_text' | 'state' | 'error' | 'metrics'
  transcript?: string
  text?: string
  isFinal?: boolean
  state?: 'listening' | 'thinking' | 'speaking'
  error?: string
  metrics?: VoiceLatencyMetrics
}

/**
 * LiveKit Pipeline Implementation
 * 
 * Handles the actual WebRTC connection to LiveKit and voice pipeline management.
 */
class LiveKitPipeline implements AgentPipeline {
  private config: LiveKitAdapterConfig
  private voiceSession: VoiceSession
  private room: Room | null = null
  private localAudioTrack: LocalAudioTrack | null = null
  private agentAudioStream: MediaStream | null = null
  
  // Timestamps for latency tracking
  private sttStartTime = 0
  private llmStartTime = 0
  private ttsStartTime = 0
  private turnStartTime = 0
  
  // Callbacks
  private userSpeechCb?: (transcript: string) => void
  private agentTextCb?: (text: string) => void
  private interimTranscriptCb?: (text: string) => void
  private onAgentAudioStreamCb?: (stream: MediaStream) => void

  constructor(config: LiveKitAdapterConfig, voiceSession: VoiceSession) {
    this.config = config
    this.voiceSession = voiceSession
  }

  async connect(options: PipelineConnectOptions): Promise<void> {
    logger.info('LiveKit pipeline connecting...')
    
    // Get token
    let token = this.config.token
    
    if (!token && this.config.tokenEndpoint) {
      token = await this.fetchToken()
    }
    
    if (!token) {
      throw new Error('No LiveKit token available. Provide token or tokenEndpoint.')
    }
    
    const serverUrl = this.config.url
    if (!serverUrl) {
      throw new Error('No LiveKit server URL configured.')
    }

    // Start voice session metrics
    this.voiceSession.startMetrics()
    this.voiceSession.setState('initializing')

    // Create Room instance
    this.room = new Room({
      adaptiveStream: this.config.adaptiveStream ?? true,
      dynacast: this.config.dynacast ?? true,
      audioCaptureDefaults: {
        echoCancellation: this.config.echoCancellation ?? true,
        noiseSuppression: this.config.noiseSuppression ?? true,
        autoGainControl: this.config.autoGainControl ?? true,
      },
    })

    // Set up event listeners
    this.setupRoomEvents()

    try {
      // Connect to the room
      await this.room.connect(serverUrl, token, {
        autoSubscribe: this.config.autoSubscribe ?? true,
      })
      
      logger.info(`Connected to LiveKit room: ${this.room.name}`)

      // Publish local audio track (microphone)
      if (this.config.audioInputEnabled !== false) {
        await this.publishMicrophone()
      }

      // Send voice config to backend agent via data channel
      await this.sendVoiceConfig(options)

      this.voiceSession.setState('listening')
      logger.info('LiveKit pipeline connected')
    } catch (error) {
      logger.error('Failed to connect to LiveKit:', error)
      this.voiceSession.setState('idle')
      throw error
    }
  }

  /**
   * Set up room event listeners
   */
  private setupRoomEvents(): void {
    if (!this.room) return

    // Connection state changes
    this.room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
      logger.debug('Connection state changed:', state)
      
      if (state === ConnectionState.Disconnected) {
        this.voiceSession.setState('idle')
      }
    })

    // Track subscribed - agent audio comes through here
    this.room.on(RoomEvent.TrackSubscribed, (
      track: RemoteTrack,
      _publication: TrackPublication,
      participant: RemoteParticipant
    ) => {
      logger.debug(`Track subscribed: ${track.kind} from ${participant.identity}`)
      
      if (track.kind === Track.Kind.Audio) {
        // Only play audio from the agent participant, not other users
        // Agent identity typically starts with 'agent' or contains it
        const isAgent = participant.identity.toLowerCase().includes('agent') ||
                        participant.identity.toLowerCase().startsWith('kwami')
        
        if (!isAgent) {
          logger.debug(`Skipping audio from non-agent participant: ${participant.identity}`)
          return
        }
        
        // This is the agent's audio response
        // Attach to an audio element to play it
        const audioElement = track.attach()
        audioElement.id = 'kwami-agent-audio'
        
        document.body.appendChild(audioElement)
        
        // Connect agent audio to the avatar's audio analyzer for visualization
        this.connectAgentAudioToAvatar(track)
        
        // Update state to speaking when agent audio plays
        audioElement.onplay = () => {
          this.voiceSession.setState('speaking')
        }
        audioElement.onended = () => {
          this.voiceSession.setState('listening')
        }
        audioElement.onpause = () => {
          // Only switch to listening if fully stopped, not just buffering
          if (audioElement.ended || audioElement.currentTime === 0) {
            this.voiceSession.setState('listening')
          }
        }
      }
    })

    // Track unsubscribed
    this.room.on(RoomEvent.TrackUnsubscribed, (
      track: RemoteTrack,
      _publication: TrackPublication,
      participant: RemoteParticipant
    ) => {
      logger.debug(`Track unsubscribed: ${track.kind} from ${participant.identity}`)
      track.detach()
    })

    // Data received - transcripts and agent messages come through here
    this.room.on(RoomEvent.DataReceived, (
      payload: Uint8Array,
      _participant?: RemoteParticipant,
      _kind?: DataPacket_Kind
    ) => {
      try {
        const decoder = new TextDecoder()
        const jsonStr = decoder.decode(payload)
        const data: AgentDataMessage = JSON.parse(jsonStr)
        
        this.handleAgentData(data)
      } catch (error) {
        logger.error('Failed to parse data message:', error)
      }
    })

    // Participant connected (agent joins)
    this.room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      logger.info(`Participant connected: ${participant.identity}`)
    })

    // Participant disconnected
    this.room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      logger.info(`Participant disconnected: ${participant.identity}`)
    })

    // Local track published
    this.room.on(RoomEvent.LocalTrackPublished, (publication, _participant: LocalParticipant) => {
      logger.debug(`Local track published: ${publication.kind}`)
    })

    // Audio playback status changed
    this.room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
      if (!this.room?.canPlaybackAudio) {
        logger.warn('Audio playback blocked. User interaction required.')
        // You may want to show a UI prompt to the user
      }
    })

    // Disconnected
    this.room.on(RoomEvent.Disconnected, (reason) => {
      logger.info('Disconnected from room:', reason)
      this.voiceSession.setState('idle')
    })

    // Reconnecting
    this.room.on(RoomEvent.Reconnecting, () => {
      logger.info('Reconnecting to room...')
    })

    // Reconnected
    this.room.on(RoomEvent.Reconnected, () => {
      logger.info('Reconnected to room')
    })
  }

  /**
   * Connect agent audio track to avatar for visualization
   * Creates a MediaStream from the track that can be analyzed
   */
  private connectAgentAudioToAvatar(track: RemoteTrack): void {
    try {
      // Get the MediaStreamTrack from the LiveKit track
      const mediaStreamTrack = track.mediaStreamTrack
      if (mediaStreamTrack) {
        // Create a MediaStream containing the agent's audio
        this.agentAudioStream = new MediaStream([mediaStreamTrack])
        
        // Notify any listeners that agent audio is available
        this.onAgentAudioStreamCb?.(this.agentAudioStream)
        
        logger.debug('Connected agent audio to avatar visualization')
      }
    } catch (error) {
      logger.warn('Failed to connect agent audio to avatar:', error)
    }
  }

  /**
   * Handle data messages from the backend agent
   */
  private handleAgentData(data: AgentDataMessage): void {
    switch (data.type) {
      case 'transcript':
        // User speech transcript from STT
        if (data.isFinal && data.transcript) {
          this.endSTTTracking()
          this.userSpeechCb?.(data.transcript)
          this.voiceSession.triggerUserSpeechEnded(data.transcript)
          this.voiceSession.setState('thinking')
        } else if (data.transcript) {
          // Interim transcript
          this.interimTranscriptCb?.(data.transcript)
          this.voiceSession.triggerTranscript(data.transcript, false)
        }
        break

      case 'agent_text':
        // Agent's text response (for display)
        if (data.text) {
          this.agentTextCb?.(data.text)
          this.voiceSession.triggerAgentSpeechEnded(data.text)
        }
        break

      case 'state':
        // Agent state change
        if (data.state) {
          this.voiceSession.setState(data.state)
        }
        break

      case 'metrics':
        // Latency metrics from backend
        if (data.metrics) {
          this.voiceSession.updateLatency(data.metrics)
        }
        break

      case 'error':
        // Error from agent
        logger.error('Agent error:', data.error)
        break
    }
  }

  /**
   * Publish microphone audio track
   */
  private async publishMicrophone(): Promise<void> {
    if (!this.room) return

    try {
      const tracks = await createLocalTracks({
        audio: {
          echoCancellation: this.config.echoCancellation ?? true,
          noiseSuppression: this.config.noiseSuppression ?? true,
          autoGainControl: this.config.autoGainControl ?? true,
        },
        video: false,
      })

      const audioTrack = tracks.find(t => t.kind === Track.Kind.Audio) as LocalAudioTrack
      if (audioTrack) {
        this.localAudioTrack = audioTrack
        await this.room.localParticipant.publishTrack(audioTrack)
        logger.info('Microphone published')
      }
    } catch (error) {
      logger.error('Failed to publish microphone:', error)
      throw error
    }
  }

  /**
   * Send full Kwami config to backend agent for initial setup
   * This includes persona, voice pipeline, tools, and unique identifiers
   */
  private async sendVoiceConfig(options: PipelineConnectOptions): Promise<void> {
    if (!this.room) return

    // Build the full configuration message for agent dispatch
    const configMessage = {
      type: 'config',
      // Unique identifiers for this Kwami instance
      kwamiId: options.kwamiId,
      kwamiName: options.kwamiName,
      // Voice pipeline configuration (STT, LLM, TTS, etc.)
      voice: options.voice ?? this.voiceSession.toLiveKitConfig(),
      // Persona configuration (personality, system prompt, traits)
      persona: options.persona,
      // Tool definitions
      tools: options.tools,
      // Timestamp for debugging
      timestamp: Date.now(),
    }

    const encoder = new TextEncoder()
    const data = encoder.encode(JSON.stringify(configMessage))
    
    await this.room.localParticipant.publishData(data, {
      reliable: true,
    })
    
    logger.debug('Sent Kwami config to agent:', {
      kwamiId: options.kwamiId,
      kwamiName: options.kwamiName,
    })
  }

  async disconnect(): Promise<void> {
    logger.info('LiveKit pipeline disconnecting...')
    
    // Stop local audio track
    if (this.localAudioTrack) {
      this.localAudioTrack.stop()
      this.localAudioTrack = null
    }

    // Clean up agent audio stream
    if (this.agentAudioStream) {
      this.agentAudioStream.getTracks().forEach(track => track.stop())
      this.agentAudioStream = null
    }

    // Remove agent audio element from DOM
    const audioEl = document.getElementById('kwami-agent-audio')
    if (audioEl) {
      audioEl.remove()
    }

    // Disconnect from room
    if (this.room) {
      await this.room.disconnect()
      this.room = null
    }

    this.voiceSession.setState('idle')
  }

  isConnected(): boolean {
    return this.room?.state === ConnectionState.Connected
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

  onAgentSpeech(_callback: (audio: ArrayBuffer) => void): void {
    // Reserved for raw audio streaming - not yet implemented
    // Audio is currently handled via Track subscription
  }

  onAgentText(callback: (text: string) => void): void {
    this.agentTextCb = callback
    this.voiceSession.on({
      onAgentSpeechEnded: callback,
    })
  }

  onInterimTranscript(callback: (text: string) => void): void {
    this.interimTranscriptCb = callback
    this.voiceSession.on({
      onTranscript: (text, isFinal) => {
        if (!isFinal) callback(text)
      },
    })
  }

  /**
   * Register callback for when agent audio stream becomes available
   * This allows connecting the audio to avatar visualization
   */
  onAgentAudioStream(callback: (stream: MediaStream) => void): void {
    this.onAgentAudioStreamCb = callback
    // If stream already exists, call immediately
    if (this.agentAudioStream) {
      callback(this.agentAudioStream)
    }
  }

  /**
   * Get the current agent audio stream if available
   */
  getAgentAudioStream(): MediaStream | null {
    return this.agentAudioStream
  }

  // ---------------------------------------------------------------------------
  // Latency Tracking
  // ---------------------------------------------------------------------------

  startSTTTracking(): void {
    this.sttStartTime = Date.now()
  }

  endSTTTracking(): void {
    if (this.sttStartTime > 0) {
      const sttLatency = Date.now() - this.sttStartTime
      this.voiceSession.updateLatency({ stt: sttLatency })
      this.sttStartTime = 0
    }
  }

  startTurnTracking(): void {
    this.turnStartTime = Date.now()
  }

  endTurnTracking(): void {
    if (this.turnStartTime > 0) {
      const turnLatency = Date.now() - this.turnStartTime
      this.voiceSession.updateLatency({ endOfTurn: turnLatency })
      this.turnStartTime = 0
    }
  }

  startLLMTracking(): void {
    this.llmStartTime = Date.now()
  }

  endLLMTracking(): void {
    if (this.llmStartTime > 0) {
      const llmLatency = Date.now() - this.llmStartTime
      this.voiceSession.updateLatency({ llm: llmLatency })
      this.llmStartTime = 0
    }
  }

  startTTSTracking(): void {
    this.ttsStartTime = Date.now()
  }

  endTTSTracking(): void {
    if (this.ttsStartTime > 0) {
      const ttsLatency = Date.now() - this.ttsStartTime
      this.voiceSession.updateLatency({ tts: ttsLatency })
      this.ttsStartTime = 0
    }
  }

  recordOverallLatency(overallMs: number): void {
    this.voiceSession.updateLatency({ overall: overallMs })
  }

  getMetrics(): VoicePipelineMetrics {
    return this.voiceSession.getMetrics()
  }

  getLatency(): VoiceLatencyMetrics {
    return this.voiceSession.getMetrics().latency
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  /**
   * Send a configuration update to the backend agent in real-time
   * Allows changing persona, voice settings, or tools without reconnecting
   */
  sendConfigUpdate(type: string, config: unknown): void {
    if (!this.room) {
      logger.warn('Cannot send config update: not connected')
      return
    }

    const message = {
      type: 'config_update',
      updateType: type,  // 'voice' | 'persona' | 'tools' | 'full'
      config,
      timestamp: Date.now(),
    }

    const encoder = new TextEncoder()
    const data = encoder.encode(JSON.stringify(message))
    
    this.room.localParticipant.publishData(data, { reliable: true })
    logger.debug(`Sent ${type} config update to agent`)
  }

  interrupt(): void {
    logger.info('Interrupting agent...')
    this.voiceSession.triggerInterruption()
    
    // Send interrupt signal via data channel
    if (this.room) {
      const encoder = new TextEncoder()
      const data = encoder.encode(JSON.stringify({ type: 'interrupt' }))
      this.room.localParticipant.publishData(data, { reliable: true })
    }
  }

  sendText(text: string): void {
    logger.info('Sending text to agent:', text)
    
    // Send text via data channel
    if (this.room) {
      const encoder = new TextEncoder()
      const data = encoder.encode(JSON.stringify({ type: 'text', text }))
      this.room.localParticipant.publishData(data, { reliable: true })
      
      // Also trigger as user speech
      this.userSpeechCb?.(text)
    }
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

    const roomName = this.config.roomName || `kwami-room-${Date.now()}`
    const participantName = `kwami-user-${Date.now()}`

    const response = await fetch(this.config.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        room_name: roomName,
        participant_name: participantName,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch token: ${response.statusText}`)
    }

    const data = await response.json()
    
    // Update room name from response if provided
    if (data.room_name) {
      this.config.roomName = data.room_name
    }
    
    return data.token
  }

}
