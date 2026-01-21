import type { Avatar } from 'kwami-ai'
import template from './audio-panel.html?raw'
import './audio-panel.css'

export function createAudioPanel(avatar: Avatar): HTMLElement {
  const audio = avatar.getAudio()
  const blob = avatar.getBlob()!

  const panel = document.createElement('div')
  panel.className = 'panel-inner'
  panel.innerHTML = template

  const $ = <T extends HTMLElement>(sel: string) => panel.querySelector<T>(sel)!

  let micActive = false
  let visualizerEnabled = true

  // Initialize UI from current values
  const volumeSlider = $<HTMLInputElement>('#volume')
  const volumeValue = volumeSlider.nextElementSibling as HTMLElement
  volumeSlider.value = String(audio.getVolume())
  volumeValue.textContent = `${(audio.getVolume() * 100).toFixed(0)}%`

  updateSliderUI('audio-reactivity', blob.audioEffects.reactivity, 1)
  updateSliderUI('audio-sensitivity', blob.audioEffects.sensitivity, 3)
  updateSliderUI('audio-breathing', blob.audioEffects.breathing, 3)
  updateSliderUI('bass-spike', blob.audioEffects.bassSpike, 2)
  updateSliderUI('mid-spike', blob.audioEffects.midSpike, 2)
  updateSliderUI('high-spike', blob.audioEffects.highSpike, 2)

  // Volume
  setupSlider('volume', (v) => {
    audio.setVolume(v)
    const display = $<HTMLElement>('#volume + .value')
    display.textContent = `${(v * 100).toFixed(0)}%`
  }, 0, true)

  // Audio reactivity
  setupSlider('audio-reactivity', (v) => { blob.audioEffects.reactivity = v }, 1)
  setupSlider('audio-sensitivity', (v) => { blob.audioEffects.sensitivity = v }, 3)
  setupSlider('audio-breathing', (v) => { blob.audioEffects.breathing = v }, 3)

  // Frequency response
  setupSlider('bass-spike', (v) => { blob.audioEffects.bassSpike = v }, 2)
  setupSlider('mid-spike', (v) => { blob.audioEffects.midSpike = v }, 2)
  setupSlider('high-spike', (v) => { blob.audioEffects.highSpike = v }, 2)

  // Microphone toggle
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

  // Visualizer
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

      const hue = 260 + (i / barCount) * 60
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

  function setupSlider(id: string, onChange: (value: number) => void, decimals = 2, isPercent = false) {
    const slider = $<HTMLInputElement>(`#${id}`)
    const valueDisplay = slider.nextElementSibling as HTMLElement
    slider.addEventListener('input', () => {
      const value = parseFloat(slider.value)
      if (!isPercent) {
        valueDisplay.textContent = value.toFixed(decimals)
      }
      onChange(value)
    })
  }

  function updateSliderUI(id: string, value: number, decimals: number) {
    const slider = $<HTMLInputElement>(`#${id}`)
    const valueDisplay = slider.nextElementSibling as HTMLElement
    slider.value = String(value)
    valueDisplay.textContent = value.toFixed(decimals)
  }

  return panel
}
