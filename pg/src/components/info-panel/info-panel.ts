import { Kwami } from 'kwami-ai'
import template from './info-panel.html?raw'
import './info-panel.css'

export function createInfoPanel(kwami: Kwami): HTMLElement {
  const panel = document.createElement('div')
  panel.className = 'panel-inner'
  panel.innerHTML = template

  const $ = <T extends HTMLElement>(sel: string) => panel.querySelector<T>(sel)!

  // Initialize state
  $('#current-state').textContent = kwami.getState()
  $('#is-connected').textContent = kwami.isConnected() ? 'Yes' : 'No'
  $('#kwami-version').textContent = `v${Kwami.getVersion()}`

  // FPS counter
  let lastTime = performance.now()
  let frames = 0

  function updateFPS() {
    frames++
    const now = performance.now()
    if (now - lastTime >= 1000) {
      const fps = Math.round(frames * 1000 / (now - lastTime))
      $('#fps-counter').textContent = String(fps)
      frames = 0
      lastTime = now
    }
    requestAnimationFrame(updateFPS)
  }
  updateFPS()

  // Update state display
  function updateStateDisplay() {
    $('#current-state').textContent = kwami.getState()
    $('#is-connected').textContent = kwami.isConnected() ? 'Yes' : 'No'
  }

  // Listen for state changes
  window.addEventListener('kwami:stateChanged', updateStateDisplay)
  setInterval(updateStateDisplay, 2000)

  // Debug actions
  $('#log-state').addEventListener('click', () => {
    const blob = kwami.avatar.getBlob()!
    console.group('🎮 Kwami Full State')
    console.log('State:', kwami.getState())
    console.log('Connected:', kwami.isConnected())
    console.group('Avatar')
    console.log('Colors:', blob.getColors())
    console.log('Spikes:', blob.getSpikes())
    console.log('Rotation:', blob.getRotation())
    console.log('Scale:', blob.getScale())
    console.log('Skin:', blob.getCurrentSkinSubtype())
    console.groupEnd()
    console.group('Persona')
    console.log('Name:', kwami.persona.getName())
    console.log('Config:', kwami.persona.getConfig())
    console.groupEnd()
    console.group('Agent')
    console.log('Config:', kwami.agent.getConfig())
    console.groupEnd()
    console.group('Memory')
    console.log('Initialized:', kwami.memory.isInitialized())
    console.log('Config:', kwami.memory.getConfig())
    console.groupEnd()
    console.group('Tools')
    console.log('Tools:', kwami.tools.getAll())
    console.groupEnd()
    console.groupEnd()
  })

  $('#log-config').addEventListener('click', () => {
    console.group('⚙️ Kwami Configuration')
    console.log('Agent:', kwami.agent.getConfig())
    console.log('Persona:', kwami.persona.getConfig())
    console.log('Memory:', kwami.memory.getConfig())
    console.log('Tools:', kwami.tools.getToolDefinitions())
    console.groupEnd()
  })

  return panel
}
