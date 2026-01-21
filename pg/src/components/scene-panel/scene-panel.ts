import type { Avatar } from 'kwami-ai'
import template from './scene-panel.html?raw'
import './scene-panel.css'

export function createScenePanel(avatar: Avatar): HTMLElement {
  const scene = avatar.getScene()

  const panel = document.createElement('div')
  panel.className = 'panel-inner'
  panel.innerHTML = template

  const $ = <T extends HTMLElement>(sel: string) => panel.querySelector<T>(sel)!
  const $$ = <T extends HTMLElement>(sel: string) => panel.querySelectorAll<T>(sel)

  // Camera controls
  setupSlider('camera-fov', (v) => {
    scene.camera.fov = v
    scene.camera.updateProjectionMatrix()
  }, 0)

  setupSlider('camera-distance', (v) => {
    scene.camera.position.z = v
    scene.camera.lookAt(0, 0, 0)
  }, 1)

  // Lighting controls
  setupSlider('light-top', (v) => {
    scene.lights.top.intensity = v
  }, 1)

  setupSlider('light-bottom', (v) => {
    scene.lights.bottom.intensity = v
  }, 1)

  setupSlider('light-ambient', (v) => {
    scene.lights.ambient.intensity = v
  }, 1)

  // Background type
  $$<HTMLInputElement>('input[name="bg-type"]').forEach(input => {
    input.addEventListener('change', () => {
      const type = input.value
      $$('.bg-option').forEach(opt => opt.classList.remove('active'))
      input.closest('.bg-option')?.classList.add('active')

      $('#gradient-config').classList.toggle('hidden', type !== 'gradient')
      $('#solid-config').classList.toggle('hidden', type !== 'solid')

      if (type === 'transparent') {
        scene.scene.background = null
      } else if (type === 'solid') {
        updateSolidBackground()
      } else {
        updateGradientBackground()
      }
    })
  })

  // Gradient colors
  $('#gradient-start').addEventListener('input', updateGradientBackground)
  $('#gradient-mid').addEventListener('input', updateGradientBackground)
  $('#gradient-end').addEventListener('input', updateGradientBackground)
  $('#gradient-direction').addEventListener('change', updateGradientBackground)

  // Solid color
  $('#solid-color').addEventListener('input', updateSolidBackground)

  // Presets
  const presets: Record<string, { colors: [string, string, string] }> = {
    midnight: { colors: ['#0a0a1a', '#1a1a3a', '#0a0a1a'] },
    sunset: { colors: ['#1a0a1a', '#3a1a2a', '#1a0a1a'] },
    ocean: { colors: ['#0a1a2a', '#1a2a3a', '#0a1a2a'] },
    forest: { colors: ['#0a1a0a', '#1a2a1a', '#0a1a0a'] },
    cyber: { colors: ['#1a0a2a', '#0a1a3a', '#1a0a2a'] },
    warm: { colors: ['#2a1a0a', '#3a2a1a', '#2a1a0a'] },
  }

  $$<HTMLButtonElement>('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = presets[btn.dataset.preset!]
      if (preset) {
        $<HTMLInputElement>('#gradient-start').value = preset.colors[0]
        $<HTMLInputElement>('#gradient-mid').value = preset.colors[1]
        $<HTMLInputElement>('#gradient-end').value = preset.colors[2]
        
        // Set type to gradient
        const gradientRadio = panel.querySelector<HTMLInputElement>('input[value="gradient"]')!
        gradientRadio.checked = true
        gradientRadio.dispatchEvent(new Event('change'))
        
        updateGradientBackground()
      }
    })
  })

  function updateGradientBackground() {
    const colors = [
      $<HTMLInputElement>('#gradient-start').value,
      $<HTMLInputElement>('#gradient-mid').value,
      $<HTMLInputElement>('#gradient-end').value,
    ]
    const direction = $<HTMLSelectElement>('#gradient-direction').value as 'radial' | 'vertical' | 'horizontal' | 'diagonal'
    
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!

    let gradient: CanvasGradient
    if (direction === 'radial') {
      gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 512)
    } else if (direction === 'horizontal') {
      gradient = ctx.createLinearGradient(0, 0, 512, 0)
    } else if (direction === 'diagonal') {
      gradient = ctx.createLinearGradient(0, 0, 512, 512)
    } else {
      gradient = ctx.createLinearGradient(0, 0, 0, 512)
    }

    gradient.addColorStop(0, colors[0])
    gradient.addColorStop(0.5, colors[1])
    gradient.addColorStop(1, colors[2])

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 512, 512)

    const THREE = (window as unknown as { THREE?: typeof import('three') }).THREE
    if (THREE) {
      const texture = new THREE.CanvasTexture(canvas)
      scene.scene.background = texture
    } else {
      import('three').then(({ CanvasTexture }) => {
        const texture = new CanvasTexture(canvas)
        scene.scene.background = texture
      })
    }
  }

  function updateSolidBackground() {
    const color = $<HTMLInputElement>('#solid-color').value
    import('three').then(({ Color }) => {
      scene.scene.background = new Color(color)
    })
  }

  function setupSlider(id: string, onChange: (value: number) => void, decimals = 2) {
    const slider = $<HTMLInputElement>(`#${id}`)
    const valueDisplay = slider.nextElementSibling as HTMLElement
    slider.addEventListener('input', () => {
      const value = parseFloat(slider.value)
      valueDisplay.textContent = value.toFixed(decimals)
      onChange(value)
    })
  }

  return panel
}
