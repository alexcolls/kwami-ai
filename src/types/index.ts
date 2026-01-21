// =============================================================================
// KWAMI TYPES
// =============================================================================

// -----------------------------------------------------------------------------
// Core
// -----------------------------------------------------------------------------

export type KwamiState = 'idle' | 'listening' | 'thinking' | 'speaking'

export interface KwamiConfig {
  avatar?: AvatarConfig
  agent?: AgentConfig
  persona?: PersonaConfig
  memory?: MemoryConfig
  tools?: ToolsConfig
  skills?: SkillsConfig
}

export interface KwamiCallbacks {
  onStateChange?: (state: KwamiState) => void
  onAgentResponse?: (text: string) => void
  onUserTranscript?: (text: string) => void
  onError?: (error: Error) => void
}

// -----------------------------------------------------------------------------
// Avatar
// -----------------------------------------------------------------------------

export type AvatarRendererType = 'blob' | 'humanoid' // Extensible for future

export interface AvatarConfig {
  renderer?: AvatarRendererType
  blob?: BlobConfig
  scene?: SceneConfig
  audio?: {
    files?: string[]
    preload?: 'auto' | 'metadata' | 'none'
    autoInitialize?: boolean
    volume?: number
  }
}

export interface AudioConfig {
  preload?: 'auto' | 'metadata' | 'none'
  autoInitialize?: boolean
  volume?: number
}

export interface AvatarRenderer {
  setState(state: KwamiState): void
  dispose(): void
}

// -----------------------------------------------------------------------------
// Blob Config (moved from blob/types.ts for top-level export)
// -----------------------------------------------------------------------------

export type BlobSkin = 'tricolor'
export type TricolorSubtype = 'poles' | 'donut' | 'vintage'

export type BlobSkinSelection = {
  skin: 'tricolor'
  subtype?: TricolorSubtype
}

export interface BlobConfig {
  skin?: BlobSkinSelection
  resolution?: number
  spikes?: { x: number; y: number; z: number }
  time?: { x: number; y: number; z: number }
  rotation?: { x: number; y: number; z: number }
  colors?: { x: string; y: string; z: string }
  shininess?: number
  wireframe?: boolean
  position?: { x: number; y: number }
}

// -----------------------------------------------------------------------------
// Scene
// -----------------------------------------------------------------------------

export type BackgroundMediaFit = 'cover' | 'contain' | 'stretch'

export interface SceneBackgroundConfig {
  type?: 'transparent' | 'solid' | 'gradient' | 'image' | 'video'
  color?: string
  opacity?: number
  gradient?: {
    colors: string[]
    direction?: 'vertical' | 'horizontal' | 'radial' | 'diagonal'
    opacity?: number
    angle?: number
    stops?: number[]
  }
  image?: {
    url: string
    fit?: BackgroundMediaFit
    opacity?: number
  }
  video?: {
    url: string
    fit?: BackgroundMediaFit
    opacity?: number
    autoplay?: boolean
    loop?: boolean
    muted?: boolean
    playbackRate?: number
  }
}

export interface SceneConfig {
  fov?: number
  near?: number
  far?: number
  cameraPosition?: { x: number; y: number; z: number }
  lightIntensity?: {
    top?: number
    bottom?: number
    ambient?: number
  }
  enableShadows?: boolean
  enableControls?: boolean
  preserveDrawingBuffer?: boolean
  background?: SceneBackgroundConfig
}

export interface CameraConfig {
  fov?: number
  near?: number
  far?: number
  position?: { x: number; y: number; z: number }
}

// -----------------------------------------------------------------------------
// Agent
// -----------------------------------------------------------------------------

export interface AgentConfig {
  adapter?: 'livekit' | 'custom'
  livekit?: LiveKitConfig
  pipeline?: PipelineConfig
}

export interface LiveKitConfig {
  url?: string
  token?: string
  tokenEndpoint?: string
  roomName?: string
  /** API Key for local token generation (dev only) */
  apiKey?: string
  /** API Secret for local token generation (dev only - NEVER expose in production) */
  apiSecret?: string
}

export interface PipelineConfig {
  type?: 'voice' | 'realtime' | 'multimodal'
}

export interface AgentPipeline {
  connect(options: PipelineConnectOptions): Promise<void>
  disconnect(): Promise<void>
  isConnected(): boolean
  sendText(text: string): void
  interrupt(): void
  onUserSpeech(callback: (transcript: string) => void): void
  onAgentText(callback: (text: string) => void): void
  onAgentSpeech(callback: (audio: ArrayBuffer) => void): void
  dispose(): void
}

export interface PipelineConnectOptions {
  roomName?: string
  token?: string
  persona?: {
    name?: string
    systemPrompt?: string
  }
  memory?: MemoryContext
  tools?: ToolDefinition[]
}

export interface VoiceConfig {
  provider?: string
  voiceId?: string
  model?: string
}

export interface ToolDefinition {
  name: string
  description: string
  parameters?: Record<string, unknown>
  handler?: (params: Record<string, unknown>) => Promise<unknown>
}

// -----------------------------------------------------------------------------
// Persona
// -----------------------------------------------------------------------------

export interface PersonaConfig {
  name?: string
  personality?: string
  systemPrompt?: string
  traits?: string[]
  language?: string
  conversationStyle?: string
  responseLength?: 'short' | 'medium' | 'long'
  emotionalTone?: 'neutral' | 'warm' | 'enthusiastic' | 'calm'
  emotionalTraits?: EmotionalTraits
}

export interface EmotionalTraits {
  happiness?: number
  energy?: number
  confidence?: number
  calmness?: number
  optimism?: number
  socialness?: number
  creativity?: number
  patience?: number
  empathy?: number
  curiosity?: number
}

// -----------------------------------------------------------------------------
// Memory
// -----------------------------------------------------------------------------

export interface MemoryConfig {
  adapter?: 'zep' | 'local'
  zep?: ZepConfig
}

export interface ZepConfig {
  apiKey?: string
  baseUrl?: string
  collectionName?: string
}

export interface MemoryAdapter {
  initialize(userId: string): Promise<void>
  addMessage(role: 'user' | 'assistant', content: string): Promise<void>
  getContext(): Promise<MemoryContext>
  search(query: string, limit?: number): Promise<MemorySearchResult[]>
  clear(): Promise<void>
  dispose(): void
}

export interface MemoryContext {
  recentMessages?: Array<{ role: string; content: string }>
  facts?: string[]
  summary?: string
  entities?: Array<{ name: string; type: string }>
}

export interface MemorySearchResult {
  content: string
  score: number
  metadata?: Record<string, unknown>
}

// -----------------------------------------------------------------------------
// Tools
// -----------------------------------------------------------------------------

export interface ToolsConfig {
  mcp?: MCPConfig[]
  custom?: ToolDefinition[]
}

export interface MCPConfig {
  name: string
  url: string
  apiKey?: string
}

// -----------------------------------------------------------------------------
// Skills
// -----------------------------------------------------------------------------

export interface SkillsConfig {
  definitions?: SkillDefinition[]
  enabled?: string[]
}

export interface SkillDefinition {
  name: string
  description: string
  trigger?: 'voice' | 'action' | 'event'
  execute: (context: SkillContext) => Promise<SkillResult>
}

export interface SkillContext {
  kwami: unknown // Reference to Kwami instance
  params?: Record<string, unknown>
  userMessage?: string
}

export interface SkillResult {
  success: boolean
  message?: string
  data?: unknown
}

// -----------------------------------------------------------------------------
// Events
// -----------------------------------------------------------------------------

export type KwamiEvent = 
  | { type: 'stateChange'; state: KwamiState }
  | { type: 'agentResponse'; text: string }
  | { type: 'userTranscript'; text: string }
  | { type: 'error'; error: Error }
  | { type: 'connected' }
  | { type: 'disconnected' }

export type KwamiEventHandler = (event: KwamiEvent) => void
