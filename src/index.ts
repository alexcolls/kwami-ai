// =============================================================================
// KWAMI - 3D AI Companion Library
// =============================================================================

// Main class
export { Kwami } from './Kwami'

// Modules
export { Avatar, Scene, Blob, BlobPosition, KwamiAudio, createSkin, defaultBlobConfig } from './avatar'
export { Agent } from './agent'
export { Persona } from './persona'
export { Memory } from './memory'
export { ToolRegistry } from './tools'
export { SkillManager } from './skills'

// Adapters
export { LiveKitAdapter } from './agent'
export { ZepAdapter } from './memory'

// Types
export type {
  // Core
  KwamiConfig,
  KwamiState,
  KwamiCallbacks,
  KwamiEvent,
  
  // Avatar
  AvatarConfig,
  AvatarRenderer,
  AvatarRendererType,
  BlobConfig,
  BlobSkinSelection,
  BlobSkin,
  TricolorSubtype,
  SceneConfig,
  SceneBackgroundConfig,
  CameraConfig,
  AudioConfig,
  
  // Agent
  AgentConfig,
  AgentPipeline,
  PipelineConnectOptions,
  PipelineConfig,
  LiveKitConfig,
  VoiceConfig,
  ToolDefinition,
  
  // Persona
  PersonaConfig,
  EmotionalTraits,
  
  // Memory
  MemoryConfig,
  MemoryAdapter,
  MemoryContext,
  MemorySearchResult,
  ZepConfig,
  
  // Tools
  ToolsConfig,
  MCPConfig,
  
  // Skills
  SkillsConfig,
  SkillDefinition,
  SkillContext,
  SkillResult,
} from './types'

// Re-export blob-specific types
export type {
  BlobOptions,
  BlobOptionsConfig,
  TricolorSkinConfig,
  BlobAudioEffects,
} from './avatar/renderers/blob/types'
