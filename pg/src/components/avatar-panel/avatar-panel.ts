import type { Avatar } from 'kwami-ai'
import template from './avatar-panel.html?raw'
import './avatar-panel.css'

type SkinSubtype = 'poles' | 'donut' | 'vintage'
type CrystalFormation = 'constellation' | 'helix' | 'vortex'
type RendererType = 'blob' | 'crystal'

interface BlobPanelState {
  colors: { x: string; y: string; z: string }
  spikes: { x: number; y: number; z: number }
  amplitude: { x: number; y: number; z: number }
  time: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  scale: number
  opacity: number
  shininess: number
  lightIntensity: number
  wireframe: boolean
  skin: SkinSubtype
  resolution: number
  touchStrength: number
  touchDuration: number
  maxTouchPoints: number
  transitionSpeed: number
  thinkingDuration: number
}

interface CrystalPanelState {
  formation: CrystalFormation
  colors: { primary: string; secondary: string; accent: string }
  coreColors: { inner: string; outer: string }
  glowIntensity: number
  shardCount: number
  scale: number
  rotation: { x: number; y: number; z: number }
  audioEffects: {
    reactivity: number
    bassOrbitBoost: number
    midRotationBoost: number
    highGlowBoost: number
    enabled: boolean
  }
  transitionSpeed: number
  thinkingDuration: number
}

// Callbacks for renderer switching
type SwitchRendererCallback = (type: RendererType) => void

export function createAvatarPanel(
  avatar: Avatar,
  onSwitchRenderer?: SwitchRendererCallback,
): HTMLElement {
  const currentRenderer = avatar.getRendererType()
  const blob = avatar.getBlob()
  const crystal = avatar.getCrystal()

  // Initialize blob state
  const blobState: BlobPanelState = blob ? {
    colors: blob.getColors(),
    spikes: blob.getSpikes(),
    amplitude: blob.getAmplitude(),
    time: blob.getTime(),
    rotation: blob.getRotation(),
    scale: blob.getScale(),
    opacity: blob.getOpacity(),
    shininess: blob.getShininess(),
    lightIntensity: blob.lightIntensity,
    wireframe: blob.getWireframe(),
    skin: blob.getCurrentSkinSubtype() as SkinSubtype,
    resolution: 180,
    touchStrength: blob.touchStrength,
    touchDuration: blob.touchDuration,
    maxTouchPoints: blob.maxTouchPoints,
    transitionSpeed: blob.transitionSpeed,
    thinkingDuration: blob.thinkingDuration,
  } : getDefaultBlobState()

  // Initialize crystal state
  const crystalState: CrystalPanelState = crystal ? {
    formation: crystal.getFormation().formation as CrystalFormation,
    colors: crystal.getColors(),
    coreColors: { inner: '#ffffff', outer: '#00ffff' },
    glowIntensity: 1.2,
    shardCount: 24,
    scale: crystal.getScale(),
    rotation: crystal.getRotation(),
    audioEffects: {
      reactivity: crystal.audioEffects.reactivity,
      bassOrbitBoost: crystal.audioEffects.bassOrbitBoost,
      midRotationBoost: crystal.audioEffects.midRotationBoost,
      highGlowBoost: crystal.audioEffects.highGlowBoost,
      enabled: crystal.audioEffects.enabled,
    },
    transitionSpeed: crystal.transitionSpeed,
    thinkingDuration: crystal.thinkingDuration,
  } : getDefaultCrystalState()

  const panel = document.createElement('div')
  panel.className = 'panel-inner'
  panel.innerHTML = template

  // Wire up controls
  const $ = <T extends HTMLElement>(sel: string) => panel.querySelector<T>(sel)!
  const $$ = <T extends HTMLElement>(sel: string) => panel.querySelectorAll<T>(sel)

  // Setup collapsible sections
  setupCollapsibleSections()

  // Initialize UI based on current renderer
  if (currentRenderer === 'blob') {
    showBlobControls()
    if (blob) syncBlobPanelFromState()
  } else {
    showCrystalControls()
    if (crystal) syncCrystalPanelFromState()
  }

  // Set active renderer option
  $$<HTMLInputElement>('input[name="renderer"]').forEach(input => {
    input.checked = input.value === currentRenderer
  })
  $$('.renderer-option').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.renderer === currentRenderer)
  })

  // ============================================================
  // RENDERER SWITCHING
  // ============================================================
  $$<HTMLInputElement>('input[name="renderer"]').forEach(input => {
    input.addEventListener('change', () => {
      const rendererType = input.value as RendererType
      $$('.renderer-option').forEach(opt => opt.classList.remove('active'))
      input.closest('.renderer-option')?.classList.add('active')

      if (rendererType === 'blob') {
        showBlobControls()
      } else {
        showCrystalControls()
      }

      // Call the switch callback if provided
      if (onSwitchRenderer) {
        onSwitchRenderer(rendererType)
      }
    })
  })

  function showBlobControls() {
    $('#blob-controls').style.display = 'block'
    $('#crystal-controls').style.display = 'none'
  }

  function showCrystalControls() {
    $('#blob-controls').style.display = 'none'
    $('#crystal-controls').style.display = 'block'
  }

  // ============================================================
  // BLOB CONTROLS
  // ============================================================
  if (blob) {
    // Skin selection
    $$<HTMLInputElement>('input[name="skin"]').forEach(input => {
      input.addEventListener('change', () => {
        const skin = input.value as SkinSubtype
        blobState.skin = skin
        avatar.setSkin({ skin: 'tricolor', subtype: skin })
        $$('.skin-option').forEach(opt => opt.classList.remove('active'))
        input.closest('.skin-option')?.classList.add('active')
      })
    })

    // Colors
    $('#color-x').addEventListener('input', (e) => {
      blobState.colors.x = (e.target as HTMLInputElement).value
      avatar.setColors(blobState.colors.x, blobState.colors.y, blobState.colors.z)
    })
    $('#color-y').addEventListener('input', (e) => {
      blobState.colors.y = (e.target as HTMLInputElement).value
      avatar.setColors(blobState.colors.x, blobState.colors.y, blobState.colors.z)
    })
    $('#color-z').addEventListener('input', (e) => {
      blobState.colors.z = (e.target as HTMLInputElement).value
      avatar.setColors(blobState.colors.x, blobState.colors.y, blobState.colors.z)
    })

    // Resolution
    setupSlider('resolution', (v) => {
      blobState.resolution = v
      blob.setResolution(v)
    }, 0)

    // Spikes
    const updateSpikes = () => blob.setSpikes(blobState.spikes.x, blobState.spikes.y, blobState.spikes.z)
    setupSlider('spike-x', (v) => { blobState.spikes.x = v; updateSpikes() })
    setupSlider('spike-y', (v) => { blobState.spikes.y = v; updateSpikes() })
    setupSlider('spike-z', (v) => { blobState.spikes.z = v; updateSpikes() })

    // Amplitude
    const updateAmplitude = () => blob.setAmplitude(blobState.amplitude.x, blobState.amplitude.y, blobState.amplitude.z)
    setupSlider('amplitude-x', (v) => { blobState.amplitude.x = v; updateAmplitude() })
    setupSlider('amplitude-y', (v) => { blobState.amplitude.y = v; updateAmplitude() })
    setupSlider('amplitude-z', (v) => { blobState.amplitude.z = v; updateAmplitude() })

    // Time
    const updateTime = () => blob.setTime(blobState.time.x, blobState.time.y, blobState.time.z)
    setupSlider('time-x', (v) => { blobState.time.x = v; updateTime() }, 1)
    setupSlider('time-y', (v) => { blobState.time.y = v; updateTime() }, 1)
    setupSlider('time-z', (v) => { blobState.time.z = v; updateTime() }, 1)

    // Rotation
    const updateRotation = () => avatar.setRotation(blobState.rotation.x, blobState.rotation.y, blobState.rotation.z)
    setupSlider('rotation-x', (v) => { blobState.rotation.x = v; updateRotation() }, 3)
    setupSlider('rotation-y', (v) => { blobState.rotation.y = v; updateRotation() }, 3)
    setupSlider('rotation-z', (v) => { blobState.rotation.z = v; updateRotation() }, 3)

    // Appearance
    setupSlider('scale', (v) => { blobState.scale = v; avatar.setScale(v) }, 1)
    setupSlider('opacity', (v) => { blobState.opacity = v; avatar.setOpacity(v) }, 2)
    setupSlider('shininess', (v) => { blobState.shininess = v; avatar.setShininess(v) }, 0)
    setupSlider('light-intensity', (v) => { blobState.lightIntensity = v; blob.setLightIntensity(v) }, 1)

    // Wireframe
    $<HTMLInputElement>('#wireframe').addEventListener('change', (e) => {
      blobState.wireframe = (e.target as HTMLInputElement).checked
      avatar.setWireframe(blobState.wireframe)
    })

    // Interaction
    setupSlider('touch-strength', (v) => { blobState.touchStrength = v; blob.touchStrength = v }, 1)
    setupSlider('touch-duration', (v) => { blobState.touchDuration = v; blob.touchDuration = v }, 0)
    setupSlider('max-touch-points', (v) => { blobState.maxTouchPoints = v; blob.maxTouchPoints = v }, 0)

    // Transitions
    setupSlider('transition-speed', (v) => { blobState.transitionSpeed = v; blob.transitionSpeed = v }, 2)
    setupSliderWithFormat('thinking-duration', (v) => {
      blobState.thinkingDuration = v
      blob.thinkingDuration = v
    }, (v) => `${(v / 1000).toFixed(0)}s`)
  }

  // ============================================================
  // CRYSTAL CONTROLS
  // ============================================================
  if (crystal) {
    // Formation selection
    $$<HTMLInputElement>('input[name="formation"]').forEach(input => {
      input.addEventListener('change', () => {
        const formation = input.value as CrystalFormation
        crystalState.formation = formation
        crystal.setFormation({ formation })
        $$('.formation-option').forEach(opt => opt.classList.remove('active'))
        input.closest('.formation-option')?.classList.add('active')
      })
    })

    // Colors
    $('#crystal-color-primary').addEventListener('input', (e) => {
      crystalState.colors.primary = (e.target as HTMLInputElement).value
      crystal.setColors(crystalState.colors.primary, crystalState.colors.secondary, crystalState.colors.accent)
    })
    $('#crystal-color-secondary').addEventListener('input', (e) => {
      crystalState.colors.secondary = (e.target as HTMLInputElement).value
      crystal.setColors(crystalState.colors.primary, crystalState.colors.secondary, crystalState.colors.accent)
    })
    $('#crystal-color-accent').addEventListener('input', (e) => {
      crystalState.colors.accent = (e.target as HTMLInputElement).value
      crystal.setColors(crystalState.colors.primary, crystalState.colors.secondary, crystalState.colors.accent)
    })

    // Core colors
    $('#crystal-core-inner').addEventListener('input', (e) => {
      crystalState.coreColors.inner = (e.target as HTMLInputElement).value
      crystal.setCoreColors(crystalState.coreColors.inner, crystalState.coreColors.outer)
    })
    $('#crystal-core-outer').addEventListener('input', (e) => {
      crystalState.coreColors.outer = (e.target as HTMLInputElement).value
      crystal.setCoreColors(crystalState.coreColors.inner, crystalState.coreColors.outer)
    })

    // Glow
    setupSlider('crystal-glow', (v) => {
      crystalState.glowIntensity = v
      crystal.setGlowIntensity(v)
    }, 1)

    // Shard count
    setupSlider('crystal-shard-count', (v) => {
      crystalState.shardCount = v
      crystal.setShardCount(v)
    }, 0)

    // Scale
    setupSlider('crystal-scale', (v) => {
      crystalState.scale = v
      crystal.setScale(v)
    }, 2)

    // Rotation
    const updateCrystalRotation = () => crystal.setRotation(
      crystalState.rotation.x,
      crystalState.rotation.y,
      crystalState.rotation.z,
    )
    setupSlider('crystal-rotation-x', (v) => { crystalState.rotation.x = v; updateCrystalRotation() }, 3)
    setupSlider('crystal-rotation-y', (v) => { crystalState.rotation.y = v; updateCrystalRotation() }, 3)
    setupSlider('crystal-rotation-z', (v) => { crystalState.rotation.z = v; updateCrystalRotation() }, 3)

    // Audio reactivity
    setupSlider('crystal-reactivity', (v) => {
      crystalState.audioEffects.reactivity = v
      crystal.audioEffects.reactivity = v
    }, 1)
    setupSlider('crystal-bass-orbit', (v) => {
      crystalState.audioEffects.bassOrbitBoost = v
      crystal.audioEffects.bassOrbitBoost = v
    }, 2)
    setupSlider('crystal-mid-rotation', (v) => {
      crystalState.audioEffects.midRotationBoost = v
      crystal.audioEffects.midRotationBoost = v
    }, 2)
    setupSlider('crystal-high-glow', (v) => {
      crystalState.audioEffects.highGlowBoost = v
      crystal.audioEffects.highGlowBoost = v
    }, 2)

    // Audio enabled
    $<HTMLInputElement>('#crystal-audio-enabled').addEventListener('change', (e) => {
      crystalState.audioEffects.enabled = (e.target as HTMLInputElement).checked
      crystal.audioEffects.enabled = crystalState.audioEffects.enabled
    })

    // Crystal transitions
    setupSlider('crystal-transition-speed', (v) => {
      crystalState.transitionSpeed = v
      crystal.transitionSpeed = v
    }, 2)
    setupSliderWithFormat('crystal-thinking-duration', (v) => {
      crystalState.thinkingDuration = v
      crystal.thinkingDuration = v
    }, (v) => `${(v / 1000).toFixed(0)}s`)
  }

  // ============================================================
  // COMMON CONTROLS (State & Actions)
  // ============================================================

  // State buttons
  $$<HTMLButtonElement>('.state-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const newState = btn.dataset.state as 'idle' | 'listening' | 'thinking'
      avatar.setState(newState)
      $$('.state-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
    })
  })

  // Listen for external state changes
  window.addEventListener('kwami:stateChanged', ((e: CustomEvent) => {
    const avatarState = e.detail
    $$('.state-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.state === avatarState)
    })
  }) as EventListener)

  // Actions
  $('#randomize').addEventListener('click', () => {
    avatar.randomize()
    const currentRendererType = avatar.getRendererType()
    if (currentRendererType === 'blob' && blob) {
      syncBlobPanelFromBlob()
    } else if (currentRendererType === 'crystal' && crystal) {
      syncCrystalPanelFromCrystal()
    }
  })

  $('#export-gltf').addEventListener('click', () => {
    avatar.exportGLTF()
  })

  $('#reset').addEventListener('click', () => {
    const currentRendererType = avatar.getRendererType()
    if (currentRendererType === 'blob' && blob) {
      resetBlob()
    } else if (currentRendererType === 'crystal' && crystal) {
      resetCrystal()
    }
    avatar.setState('idle')
  })

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  function setupSlider(id: string, onChange: (value: number) => void, decimals = 2) {
    const slider = $<HTMLInputElement>(`#${id}`)
    if (!slider) return
    const valueDisplay = slider.nextElementSibling as HTMLElement
    slider.addEventListener('input', () => {
      const value = parseFloat(slider.value)
      valueDisplay.textContent = value.toFixed(decimals)
      onChange(value)
    })
  }

  function setupSliderWithFormat(id: string, onChange: (value: number) => void, format: (value: number) => string) {
    const slider = $<HTMLInputElement>(`#${id}`)
    if (!slider) return
    const valueDisplay = slider.nextElementSibling as HTMLElement
    slider.addEventListener('input', () => {
      const value = parseFloat(slider.value)
      valueDisplay.textContent = format(value)
      onChange(value)
    })
  }

  function setupCollapsibleSections() {
    $$('.section-toggle').forEach(toggle => {
      toggle.addEventListener('click', () => {
        const section = toggle.closest('.panel-section')
        section?.classList.toggle('collapsed')
      })
    })
  }

  function updateSliderUI(id: string, value: number, decimals: number) {
    const slider = $<HTMLInputElement>(`#${id}`)
    if (!slider) return
    const valueDisplay = slider.nextElementSibling as HTMLElement
    slider.value = String(value)
    valueDisplay.textContent = value.toFixed(decimals)
  }

  function updateSliderUIWithFormat(id: string, value: number, format: (value: number) => string) {
    const slider = $<HTMLInputElement>(`#${id}`)
    if (!slider) return
    const valueDisplay = slider.nextElementSibling as HTMLElement
    slider.value = String(value)
    valueDisplay.textContent = format(value)
  }

  // ============================================================
  // BLOB SYNC FUNCTIONS
  // ============================================================

  function syncBlobPanelFromState() {
    // Colors
    $<HTMLInputElement>('#color-x').value = blobState.colors.x
    $<HTMLInputElement>('#color-y').value = blobState.colors.y
    $<HTMLInputElement>('#color-z').value = blobState.colors.z

    // Resolution
    updateSliderUI('resolution', blobState.resolution, 0)

    // Spikes
    updateSliderUI('spike-x', blobState.spikes.x, 2)
    updateSliderUI('spike-y', blobState.spikes.y, 2)
    updateSliderUI('spike-z', blobState.spikes.z, 2)

    // Amplitude
    updateSliderUI('amplitude-x', blobState.amplitude.x, 2)
    updateSliderUI('amplitude-y', blobState.amplitude.y, 2)
    updateSliderUI('amplitude-z', blobState.amplitude.z, 2)

    // Time
    updateSliderUI('time-x', blobState.time.x, 1)
    updateSliderUI('time-y', blobState.time.y, 1)
    updateSliderUI('time-z', blobState.time.z, 1)

    // Rotation
    updateSliderUI('rotation-x', blobState.rotation.x, 3)
    updateSliderUI('rotation-y', blobState.rotation.y, 3)
    updateSliderUI('rotation-z', blobState.rotation.z, 3)

    // Appearance
    updateSliderUI('scale', blobState.scale, 1)
    updateSliderUI('opacity', blobState.opacity, 2)
    updateSliderUI('shininess', blobState.shininess, 0)
    updateSliderUI('light-intensity', blobState.lightIntensity, 1)
    $<HTMLInputElement>('#wireframe').checked = blobState.wireframe

    // Interaction
    updateSliderUI('touch-strength', blobState.touchStrength, 1)
    updateSliderUI('touch-duration', blobState.touchDuration, 0)
    updateSliderUI('max-touch-points', blobState.maxTouchPoints, 0)

    // Transitions
    updateSliderUI('transition-speed', blobState.transitionSpeed, 2)
    updateSliderUIWithFormat('thinking-duration', blobState.thinkingDuration, (v) => `${(v / 1000).toFixed(0)}s`)

    // Skin
    $$<HTMLInputElement>('input[name="skin"]').forEach(input => {
      input.checked = input.value === blobState.skin
    })
    $$('.skin-option').forEach(opt => {
      opt.classList.toggle('active', opt.querySelector('input')?.value === blobState.skin)
    })
  }

  function syncBlobPanelFromBlob() {
    if (!blob) return

    blobState.colors = blob.getColors()
    blobState.spikes = blob.getSpikes()
    blobState.amplitude = blob.getAmplitude()
    blobState.time = blob.getTime()
    blobState.rotation = blob.getRotation()
    blobState.scale = blob.getScale()
    blobState.opacity = blob.getOpacity()
    blobState.shininess = blob.getShininess()
    blobState.lightIntensity = blob.lightIntensity
    blobState.wireframe = blob.getWireframe()
    blobState.skin = blob.getCurrentSkinSubtype() as SkinSubtype
    blobState.touchStrength = blob.touchStrength
    blobState.touchDuration = blob.touchDuration
    blobState.maxTouchPoints = blob.maxTouchPoints
    blobState.transitionSpeed = blob.transitionSpeed
    blobState.thinkingDuration = blob.thinkingDuration

    syncBlobPanelFromState()
  }

  function resetBlob() {
    if (!blob) return

    avatar.setColors('#ff0066', '#00ff66', '#6600ff')
    blob.setSpikes(0.2, 0.2, 0.2)
    blob.setAmplitude(0.8, 0.8, 0.8)
    blob.setTime(1, 1, 1)
    avatar.setRotation(0.002, 0.003, 0.001)
    avatar.setScale(3.2)
    avatar.setOpacity(1)
    avatar.setShininess(50)
    blob.setLightIntensity(0)
    avatar.setWireframe(false)
    avatar.setSkin({ skin: 'tricolor', subtype: 'poles' })
    blob.setResolution(180)
    blob.touchStrength = 1
    blob.touchDuration = 1100
    blob.maxTouchPoints = 5
    blob.transitionSpeed = 0.05
    blob.thinkingDuration = 10000

    syncBlobPanelFromBlob()
  }

  // ============================================================
  // CRYSTAL SYNC FUNCTIONS
  // ============================================================

  function syncCrystalPanelFromState() {
    // Colors
    $<HTMLInputElement>('#crystal-color-primary').value = crystalState.colors.primary
    $<HTMLInputElement>('#crystal-color-secondary').value = crystalState.colors.secondary
    $<HTMLInputElement>('#crystal-color-accent').value = crystalState.colors.accent

    // Core colors
    $<HTMLInputElement>('#crystal-core-inner').value = crystalState.coreColors.inner
    $<HTMLInputElement>('#crystal-core-outer').value = crystalState.coreColors.outer

    // Glow
    updateSliderUI('crystal-glow', crystalState.glowIntensity, 1)

    // Shards
    updateSliderUI('crystal-shard-count', crystalState.shardCount, 0)

    // Transform
    updateSliderUI('crystal-scale', crystalState.scale, 2)
    updateSliderUI('crystal-rotation-x', crystalState.rotation.x, 3)
    updateSliderUI('crystal-rotation-y', crystalState.rotation.y, 3)
    updateSliderUI('crystal-rotation-z', crystalState.rotation.z, 3)

    // Audio
    updateSliderUI('crystal-reactivity', crystalState.audioEffects.reactivity, 1)
    updateSliderUI('crystal-bass-orbit', crystalState.audioEffects.bassOrbitBoost, 2)
    updateSliderUI('crystal-mid-rotation', crystalState.audioEffects.midRotationBoost, 2)
    updateSliderUI('crystal-high-glow', crystalState.audioEffects.highGlowBoost, 2)
    $<HTMLInputElement>('#crystal-audio-enabled').checked = crystalState.audioEffects.enabled

    // Transitions
    updateSliderUI('crystal-transition-speed', crystalState.transitionSpeed, 2)
    updateSliderUIWithFormat('crystal-thinking-duration', crystalState.thinkingDuration, (v) => `${(v / 1000).toFixed(0)}s`)

    // Formation
    $$<HTMLInputElement>('input[name="formation"]').forEach(input => {
      input.checked = input.value === crystalState.formation
    })
    $$('.formation-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.formation === crystalState.formation)
    })
  }

  function syncCrystalPanelFromCrystal() {
    if (!crystal) return

    crystalState.formation = crystal.getFormation().formation as CrystalFormation
    crystalState.colors = crystal.getColors()
    crystalState.scale = crystal.getScale()
    crystalState.rotation = crystal.getRotation()
    crystalState.audioEffects.reactivity = crystal.audioEffects.reactivity
    crystalState.audioEffects.bassOrbitBoost = crystal.audioEffects.bassOrbitBoost
    crystalState.audioEffects.midRotationBoost = crystal.audioEffects.midRotationBoost
    crystalState.audioEffects.highGlowBoost = crystal.audioEffects.highGlowBoost
    crystalState.audioEffects.enabled = crystal.audioEffects.enabled
    crystalState.transitionSpeed = crystal.transitionSpeed
    crystalState.thinkingDuration = crystal.thinkingDuration

    syncCrystalPanelFromState()
  }

  function resetCrystal() {
    if (!crystal) return

    crystal.setFormation({ formation: 'constellation' })
    crystal.setColors('#00e5ff', '#7c4dff', '#ff4081')
    crystal.setCoreColors('#ffffff', '#00ffff')
    crystal.setGlowIntensity(1.2)
    crystal.setShardCount(24)
    crystal.setScale(1)
    crystal.setRotation(0, 0.002, 0)
    crystal.audioEffects.reactivity = 1.5
    crystal.audioEffects.bassOrbitBoost = 0.4
    crystal.audioEffects.midRotationBoost = 0.6
    crystal.audioEffects.highGlowBoost = 0.8
    crystal.audioEffects.enabled = true
    crystal.transitionSpeed = 0.05
    crystal.thinkingDuration = 10000

    syncCrystalPanelFromCrystal()
  }

  // Listen for randomize events
  window.addEventListener('kwami:randomized', () => {
    const currentRendererType = avatar.getRendererType()
    if (currentRendererType === 'blob') {
      syncBlobPanelFromBlob()
    } else {
      syncCrystalPanelFromCrystal()
    }
  })

  return panel
}

// ============================================================
// DEFAULT STATE HELPERS
// ============================================================

function getDefaultBlobState(): BlobPanelState {
  return {
    colors: { x: '#ff0066', y: '#00ff66', z: '#6600ff' },
    spikes: { x: 0.2, y: 0.2, z: 0.2 },
    amplitude: { x: 0.8, y: 0.8, z: 0.8 },
    time: { x: 1, y: 1, z: 1 },
    rotation: { x: 0.002, y: 0.003, z: 0.001 },
    scale: 3.2,
    opacity: 1,
    shininess: 50,
    lightIntensity: 0,
    wireframe: false,
    skin: 'poles',
    resolution: 180,
    touchStrength: 1,
    touchDuration: 1100,
    maxTouchPoints: 5,
    transitionSpeed: 0.05,
    thinkingDuration: 10000,
  }
}

function getDefaultCrystalState(): CrystalPanelState {
  return {
    formation: 'constellation',
    colors: { primary: '#00e5ff', secondary: '#7c4dff', accent: '#ff4081' },
    coreColors: { inner: '#ffffff', outer: '#00ffff' },
    glowIntensity: 1.2,
    shardCount: 24,
    scale: 1,
    rotation: { x: 0, y: 0.002, z: 0 },
    audioEffects: {
      reactivity: 1.5,
      bassOrbitBoost: 0.4,
      midRotationBoost: 0.6,
      highGlowBoost: 0.8,
      enabled: true,
    },
    transitionSpeed: 0.05,
    thinkingDuration: 10000,
  }
}
