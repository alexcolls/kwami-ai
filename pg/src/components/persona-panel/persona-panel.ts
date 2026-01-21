import type { Kwami } from 'kwami-ai'
import template from './persona-panel.html?raw'
import './persona-panel.css'

export function createPersonaPanel(kwami: Kwami): HTMLElement {
  const persona = kwami.persona
  const config = persona.getConfig()

  const panel = document.createElement('div')
  panel.className = 'panel-inner'
  panel.innerHTML = template

  const $ = <T extends HTMLElement>(sel: string) => panel.querySelector<T>(sel)!
  const $$ = <T extends HTMLElement>(sel: string) => panel.querySelectorAll<T>(sel)

  // Initialize UI from config
  $<HTMLInputElement>('#persona-name').value = config.name || 'Kwami'
  $<HTMLTextAreaElement>('#persona-personality').value = config.personality || ''
  $<HTMLInputElement>('#conversation-style').value = config.conversationStyle || 'friendly'
  $<HTMLSelectElement>('#language').value = config.language || 'en'
  $<HTMLTextAreaElement>('#system-prompt').value = config.systemPrompt || ''

  // Initialize traits
  refreshTraits()

  // Initialize response length
  $$<HTMLButtonElement>('.toggle-btn[data-length]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.length === config.responseLength)
  })

  // Initialize emotional tone
  $$<HTMLInputElement>('input[name="tone"]').forEach(input => {
    input.checked = input.value === config.emotionalTone
    if (input.checked) {
      input.closest('.tone-option')?.classList.add('active')
    }
  })

  // Render emotional trait sliders
  renderEmotionalSliders()

  // Name change
  $('#persona-name').addEventListener('change', (e) => {
    persona.setName((e.target as HTMLInputElement).value)
  })

  // Personality change
  $('#persona-personality').addEventListener('change', (e) => {
    persona.updateConfig({ personality: (e.target as HTMLTextAreaElement).value })
  })

  // Conversation style change
  $('#conversation-style').addEventListener('change', (e) => {
    persona.setConversationStyle((e.target as HTMLInputElement).value)
  })

  // Language change
  $('#language').addEventListener('change', (e) => {
    persona.setLanguage((e.target as HTMLSelectElement).value)
  })

  // Add trait
  function addTrait() {
    const input = $<HTMLInputElement>('#new-trait')
    const trait = input.value.trim()
    if (!trait) return

    persona.addTrait(trait)
    input.value = ''
    refreshTraits()
  }

  $('#add-trait-btn').addEventListener('click', addTrait)
  $('#new-trait').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTrait()
  })

  function refreshTraits() {
    const container = $('#traits-container')
    const traits = persona.getTraits()
    container.innerHTML = traits.map(t => `
      <span class="trait-tag">
        ${t}
        <button class="trait-remove" data-trait="${t}">×</button>
      </span>
    `).join('')

    container.querySelectorAll<HTMLButtonElement>('.trait-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        persona.removeTrait(btn.dataset.trait!)
        refreshTraits()
      })
    })
  }

  // Response length
  $$<HTMLButtonElement>('.toggle-btn[data-length]').forEach(btn => {
    btn.addEventListener('click', () => {
      const length = btn.dataset.length as 'short' | 'medium' | 'long'
      persona.setResponseLength(length)
      $$('.toggle-btn[data-length]').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
    })
  })

  // Emotional tone
  $$<HTMLInputElement>('input[name="tone"]').forEach(input => {
    input.addEventListener('change', () => {
      const tone = input.value as 'neutral' | 'warm' | 'enthusiastic' | 'calm'
      persona.setEmotionalTone(tone)
      $$('.tone-option').forEach(opt => opt.classList.remove('active'))
      input.closest('.tone-option')?.classList.add('active')
    })
  })

  function renderEmotionalSliders() {
    const emotionalTraits = [
      { key: 'happiness', label: 'Happiness', icon: 'ph:smiley-duotone' },
      { key: 'energy', label: 'Energy', icon: 'ph:lightning-duotone' },
      { key: 'confidence', label: 'Confidence', icon: 'ph:trophy-duotone' },
      { key: 'empathy', label: 'Empathy', icon: 'ph:heart-duotone' },
      { key: 'curiosity', label: 'Curiosity', icon: 'ph:magnifying-glass-duotone' },
      { key: 'creativity', label: 'Creativity', icon: 'ph:paint-brush-duotone' },
    ]

    const container = $('#emotional-traits')
    const traits = config.emotionalTraits || {}

    container.innerHTML = emotionalTraits.map(t => `
      <div class="control-row">
        <label>
          <iconify-icon icon="${t.icon}"></iconify-icon>
          ${t.label}
        </label>
        <input type="range" id="trait-${t.key}" min="-100" max="100" step="1" 
               value="${traits[t.key as keyof typeof traits] ?? 0}">
        <span class="value">${traits[t.key as keyof typeof traits] ?? 0}</span>
      </div>
    `).join('')

    // Wire up sliders
    emotionalTraits.forEach(trait => {
      const slider = $<HTMLInputElement>(`#trait-${trait.key}`)
      slider.addEventListener('input', () => {
        const value = parseInt(slider.value)
        const valueDisplay = slider.nextElementSibling as HTMLElement
        valueDisplay.textContent = String(value)
        persona.setEmotionalTrait(trait.key as keyof typeof config.emotionalTraits, value)
      })
    })
  }

  // System prompt
  $('#system-prompt').addEventListener('change', (e) => {
    persona.updateConfig({ systemPrompt: (e.target as HTMLTextAreaElement).value })
  })

  // Preview full prompt
  $('#preview-prompt-btn').addEventListener('click', () => {
    const fullPrompt = persona.getSystemPrompt()
    console.log('📝 Full System Prompt:\n', fullPrompt)
    alert('Full prompt logged to console (F12 to view)')
  })

  // Export persona
  $('#export-persona-btn').addEventListener('click', () => {
    const json = persona.exportAsJSON()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'kwami-persona.json'
    a.click()
    URL.revokeObjectURL(url)
  })

  // Import persona
  $('#import-persona-btn').addEventListener('click', () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        persona.importFromJSON(text)
        alert('Persona imported! Refresh panel to see changes.')
      } catch (error) {
        alert('Failed to import persona: ' + (error as Error).message)
      }
    }
    input.click()
  })

  // Reset persona
  $('#reset-persona-btn').addEventListener('click', () => {
    if (confirm('Reset persona to defaults?')) {
      persona.updateConfig({
        name: 'Kwami',
        personality: 'A friendly and helpful AI companion',
        traits: ['friendly', 'helpful', 'curious'],
        conversationStyle: 'friendly',
        responseLength: 'medium',
        emotionalTone: 'warm',
      })
      alert('Persona reset! Refresh panel to see changes.')
    }
  })

  return panel
}
