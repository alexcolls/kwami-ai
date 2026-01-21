export { Avatar } from './Avatar'
export { Scene } from './scene'
export { KwamiAudio } from './audio'
export { Blob, BlobPosition, defaultBlobConfig, createSkin } from './renderers/blob'
export * from './renderers/types'

// Re-export blob types for convenience
export type {
  BlobConfig,
  BlobOptions,
  BlobSkinSelection,
  BlobSkin,
  TricolorSubtype,
  TricolorSkinConfig,
  BlobAudioEffects,
} from './renderers/blob/types'
