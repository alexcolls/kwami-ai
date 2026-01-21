import type { AvatarConfig, KwamiState } from '../types'
import type { BlobSkinSelection } from './renderers/blob/types'
import { Scene } from './scene'
import { Blob } from './renderers/blob'
import { KwamiAudio } from './audio'
import { logger } from '../utils/logger'

/**
 * Avatar - Manages the visual representation of Kwami
 * 
 * Supports different renderers (blob, future: humanoid, etc.)
 * The blob is the default and only current renderer.
 */
export class Avatar {
  private canvas: HTMLCanvasElement
  private config: AvatarConfig
  private scene: Scene
  private blob: Blob | null = null
  private audio: KwamiAudio
  private currentState: KwamiState = 'idle'
  private resizeObserver: ResizeObserver | null = null

  constructor(canvas: HTMLCanvasElement, config?: AvatarConfig) {
    this.canvas = canvas
    this.config = config ?? {}
    
    // Initialize audio
    this.audio = new KwamiAudio(config?.audio?.files ?? [])
    
    // Initialize scene
    this.scene = new Scene(canvas, config?.scene)
    
    // Initialize renderer
    this.initRenderer()
    
    // Setup resize handling
    this.setupResizeHandling()
  }

  private initRenderer(): void {
    const rendererType = this.config.renderer ?? 'blob'
    
    if (rendererType === 'blob') {
      this.initBlobRenderer()
    } else {
      // Future: Support other renderer types
      logger.warn(`Renderer type "${rendererType}" not supported, falling back to blob`)
      this.initBlobRenderer()
    }
  }

  private initBlobRenderer(): void {
    const blobConfig = this.config.blob ?? {}
    
    this.blob = new Blob({
      scene: this.scene.scene,
      camera: this.scene.camera,
      renderer: this.scene.renderer,
      audio: this.audio,
      skin: blobConfig.skin,
      resolution: blobConfig.resolution,
      spikes: blobConfig.spikes,
      time: blobConfig.time,
      rotation: blobConfig.rotation,
      colors: blobConfig.colors,
      shininess: blobConfig.shininess,
      wireframe: blobConfig.wireframe,
    })

    // Add blob mesh to scene
    this.scene.scene.add(this.blob.getMesh())

    // Apply initial position if provided
    if (blobConfig.position) {
      this.blob.position.set(blobConfig.position.x, blobConfig.position.y)
    }

    // Enable click interaction by default
    this.blob.enableClickInteraction()
  }

  private setupResizeHandling(): void {
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          this.scene.resize(width, height)
          this.blob?.position.refresh()
        }
      }
    })
    
    this.resizeObserver.observe(this.canvas)
  }

  /**
   * Set the avatar state (affects visual appearance)
   */
  setState(state: KwamiState): void {
    if (this.currentState === state) return
    
    const previousState = this.currentState
    this.currentState = state
    
    if (this.blob) {
      switch (state) {
        case 'idle':
          if (previousState === 'listening') this.blob.stopListening()
          if (previousState === 'thinking') this.blob.stopThinking()
          break
        case 'listening':
          this.blob.startListening()
          break
        case 'thinking':
          this.blob.startThinking()
          break
        case 'speaking':
          // Speaking state is driven by audio automatically
          break
      }
    }
    
    logger.debug(`Avatar state changed: ${previousState} → ${state}`)
  }

  /**
   * Get the current state
   */
  getState(): KwamiState {
    return this.currentState
  }

  // ===========================================================================
  // BLOB-SPECIFIC METHODS (delegated to blob renderer)
  // ===========================================================================

  /**
   * Get the blob instance (for direct control)
   */
  getBlob(): Blob | null {
    return this.blob
  }

  /**
   * Get the audio instance
   */
  getAudio(): KwamiAudio {
    return this.audio
  }

  /**
   * Get the scene instance
   */
  getScene(): Scene {
    return this.scene
  }

  /**
   * Set blob colors
   */
  setColors(x: string, y: string, z: string): void {
    this.blob?.setColors(x, y, z)
  }

  /**
   * Set blob skin
   */
  setSkin(selection: BlobSkinSelection): void {
    this.blob?.setSkin(selection)
  }

  /**
   * Set blob scale
   */
  setScale(scale: number): void {
    this.blob?.setScale(scale)
  }

  /**
   * Set blob spikes (noise frequency)
   */
  setSpikes(x: number, y: number, z: number): void {
    this.blob?.setSpikes(x, y, z)
  }

  /**
   * Set blob position (normalized 0-1)
   */
  setPosition(x: number, y: number): void {
    this.blob?.position.set(x, y)
  }

  /**
   * Set blob rotation speed
   */
  setRotation(x: number, y: number, z: number): void {
    this.blob?.setRotation(x, y, z)
  }

  /**
   * Set blob shininess
   */
  setShininess(value: number): void {
    this.blob?.setShininess(value)
  }

  /**
   * Set blob wireframe mode
   */
  setWireframe(enabled: boolean): void {
    this.blob?.setWireframe(enabled)
  }

  /**
   * Set blob opacity
   */
  setOpacity(value: number): void {
    this.blob?.setOpacity(value)
  }

  /**
   * Randomize blob appearance
   */
  randomize(): void {
    this.blob?.setRandomBlob()
  }

  /**
   * Set callback for conversation toggle (double-click)
   */
  onConversationToggle(callback: () => Promise<void>): void {
    if (this.blob) {
      this.blob.onConversationToggle = callback
    }
  }

  /**
   * Set callback for double-click
   */
  onDoubleClick(callback: () => void | Promise<void>): void {
    if (this.blob) {
      this.blob.onDoubleClick = callback
    }
  }

  /**
   * Connect a media stream for audio visualization
   */
  async connectMediaStream(stream: MediaStream): Promise<void> {
    await this.audio.connectMediaStream(stream)
  }

  /**
   * Disconnect the current media stream
   */
  disconnectMediaStream(): void {
    this.audio.disconnectMediaStream()
  }

  /**
   * Export blob as GLTF file
   */
  exportGLTF(): void {
    this.blob?.exportGLTF()
  }

  /**
   * Cleanup and dispose all resources
   */
  dispose(): void {
    this.resizeObserver?.disconnect()
    this.blob?.dispose()
    this.audio.dispose()
    this.scene.dispose()
  }
}
