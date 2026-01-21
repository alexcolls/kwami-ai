import type { Kwami, VoiceEnhancementsConfig, VADConfig } from 'kwami-ai'
import template from './enhancements-panel.html?raw'
import './enhancements-panel.css'

export function createEnhancementsPanel(kwami: Kwami): HTMLElement {
  const panel = document.createElement('div')
  panel.className = 'panel-inner'
  panel.innerHTML = template

  const $ = <T extends HTMLElement>(sel: string) => panel.querySelector<T>(sel)!

  // Wire up all slider values
  const sliders = [
    { input: '#min-endpointing-delay', value: '#min-endpointing-delay-value' },
    { input: '#max-endpointing-delay', value: '#max-endpointing-delay-value' },
    { input: '#min-interruption-duration', value: '#min-interruption-duration-value' },
    { input: '#min-interruption-words', value: '#min-interruption-words-value' },
    { input: '#vad-threshold', value: '#vad-threshold-value' },
    { input: '#vad-min-speech', value: '#vad-min-speech-value' },
    { input: '#vad-min-silence', value: '#vad-min-silence-value' },
  ]

  sliders.forEach(({ input, value }) => {
    $<HTMLInputElement>(input).addEventListener('input', (e) => {
      $(value).textContent = (e.target as HTMLInputElement).value
    })
  })

  // Toggle dependent options visibility
  function updateTurnDetectionOptions() {
    const enabled = $<HTMLInputElement>('#turn-detection-enabled').checked
    const mode = $<HTMLSelectElement>('#turn-detection-mode').value
    
    const options = $('#turn-detection-options')
    options.classList.toggle('disabled', !enabled)
    
    // Show model type only when using model detection
    $('#turn-model-group').style.display = mode === 'model' ? 'block' : 'none'
  }

  function updateInterruptionOptions() {
    const enabled = $<HTMLInputElement>('#allow-interruptions').checked
    $('#interruption-options').classList.toggle('disabled', !enabled)
  }

  function updateNoiseCancellationOptions() {
    const enabled = $<HTMLInputElement>('#noise-cancellation-enabled').checked
    $('#noise-cancellation-options').classList.toggle('disabled', !enabled)
  }

  // Wire up toggles
  $<HTMLInputElement>('#turn-detection-enabled').addEventListener('change', updateTurnDetectionOptions)
  $<HTMLSelectElement>('#turn-detection-mode').addEventListener('change', updateTurnDetectionOptions)
  $<HTMLInputElement>('#allow-interruptions').addEventListener('change', updateInterruptionOptions)
  $<HTMLInputElement>('#noise-cancellation-enabled').addEventListener('change', updateNoiseCancellationOptions)

  // Initialize state
  updateTurnDetectionOptions()
  updateInterruptionOptions()
  updateNoiseCancellationOptions()

  // Apply button
  $('#apply-enhancements').addEventListener('click', () => {
    const config = buildConfig()
    const vadConfig = buildVADConfig()
    
    const currentConfig = kwami.agent.getConfig()
    kwami.agent.updateConfig({
      livekit: {
        ...currentConfig.livekit,
        voice: {
          ...currentConfig.livekit?.voice,
          enhancements: config,
          vad: vadConfig,
        },
      }
    })

    window.dispatchEvent(new CustomEvent('kwami:enhancementsChanged', { 
      detail: { enhancements: config, vad: vadConfig }
    }))
    window.dispatchEvent(new CustomEvent('kwami:message', { 
      detail: { role: 'system', content: '✅ Voice enhancements applied!' }
    }))
  })

  function buildConfig(): VoiceEnhancementsConfig {
    return {
      turnDetection: {
        enabled: $<HTMLInputElement>('#turn-detection-enabled').checked,
        mode: $<HTMLSelectElement>('#turn-detection-mode').value as 'vad' | 'stt' | 'model' | 'manual',
        model: $<HTMLSelectElement>('#turn-detection-model').value as 'english' | 'multilingual',
        minEndpointingDelay: parseFloat($<HTMLInputElement>('#min-endpointing-delay').value),
        maxEndpointingDelay: parseFloat($<HTMLInputElement>('#max-endpointing-delay').value),
        allowInterruptions: $<HTMLInputElement>('#allow-interruptions').checked,
        minInterruptionDuration: parseFloat($<HTMLInputElement>('#min-interruption-duration').value),
        minInterruptionWords: parseInt($<HTMLInputElement>('#min-interruption-words').value),
      },
      noiseCancellation: {
        enabled: $<HTMLInputElement>('#noise-cancellation-enabled').checked,
        mode: $<HTMLSelectElement>('#noise-cancellation-mode').value as 'bvc' | 'krisp' | 'default',
      },
      echoCancellation: $<HTMLInputElement>('#echo-cancellation').checked,
      autoGainControl: $<HTMLInputElement>('#auto-gain-control').checked,
      preemptiveGeneration: $<HTMLInputElement>('#preemptive-generation').checked,
    }
  }

  function buildVADConfig(): VADConfig {
    return {
      provider: $<HTMLSelectElement>('#vad-provider').value as 'silero',
      threshold: parseFloat($<HTMLInputElement>('#vad-threshold').value),
      minSpeechDuration: parseFloat($<HTMLInputElement>('#vad-min-speech').value),
      minSilenceDuration: parseFloat($<HTMLInputElement>('#vad-min-silence').value),
    }
  }

  return panel
}
