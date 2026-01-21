// =============================================================================
// KWAMI - 3D AI Companion Library
// =============================================================================

// Main class
export { Kwami } from './Kwami'

// Modules
export { Avatar, Scene, Blob, BlobPosition, Crystal, KwamiAudio, createSkin, defaultBlobConfig, defaultCrystalConfig } from './avatar'
export { Agent } from './agent'
export { Persona } from './persona'
export { Memory } from './memory'
export { ToolRegistry } from './tools'
export { SkillManager } from './skills'

// Adapters
export { LiveKitAdapter } from './agent'
export { ZepAdapter } from './memory'

// Voice Pipeline (NEW)
export { VoiceSession } from './agent'
export type { VoiceSessionState, VoiceSessionEvents, VoiceSessionOptions } from './agent'

// Voice Types (comprehensive)
export type {
  // VAD
  VADConfig,
  VADProvider,
  // STT
  STTConfig,
  STTProvider,
  STTInferenceProvider,
  STTPluginProvider,
  STTLanguage,
  // LLM
  LLMConfig,
  LLMProvider,
  LLMInferenceProvider,
  LLMPluginProvider,
  OpenAIModel,
  GeminiModel,
  // TTS
  TTSConfig,
  TTSProvider,
  TTSInferenceProvider,
  TTSPluginProvider,
  PresetVoice,
  // Realtime
  RealtimeConfig,
  RealtimeProvider,
  RealtimeModality,
  // Enhancements
  TurnDetectionConfig,
  NoiseCancellationConfig,
  VoiceEnhancementsConfig,
  // Metrics
  VoiceLatencyMetrics,
  VoicePipelineMetrics,
  // Pipeline
  VoicePipelineConfig,
  VoicePipelinePreset,
  VoicePipelineType,
} from './agent'

// Voice Utilities
export {
  getVoicePipelinePreset,
  buildSTTDescriptor,
  buildTTSDescriptor,
  buildLLMDescriptor,
  PRESET_VOICES,
  findPresetVoice,
  filterPresetVoices,
} from './agent'

// Core Types
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
  CrystalConfig,
  CrystalFormation,
  CrystalCoreStyle,
  CrystalFormationSelection,
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

// Re-export crystal-specific types
export type {
  CrystalOptions,
  CrystalOptionsConfig,
  ShardConfig,
  CoreConfig,
  CrystalAudioEffects,
  CoreStyle,
  FormationConfig,
} from './avatar/renderers/crystal/types'

// Adapter types
export type { LiveKitAdapterConfig, AgentAdapter, AdapterFactory } from './agent'
