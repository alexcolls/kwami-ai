import type { Scene, PerspectiveCamera, WebGLRenderer } from 'three'
import type { KwamiAudio } from '../../audio/KwamiAudio'

// =============================================================================
// CRYSTAL TYPES
// =============================================================================

/**
 * Crystal formation patterns - different visual styles
 */
export type CrystalFormation = 'constellation' | 'helix' | 'vortex'

/**
 * Core glow styles for the inner energy
 */
export type CoreStyle = 'plasma' | 'nebula' | 'pulse'

/**
 * Crystal formation selection
 */
export interface CrystalFormationSelection {
  formation: CrystalFormation
  coreStyle?: CoreStyle
}

/**
 * Individual shard configuration
 */
export interface ShardConfig {
  /** Number of floating shards */
  count: number
  /** Size variance (min, max) */
  sizeRange: [number, number]
  /** Orbital radius range (min, max) */
  orbitRadius: [number, number]
  /** Rotation speed multiplier */
  rotationSpeed: number
  /** Opacity range (min, max) */
  opacityRange: [number, number]
}

/**
 * Core energy configuration
 */
export interface CoreConfig {
  /** Core size */
  size: number
  /** Glow intensity */
  glowIntensity: number
  /** Pulse speed */
  pulseSpeed: number
  /** Inner color */
  innerColor: string
  /** Outer glow color */
  outerColor: string
}

/**
 * Crystal audio effects configuration
 */
export interface CrystalAudioEffects {
  /** How much bass affects shard orbits */
  bassOrbitBoost: number
  /** How much mids affect shard rotation */
  midRotationBoost: number
  /** How much highs affect core glow */
  highGlowBoost: number
  /** Overall reactivity multiplier */
  reactivity: number
  /** Smoothing factor for transitions */
  smoothing: number
  /** Enable/disable audio reactivity */
  enabled: boolean
}

/**
 * Crystal configuration options
 */
export interface CrystalConfig {
  formation?: CrystalFormationSelection
  shards?: Partial<ShardConfig>
  core?: Partial<CoreConfig>
  colors?: {
    primary: string
    secondary: string
    accent: string
  }
  audioEffects?: Partial<CrystalAudioEffects>
  /** Ambient particle count */
  particleCount?: number
  /** Overall scale */
  scale?: number
  /** Rotation speed */
  rotation?: { x: number; y: number; z: number }
}

/**
 * Crystal constructor options
 */
export interface CrystalOptions {
  scene: Scene
  camera: PerspectiveCamera
  renderer: WebGLRenderer
  audio: KwamiAudio

  formation?: CrystalFormationSelection
  shards?: Partial<ShardConfig>
  core?: Partial<CoreConfig>
  colors?: {
    primary: string
    secondary: string
    accent: string
  }
  audioEffects?: Partial<CrystalAudioEffects>
  particleCount?: number
  scale?: number
  rotation?: { x: number; y: number; z: number }
  onAfterRender?: () => void
}

/**
 * Crystal options configuration (defaults)
 */
export interface CrystalOptionsConfig {
  shards: ShardConfig
  core: CoreConfig
  audioEffects: CrystalAudioEffects
  formations: {
    constellation: FormationConfig
    helix: FormationConfig
    vortex: FormationConfig
  }
  scale: {
    min: number
    max: number
    default: number
  }
}

/**
 * Formation-specific configuration
 */
export interface FormationConfig {
  orbitPattern: 'random' | 'spiral' | 'rings'
  shardShape: 'prism' | 'octahedron' | 'tetrahedron'
  coreVisible: boolean
  particleDensity: number
  colors: {
    primary: string
    secondary: string
    accent: string
  }
}
