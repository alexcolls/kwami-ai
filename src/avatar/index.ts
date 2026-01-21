export { Avatar } from './Avatar'
export { Scene } from './scene'
export { KwamiAudio } from './audio'
export { Blob, BlobPosition, defaultBlobConfig, createSkin } from './renderers/blob'
export { Crystal, defaultCrystalConfig } from './renderers/crystal'
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

// Re-export crystal types for convenience
export type {
  CrystalFormation,
  CoreStyle,
  CrystalFormationSelection,
  ShardConfig,
  CoreConfig,
  CrystalAudioEffects,
  CrystalConfig,
  CrystalOptions,
  FormationConfig,
} from './renderers/crystal/types'
