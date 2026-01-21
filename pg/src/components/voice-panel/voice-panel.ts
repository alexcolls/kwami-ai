import type { Kwami, VoicePipelineConfig, VoicePipelinePreset } from 'kwami-ai'
import { getVoicePipelinePreset } from 'kwami-ai'
import template from './voice-panel.html?raw'
import './voice-panel.css'

// Model options by provider
const STT_MODELS: Record<string, Array<{ value: string; label: string }>> = {
  deepgram: [
    { value: 'nova-3', label: 'Nova 3' },
    { value: 'nova-2', label: 'Nova 2' },
    { value: 'nova-2-conversational-ai', label: 'Nova 2 Conversational' },
    { value: 'flux', label: 'Flux (English)' },
  ],
  assemblyai: [
    { value: 'universal-streaming', label: 'Universal Streaming' },
    { value: 'universal-streaming-multilingual', label: 'Universal Multilingual' },
  ],
  cartesia: [{ value: 'ink-whisper', label: 'Ink Whisper' }],
  elevenlabs: [{ value: 'scribe-v2-realtime', label: 'Scribe V2 Realtime' }],
  openai: [{ value: 'whisper-1', label: 'Whisper 1' }],
  google: [{ value: 'default', label: 'Default' }],
  azure: [{ value: 'default', label: 'Default' }],
}

const LLM_MODELS: Record<string, Array<{ value: string; label: string }>> = {
  openai: [
    { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
    { value: 'gpt-4.1', label: 'GPT-4.1' },
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-5-mini', label: 'GPT-5 Mini' },
    { value: 'gpt-5', label: 'GPT-5' },
  ],
  gemini: [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'gemini-3-flash', label: 'Gemini 3 Flash' },
  ],
  deepseek: [
    { value: 'deepseek-v3', label: 'DeepSeek V3' },
    { value: 'deepseek-v3.2', label: 'DeepSeek V3.2' },
  ],
  anthropic: [
    { value: 'claude-3-opus', label: 'Claude 3 Opus' },
    { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
    { value: 'claude-3-haiku', label: 'Claude 3 Haiku' },
  ],
  groq: [
    { value: 'llama-3.3-70b', label: 'Llama 3.3 70B' },
    { value: 'mixtral-8x7b', label: 'Mixtral 8x7B' },
  ],
  mistral: [
    { value: 'mistral-large', label: 'Mistral Large' },
    { value: 'mistral-medium', label: 'Mistral Medium' },
  ],
  ollama: [
    { value: 'llama3.2', label: 'Llama 3.2' },
    { value: 'mistral', label: 'Mistral' },
  ],
}

const TTS_MODELS: Record<string, Array<{ value: string; label: string }>> = {
  cartesia: [
    { value: 'sonic-3', label: 'Sonic 3' },
    { value: 'sonic-english', label: 'Sonic English' },
    { value: 'sonic-multilingual', label: 'Sonic Multilingual' },
  ],
  elevenlabs: [
    { value: 'eleven_turbo_v2_5', label: 'Turbo V2.5' },
    { value: 'eleven_multilingual_v2', label: 'Multilingual V2' },
  ],
  deepgram: [
    { value: 'aura-2', label: 'Aura 2' },
    { value: 'aura', label: 'Aura' },
  ],
  rime: [
    { value: 'arcana', label: 'Arcana' },
    { value: 'mist', label: 'Mist' },
  ],
  inworld: [{ value: 'inworld-tts-1', label: 'Inworld TTS 1' }],
  openai: [
    { value: 'tts-1', label: 'TTS-1' },
    { value: 'tts-1-hd', label: 'TTS-1 HD' },
  ],
  azure: [{ value: 'default', label: 'Default' }],
}

const TTS_VOICES: Record<string, Array<{ value: string; label: string }>> = {
  cartesia: [
    { value: '9626c31c-bec5-4cca-baa8-f8ba9e84c8bc', label: 'Jacqueline (Female, EN)' },
    { value: 'a167e0f3-df7e-4d52-a9c3-f949145efdab', label: 'Blake (Male, EN)' },
    { value: 'f31cc6a7-c1e8-4764-980c-60a361443dd1', label: 'Robyn (Female, AU)' },
    { value: '5c5ad5e7-1020-476b-8b91-fdcbe9cc313c', label: 'Daniela (Female, ES)' },
  ],
  elevenlabs: [
    { value: 'cgSgspJ2msm6clMCkdW9', label: 'Jessica (Female, US)' },
    { value: 'Xb7hH8MSUJpSbSDYk0k2', label: 'Alice (Female, UK)' },
    { value: 'iP95p4xoKVk53GoZ742B', label: 'Chris (Male, US)' },
    { value: 'cjVigY5qzO86Huf0OWal', label: 'Eric (Male, MX)' },
  ],
  deepgram: [
    { value: 'apollo', label: 'Apollo (Male)' },
    { value: 'athena', label: 'Athena (Female)' },
    { value: 'odysseus', label: 'Odysseus (Male)' },
    { value: 'theia', label: 'Theia (Female, AU)' },
  ],
  rime: [
    { value: 'astra', label: 'Astra (Female)' },
    { value: 'celeste', label: 'Celeste (Female)' },
    { value: 'luna', label: 'Luna (Female)' },
    { value: 'ursa', label: 'Ursa (Male)' },
  ],
  inworld: [
    { value: 'Ashley', label: 'Ashley (Female)' },
    { value: 'Edward', label: 'Edward (Male)' },
    { value: 'Olivia', label: 'Olivia (Female, UK)' },
    { value: 'Diego', label: 'Diego (Male, MX)' },
  ],
  openai: [
    { value: 'alloy', label: 'Alloy' },
    { value: 'echo', label: 'Echo' },
    { value: 'fable', label: 'Fable' },
    { value: 'onyx', label: 'Onyx' },
    { value: 'nova', label: 'Nova' },
    { value: 'shimmer', label: 'Shimmer' },
  ],
  azure: [{ value: 'default', label: 'Default' }],
}

export function createVoicePanel(kwami: Kwami): HTMLElement {
  const panel = document.createElement('div')
  panel.className = 'panel-inner'
  panel.innerHTML = template

  const $ = <T extends HTMLElement>(sel: string) => panel.querySelector<T>(sel)!

  let pipelineType: 'stt-llm-tts' | 'realtime' = 'stt-llm-tts'

  // Helper to update select options
  function updateSelectOptions(select: HTMLSelectElement, options: Array<{ value: string; label: string }>) {
    select.innerHTML = options.map(opt => 
      `<option value="${opt.value}">${opt.label}</option>`
    ).join('')
  }

  // Update descriptors
  function updateDescriptors() {
    const sttProvider = $<HTMLSelectElement>('#stt-provider').value
    const sttModel = $<HTMLSelectElement>('#stt-model').value
    const sttLang = $<HTMLSelectElement>('#stt-language').value
    $('#stt-descriptor-value').textContent = `${sttProvider}/${sttModel}:${sttLang}`

    const llmProvider = $<HTMLSelectElement>('#llm-provider').value
    const llmModel = $<HTMLSelectElement>('#llm-model').value
    $('#llm-descriptor-value').textContent = `${llmProvider}/${llmModel}`

    const ttsProvider = $<HTMLSelectElement>('#tts-provider').value
    const ttsModel = $<HTMLSelectElement>('#tts-model').value
    const ttsVoice = $<HTMLSelectElement>('#tts-voice').value
    $('#tts-descriptor-value').textContent = `${ttsProvider}/${ttsModel}:${ttsVoice}`
  }

  // Pipeline type toggle
  panel.querySelectorAll('.pipeline-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = (btn as HTMLElement).dataset.type as 'stt-llm-tts' | 'realtime'
      pipelineType = type

      panel.querySelectorAll('.pipeline-type-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')

      // Toggle sections
      $('#stt-section').classList.toggle('hidden', type === 'realtime')
      $('#llm-section').classList.toggle('hidden', type === 'realtime')
      $('#tts-section').classList.toggle('hidden', type === 'realtime')
      $('#realtime-section').classList.toggle('hidden', type !== 'realtime')
    })
  })

  // Preset buttons
  panel.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = (btn as HTMLElement).dataset.preset as VoicePipelinePreset
      
      panel.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')

      // Apply preset
      const config = getVoicePipelinePreset(preset)
      applyConfig(config)
    })
  })

  // Apply config to UI
  function applyConfig(config: Partial<VoicePipelineConfig>) {
    if (config.type === 'realtime') {
      pipelineType = 'realtime'
      panel.querySelectorAll('.pipeline-type-btn').forEach(b => {
        b.classList.toggle('active', (b as HTMLElement).dataset.type === 'realtime')
      })
      $('#stt-section').classList.add('hidden')
      $('#llm-section').classList.add('hidden')
      $('#tts-section').classList.add('hidden')
      $('#realtime-section').classList.remove('hidden')
    } else {
      pipelineType = 'stt-llm-tts'
      panel.querySelectorAll('.pipeline-type-btn').forEach(b => {
        b.classList.toggle('active', (b as HTMLElement).dataset.type === 'stt-llm-tts')
      })
      $('#stt-section').classList.remove('hidden')
      $('#llm-section').classList.remove('hidden')
      $('#tts-section').classList.remove('hidden')
      $('#realtime-section').classList.add('hidden')
    }

    if (config.stt) {
      if (config.stt.provider) {
        $<HTMLSelectElement>('#stt-provider').value = config.stt.provider
        updateSelectOptions($<HTMLSelectElement>('#stt-model'), STT_MODELS[config.stt.provider] || [])
      }
      if (config.stt.model) $<HTMLSelectElement>('#stt-model').value = config.stt.model
      if (config.stt.language) $<HTMLSelectElement>('#stt-language').value = config.stt.language
    }

    if (config.llm) {
      if (config.llm.provider) {
        $<HTMLSelectElement>('#llm-provider').value = config.llm.provider
        updateSelectOptions($<HTMLSelectElement>('#llm-model'), LLM_MODELS[config.llm.provider] || [])
      }
      if (config.llm.model) $<HTMLSelectElement>('#llm-model').value = config.llm.model
      if (config.llm.temperature !== undefined) {
        $<HTMLInputElement>('#llm-temperature').value = String(config.llm.temperature)
        $('#llm-temperature-value').textContent = String(config.llm.temperature)
      }
    }

    if (config.tts) {
      if (config.tts.provider) {
        $<HTMLSelectElement>('#tts-provider').value = config.tts.provider
        updateSelectOptions($<HTMLSelectElement>('#tts-model'), TTS_MODELS[config.tts.provider] || [])
        updateSelectOptions($<HTMLSelectElement>('#tts-voice'), TTS_VOICES[config.tts.provider] || [])
      }
      if (config.tts.model) $<HTMLSelectElement>('#tts-model').value = config.tts.model
      if (config.tts.voice) $<HTMLSelectElement>('#tts-voice').value = config.tts.voice
    }

    updateDescriptors()
  }

  // Provider change handlers
  $<HTMLSelectElement>('#stt-provider').addEventListener('change', (e) => {
    const provider = (e.target as HTMLSelectElement).value
    updateSelectOptions($<HTMLSelectElement>('#stt-model'), STT_MODELS[provider] || [])
    updateDescriptors()
  })

  $<HTMLSelectElement>('#llm-provider').addEventListener('change', (e) => {
    const provider = (e.target as HTMLSelectElement).value
    updateSelectOptions($<HTMLSelectElement>('#llm-model'), LLM_MODELS[provider] || [])
    updateDescriptors()
  })

  $<HTMLSelectElement>('#tts-provider').addEventListener('change', (e) => {
    const provider = (e.target as HTMLSelectElement).value
    updateSelectOptions($<HTMLSelectElement>('#tts-model'), TTS_MODELS[provider] || [])
    updateSelectOptions($<HTMLSelectElement>('#tts-voice'), TTS_VOICES[provider] || [])
    updateDescriptors()
  })

  // Update descriptors on any change
  panel.querySelectorAll('select').forEach(select => {
    select.addEventListener('change', updateDescriptors)
  })

  // Temperature slider
  $<HTMLInputElement>('#llm-temperature').addEventListener('input', (e) => {
    const value = (e.target as HTMLInputElement).value
    $('#llm-temperature-value').textContent = value
  })

  // Voice preview button
  $('#voice-preview-btn').addEventListener('click', () => {
    // TODO: Implement voice preview
    console.log('🔊 Voice preview not yet implemented')
  })

  // Apply button
  $('#apply-voice-config').addEventListener('click', () => {
    const config = buildConfig()
    
    kwami.agent.updateConfig({
      livekit: {
        ...kwami.agent.getConfig().livekit,
        voice: config,
      }
    })

    window.dispatchEvent(new CustomEvent('kwami:voiceConfigChanged', { detail: config }))
    window.dispatchEvent(new CustomEvent('kwami:message', { 
      detail: { role: 'system', content: '✅ Voice configuration applied!' }
    }))
  })

  // Build config from current UI state
  function buildConfig(): VoicePipelineConfig {
    if (pipelineType === 'realtime') {
      return {
        type: 'realtime',
        realtime: {
          provider: $<HTMLSelectElement>('#realtime-provider').value as 'openai' | 'gemini' | 'azure',
          voice: $<HTMLSelectElement>('#realtime-voice').value,
          modalities: [
            ...($<HTMLInputElement>('#realtime-text').checked ? ['text'] : []),
            ...($<HTMLInputElement>('#realtime-audio').checked ? ['audio'] : []),
          ] as ('text' | 'audio')[],
        },
      }
    }

    return {
      type: 'stt-llm-tts',
      stt: {
        provider: $<HTMLSelectElement>('#stt-provider').value as 'deepgram',
        model: $<HTMLSelectElement>('#stt-model').value,
        language: $<HTMLSelectElement>('#stt-language').value as 'en',
        useInference: true,
      },
      llm: {
        provider: $<HTMLSelectElement>('#llm-provider').value as 'openai',
        model: $<HTMLSelectElement>('#llm-model').value,
        temperature: parseFloat($<HTMLInputElement>('#llm-temperature').value),
        useInference: true,
      },
      tts: {
        provider: $<HTMLSelectElement>('#tts-provider').value as 'cartesia',
        model: $<HTMLSelectElement>('#tts-model').value,
        voice: $<HTMLSelectElement>('#tts-voice').value,
        useInference: true,
      },
    }
  }

  // Initialize with balanced preset
  applyConfig(getVoicePipelinePreset('balanced'))

  return panel
}
