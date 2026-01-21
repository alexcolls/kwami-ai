import type { Scene, PerspectiveCamera, WebGLRenderer } from 'three'
import type { KwamiAudio } from '../../audio/KwamiAudio'

// =============================================================================
// BLOB TYPES
// =============================================================================

/**
 * Blob skin system
 * The only skin is Tricolor, with 3 subtypes.
 */
export type BlobSkin = 'tricolor'
export type TricolorSubtype = 'poles' | 'donut' | 'vintage'

/**
 * Skin selection (extensible discriminated union).
 */
export type BlobSkinSelection = {
  skin: 'tricolor'
  subtype?: TricolorSubtype
}

/**
 * Tricolor skin configuration
 */
export interface TricolorSkinConfig {
  wireframe: boolean
  lightPosition: { x: number; y: number; z: number }
  shininess: number
  color1: string
  color2: string
  color3: string
  opacity: number
}

/**
 * Blob configuration options
 */
export interface BlobConfig {
  skin?: BlobSkinSelection
  resolution?: number
  spikes?: { x: number; y: number; z: number }
  time?: { x: number; y: number; z: number }
  rotation?: { x: number; y: number; z: number }
  colors?: { x: string; y: string; z: string }
  shininess?: number
  wireframe?: boolean
  position?: { x: number; y: number } // Normalized position (0-1)
}

/**
 * Blob constructor options
 */
export interface BlobOptions {
  scene: Scene
  camera: PerspectiveCamera
  renderer: WebGLRenderer
  audio: KwamiAudio

  skin?: BlobSkinSelection
  resolution?: number
  spikes?: { x: number; y: number; z: number }
  time?: { x: number; y: number; z: number }
  rotation?: { x: number; y: number; z: number }
  colors?: { x: string; y: string; z: string }
  shininess?: number
  wireframe?: boolean
  onAfterRender?: () => void
}

/**
 * Blob options configuration (defaults)
 */
export interface BlobOptionsConfig {
  spikes: {
    min: number
    max: number
    step: number
    digits: number
    rMin: number
    rMax: number
    default: number
  }
  speed: {
    min: number
    max: number
    default: number
  }
  processing: {
    min: number
    max: number
    default: number
  }
  resolution: {
    min: number
    max: number
    default: number
    step: number
  }
  skins: {
    tricolor: {
      poles: TricolorSkinConfig
      donut: TricolorSkinConfig
      vintage: TricolorSkinConfig
    }
  }
}

/**
 * Audio effect parameters for blob animation
 */
export interface BlobAudioEffects {
  bassSpike: number
  midSpike: number
  highSpike: number
  midTime: number
  highTime: number
  ultraTime: number
  enabled: boolean
  timeEnabled: boolean
  reactivity?: number
  sensitivity?: number
  breathing?: number
  responseSpeed?: number
  transientBoost?: number
}
