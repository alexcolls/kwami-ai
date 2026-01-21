export { Crystal } from './Crystal'
export { defaultCrystalConfig } from './config'
export {
  createCoreGeometry,
  createCoreGlowGeometry,
  createPrismGeometry,
  createOctahedronShard,
  createTetrahedronShard,
  getShardGeometry,
  generateOrbitalPositions,
  createParticlePositions,
} from './geometry'
export {
  createShardMaterial,
  createCoreMaterial,
  createGlowMaterial,
  createCrystalMaterials,
} from './materials'
export {
  analyzeAudio,
  smoothAudioLevels,
  animateShards,
  animateCore,
  animateCrystal,
} from './animation'

// Re-export types
export type {
  CrystalFormation,
  CoreStyle,
  CrystalFormationSelection,
  ShardConfig,
  CoreConfig,
  CrystalAudioEffects,
  CrystalConfig,
  CrystalOptions,
  CrystalOptionsConfig,
  FormationConfig,
} from './types'

export type {
  ShardState,
  AudioLevels,
} from './animation'
