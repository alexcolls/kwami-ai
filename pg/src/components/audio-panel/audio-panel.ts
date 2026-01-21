import type { Avatar } from 'kwami-ai'
import template from './audio-panel.html?raw'
import './audio-panel.css'

export function createAudioPanel(avatar: Avatar): HTMLElement {
  const audio = avatar.getAudio()
  const blob = avatar.getBlob()
  const crystal = avatar.getCrystal()
  const rendererType = avatar.getRendererType()

  const panel = document.createElement('div')
  panel.className = 'panel-inner'
  panel.innerHTML = template

  const $ = <T extends HTMLElement>(sel: string) => panel.querySelector<T>(sel)!
  const $$ = <T extends HTMLElement>(sel: string) => panel.querySelectorAll<T>(sel)

  let micActive = false
  let visualizerEnabled = true

  // Initialize UI from current values
  syncUIFromRenderer()

  // Setup collapsible sections
  setupCollapsibleSections()

  // Volume (works for both renderers)
  setupSlider('volume', (v) => {
    audio.setVolume(v)
    const display = $<HTMLElement>('#volume + .value')
    display.textContent = `${(v * 100).toFixed(0)}%`
  }, 0, true)

  // ============================================================
  // BLOB-SPECIFIC AUDIO CONTROLS
  // ============================================================
  if (blob) {
    // Master audio toggle
    $<HTMLInputElement>('#audio-enabled').addEventListener('change', (e) => {
      blob.audioEffects.enabled = (e.target as HTMLInputElement).checked
    })

    // Audio reactivity
    setupSlider('audio-reactivity', (v) => { blob.audioEffects.reactivity = v }, 1)
    setupSlider('audio-sensitivity', (v) => { blob.audioEffects.sensitivity = v }, 3)
    setupSlider('audio-breathing', (v) => { blob.audioEffects.breathing = v }, 3)

    // Response dynamics
    setupSlider('response-speed', (v) => { blob.audioEffects.responseSpeed = v }, 2)
    setupSlider('transient-boost', (v) => { blob.audioEffects.transientBoost = v }, 2)

    // Frequency response
    setupSlider('bass-spike', (v) => { blob.audioEffects.bassSpike = v }, 2)
    setupSlider('mid-spike', (v) => { blob.audioEffects.midSpike = v }, 2)
    setupSlider('high-spike', (v) => { blob.audioEffects.highSpike = v }, 2)

    // Time modulation toggle
    $<HTMLInputElement>('#time-enabled').addEventListener('change', (e) => {
      blob.audioEffects.timeEnabled = (e.target as HTMLInputElement).checked
    })

    // Time modulation values
    setupSlider('mid-time', (v) => { blob.audioEffects.midTime = v }, 2)
    setupSlider('high-time', (v) => { blob.audioEffects.highTime = v }, 2)
    setupSlider('ultra-time', (v) => { blob.audioEffects.ultraTime = v }, 2)
  }

  // ============================================================
  // CRYSTAL-SPECIFIC AUDIO CONTROLS (reuse some controls)
  // ============================================================
  if (crystal) {
    // Master audio toggle (reuse)
    $<HTMLInputElement>('#audio-enabled').addEventListener('change', (e) => {
      crystal.audioEffects.enabled = (e.target as HTMLInputElement).checked
    })

    // Audio reactivity (reuse)
    setupSlider('audio-reactivity', (v) => { crystal.audioEffects.reactivity = v }, 1)

    // For Crystal, we don't have sensitivity/breathing, but we have smoothing
    // Reuse audio-sensitivity for smoothing
    setupSlider('audio-sensitivity', (v) => { crystal.audioEffects.smoothing = v }, 3)

    // For Crystal, the frequency spikes map to different effects
    // bass-spike -> bassOrbitBoost
    // mid-spike -> midRotationBoost  
    // high-spike -> highGlowBoost
    setupSlider('bass-spike', (v) => { crystal.audioEffects.bassOrbitBoost = v }, 2)
    setupSlider('mid-spike', (v) => { crystal.audioEffects.midRotationBoost = v }, 2)
    setupSlider('high-spike', (v) => { crystal.audioEffects.highGlowBoost = v }, 2)
  }

  // Microphone toggle (works for both renderers)
  $('#mic-toggle').addEventListener('click', async () => {
    if (micActive) {
      audio.stopMicrophoneListening()
      micActive = false
      updateMicUI()
    } else {
      try {
        await audio.startMicrophoneListening()
        micActive = true
        updateMicUI()
      } catch (error) {
        console.error('Failed to start microphone:', error)
        $('#mic-status-text').textContent = 'Error'
        $('#mic-status').classList.add('error')
      }
    }
  })

  function updateMicUI() {
    const icon = $('#mic-icon')
    const label = $('#mic-label')
    const status = $('#mic-status')
    const statusText = $('#mic-status-text')

    if (micActive) {
      icon.setAttribute('icon', 'ph:microphone-slash-duotone')
      label.textContent = 'Stop Mic'
      status.classList.add('active')
      status.classList.remove('error')
      statusText.textContent = 'Active'
    } else {
      icon.setAttribute('icon', 'ph:microphone-duotone')
      label.textContent = 'Start Mic'
      status.classList.remove('active', 'error')
      statusText.textContent = 'Inactive'
    }
  }

  // Visualizer (works for both renderers)
  const canvas = $<HTMLCanvasElement>('#audio-visualizer')
  const ctx = canvas.getContext('2d')!

  function drawVisualizer() {
    if (!visualizerEnabled) {
      requestAnimationFrame(drawVisualizer)
      return
    }

    const frequencyData = audio.getFrequencyData()
    const width = canvas.width
    const height = canvas.height

    ctx.fillStyle = 'rgba(10, 12, 20, 0.3)'
    ctx.fillRect(0, 0, width, height)

    if (frequencyData.length === 0) {
      requestAnimationFrame(drawVisualizer)
      return
    }

    const barCount = 32
    const barWidth = width / barCount - 2
    const step = Math.floor(frequencyData.length / barCount)

    for (let i = 0; i < barCount; i++) {
      const value = frequencyData[i * step] / 255
      const barHeight = value * height * 0.9

      // Different color scheme based on renderer
      const hue = rendererType === 'crystal' ? 180 + (i / barCount) * 60 : 260 + (i / barCount) * 60
      ctx.fillStyle = `hsla(${hue}, 70%, 60%, ${0.5 + value * 0.5})`
      
      const x = i * (barWidth + 2)
      const y = height - barHeight
      
      ctx.beginPath()
      ctx.roundRect(x, y, barWidth, barHeight, 2)
      ctx.fill()
    }

    requestAnimationFrame(drawVisualizer)
  }

  // Start visualizer
  drawVisualizer()

  // Toggle visualizer
  $<HTMLInputElement>('#show-visualizer').addEventListener('change', (e) => {
    visualizerEnabled = (e.target as HTMLInputElement).checked
    canvas.style.opacity = visualizerEnabled ? '1' : '0.3'
  })

  function setupCollapsibleSections() {
    $$('.section-toggle').forEach(toggle => {
      toggle.addEventListener('click', () => {
        const section = toggle.closest('.panel-section')
        section?.classList.toggle('collapsed')
      })
    })
  }

  function setupSlider(id: string, onChange: (value: number) => void, decimals = 2, isPercent = false) {
    const slider = $<HTMLInputElement>(`#${id}`)
    if (!slider) return
    const valueDisplay = slider.nextElementSibling as HTMLElement
    slider.addEventListener('input', () => {
      const value = parseFloat(slider.value)
      if (!isPercent) {
        valueDisplay.textContent = value.toFixed(decimals)
      }
      onChange(value)
    })
  }

  function updateSliderUI(id: string, value: number | undefined, decimals: number) {
    if (value === undefined) return
    const slider = $<HTMLInputElement>(`#${id}`)
    if (!slider) return
    const valueDisplay = slider.nextElementSibling as HTMLElement
    slider.value = String(value)
    valueDisplay.textContent = value.toFixed(decimals)
  }

  function syncUIFromRenderer() {
    // Volume (common)
    const volumeSlider = $<HTMLInputElement>('#volume')
    const volumeValue = volumeSlider.nextElementSibling as HTMLElement
    volumeSlider.value = String(audio.getVolume())
    volumeValue.textContent = `${(audio.getVolume() * 100).toFixed(0)}%`

    if (blob) {
      syncUIFromBlob()
    } else if (crystal) {
      syncUIFromCrystal()
    }
  }

  function syncUIFromBlob() {
    if (!blob) return

    // Master toggle
    $<HTMLInputElement>('#audio-enabled').checked = blob.audioEffects.enabled

    // Reactivity
    updateSliderUI('audio-reactivity', blob.audioEffects.reactivity, 1)
    updateSliderUI('audio-sensitivity', blob.audioEffects.sensitivity, 3)
    updateSliderUI('audio-breathing', blob.audioEffects.breathing, 3)

    // Response dynamics
    updateSliderUI('response-speed', blob.audioEffects.responseSpeed, 2)
    updateSliderUI('transient-boost', blob.audioEffects.transientBoost, 2)

    // Frequency spikes
    updateSliderUI('bass-spike', blob.audioEffects.bassSpike, 2)
    updateSliderUI('mid-spike', blob.audioEffects.midSpike, 2)
    updateSliderUI('high-spike', blob.audioEffects.highSpike, 2)

    // Time modulation
    $<HTMLInputElement>('#time-enabled').checked = blob.audioEffects.timeEnabled
    updateSliderUI('mid-time', blob.audioEffects.midTime, 2)
    updateSliderUI('high-time', blob.audioEffects.highTime, 2)
    updateSliderUI('ultra-time', blob.audioEffects.ultraTime, 2)
  }

  function syncUIFromCrystal() {
    if (!crystal) return

    // Master toggle
    $<HTMLInputElement>('#audio-enabled').checked = crystal.audioEffects.enabled

    // Reactivity
    updateSliderUI('audio-reactivity', crystal.audioEffects.reactivity, 1)
    
    // Smoothing -> reuse sensitivity slider
    updateSliderUI('audio-sensitivity', crystal.audioEffects.smoothing, 3)

    // Crystal frequency effects map to blob spike sliders
    updateSliderUI('bass-spike', crystal.audioEffects.bassOrbitBoost, 2)
    updateSliderUI('mid-spike', crystal.audioEffects.midRotationBoost, 2)
    updateSliderUI('high-spike', crystal.audioEffects.highGlowBoost, 2)

    // Hide blob-only sections for Crystal
    const breathingRow = $('#audio-breathing')?.closest('.control-row') as HTMLElement | null
    if (breathingRow) breathingRow.style.display = 'none'
    
    const responseDynamicsSection = $('#response-speed')?.closest('.panel-section') as HTMLElement | null
    if (responseDynamicsSection) responseDynamicsSection.style.display = 'none'
    
    const timeModulationSection = $('#time-enabled')?.closest('.panel-section') as HTMLElement | null
    if (timeModulationSection) timeModulationSection.style.display = 'none'
  }

  return panel
}
