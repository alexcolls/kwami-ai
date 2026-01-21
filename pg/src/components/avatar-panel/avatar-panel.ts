import type { Avatar } from 'kwami'
import template from './avatar-panel.html?raw'
import './avatar-panel.css'

type SkinSubtype = 'poles' | 'donut' | 'vintage'

interface PanelState {
  colors: { x: string; y: string; z: string }
  spikes: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  scale: number
  opacity: number
  shininess: number
  wireframe: boolean
  skin: SkinSubtype
}

export function createAvatarPanel(avatar: Avatar): HTMLElement {
  const blob = avatar.getBlob()!

  // Initialize state from current blob values
  const state: PanelState = {
    colors: blob.getColors(),
    spikes: blob.getSpikes(),
    rotation: blob.getRotation(),
    scale: blob.getScale(),
    opacity: blob.getOpacity(),
    shininess: blob.getShininess(),
    wireframe: blob.getWireframe(),
    skin: blob.getCurrentSkinSubtype() as SkinSubtype,
  }

  const panel = document.createElement('div')
  panel.className = 'panel-inner'
  panel.innerHTML = template

  // Wire up controls
  const $ = <T extends HTMLElement>(sel: string) => panel.querySelector<T>(sel)!
  const $$ = <T extends HTMLElement>(sel: string) => panel.querySelectorAll<T>(sel)

  // Initialize UI from state
  syncPanelFromState()

  // Skin selection
  $$<HTMLInputElement>('input[name="skin"]').forEach(input => {
    input.addEventListener('change', () => {
      const skin = input.value as SkinSubtype
      state.skin = skin
      avatar.setSkin({ skin: 'tricolor', subtype: skin })
      $$('.skin-option').forEach(opt => opt.classList.remove('active'))
      input.closest('.skin-option')?.classList.add('active')
    })
  })

  // Colors
  $('#color-x').addEventListener('input', (e) => {
    state.colors.x = (e.target as HTMLInputElement).value
    avatar.setColors(state.colors.x, state.colors.y, state.colors.z)
  })
  $('#color-y').addEventListener('input', (e) => {
    state.colors.y = (e.target as HTMLInputElement).value
    avatar.setColors(state.colors.x, state.colors.y, state.colors.z)
  })
  $('#color-z').addEventListener('input', (e) => {
    state.colors.z = (e.target as HTMLInputElement).value
    avatar.setColors(state.colors.x, state.colors.y, state.colors.z)
  })

  // Spikes
  const updateSpikes = () => avatar.setSpikes(state.spikes.x, state.spikes.y, state.spikes.z)
  setupSlider('spike-x', (v) => { state.spikes.x = v; updateSpikes() })
  setupSlider('spike-y', (v) => { state.spikes.y = v; updateSpikes() })
  setupSlider('spike-z', (v) => { state.spikes.z = v; updateSpikes() })

  // Rotation
  const updateRotation = () => avatar.setRotation(state.rotation.x, state.rotation.y, state.rotation.z)
  setupSlider('rotation-x', (v) => { state.rotation.x = v; updateRotation() }, 3)
  setupSlider('rotation-y', (v) => { state.rotation.y = v; updateRotation() }, 3)
  setupSlider('rotation-z', (v) => { state.rotation.z = v; updateRotation() }, 3)

  // Appearance
  setupSlider('scale', (v) => { state.scale = v; avatar.setScale(v) }, 1)
  setupSlider('opacity', (v) => { state.opacity = v; avatar.setOpacity(v) }, 2)
  setupSlider('shininess', (v) => { state.shininess = v; avatar.setShininess(v) }, 0)

  // Wireframe
  $<HTMLInputElement>('#wireframe').addEventListener('change', (e) => {
    state.wireframe = (e.target as HTMLInputElement).checked
    avatar.setWireframe(state.wireframe)
  })

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
    syncPanelFromBlob()
  })

  $('#export-gltf').addEventListener('click', () => {
    avatar.exportGLTF()
  })

  $('#reset').addEventListener('click', () => {
    avatar.setColors('#ff0066', '#00ff66', '#6600ff')
    avatar.setSpikes(0.3, 0.3, 0.3)
    avatar.setRotation(0.002, 0.003, 0.001)
    avatar.setScale(1)
    avatar.setOpacity(1)
    avatar.setShininess(50)
    avatar.setWireframe(false)
    avatar.setSkin({ skin: 'tricolor', subtype: 'poles' })
    avatar.setState('idle')
    syncPanelFromBlob()
  })

  function setupSlider(id: string, onChange: (value: number) => void, decimals = 2) {
    const slider = $<HTMLInputElement>(`#${id}`)
    const valueDisplay = slider.nextElementSibling as HTMLElement
    slider.addEventListener('input', () => {
      const value = parseFloat(slider.value)
      valueDisplay.textContent = value.toFixed(decimals)
      onChange(value)
    })
  }

  function syncPanelFromState() {
    // Colors
    $<HTMLInputElement>('#color-x').value = state.colors.x
    $<HTMLInputElement>('#color-y').value = state.colors.y
    $<HTMLInputElement>('#color-z').value = state.colors.z

    // Spikes
    updateSliderUI('spike-x', state.spikes.x, 2)
    updateSliderUI('spike-y', state.spikes.y, 2)
    updateSliderUI('spike-z', state.spikes.z, 2)

    // Rotation
    updateSliderUI('rotation-x', state.rotation.x, 3)
    updateSliderUI('rotation-y', state.rotation.y, 3)
    updateSliderUI('rotation-z', state.rotation.z, 3)

    // Appearance
    updateSliderUI('scale', state.scale, 1)
    updateSliderUI('opacity', state.opacity, 2)
    updateSliderUI('shininess', state.shininess, 0)
    $<HTMLInputElement>('#wireframe').checked = state.wireframe

    // Skin
    $$<HTMLInputElement>('input[name="skin"]').forEach(input => {
      input.checked = input.value === state.skin
    })
    $$('.skin-option').forEach(opt => {
      opt.classList.toggle('active', opt.querySelector('input')?.value === state.skin)
    })
  }

  function syncPanelFromBlob() {
    const blob = avatar.getBlob()!
    
    state.colors = blob.getColors()
    state.spikes = blob.getSpikes()
    state.rotation = blob.getRotation()
    state.scale = blob.getScale()
    state.opacity = blob.getOpacity()
    state.shininess = blob.getShininess()
    state.wireframe = blob.getWireframe()
    state.skin = blob.getCurrentSkinSubtype() as SkinSubtype

    syncPanelFromState()
  }

  function updateSliderUI(id: string, value: number, decimals: number) {
    const slider = $<HTMLInputElement>(`#${id}`)
    const valueDisplay = slider.nextElementSibling as HTMLElement
    slider.value = String(value)
    valueDisplay.textContent = value.toFixed(decimals)
  }

  window.addEventListener('kwami:randomized', syncPanelFromBlob)

  return panel
}
