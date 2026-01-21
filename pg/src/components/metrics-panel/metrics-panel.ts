import type { Kwami, VoicePipelineMetrics, VoicePipelineConfig } from 'kwami-ai'
import template from './metrics-panel.html?raw'
import './metrics-panel.css'

export function createMetricsPanel(kwami: Kwami): HTMLElement {
  const panel = document.createElement('div')
  panel.className = 'panel-inner'
  panel.innerHTML = template

  const $ = <T extends HTMLElement>(sel: string) => panel.querySelector<T>(sel)!

  // Latency history for chart
  const latencyHistory: number[] = []
  const MAX_HISTORY = 10

  // Format milliseconds
  function formatMs(ms: number | undefined): string {
    if (ms === undefined || ms === null) return '—'
    return `${Math.round(ms)}MS`
  }

  // Format seconds
  function formatSeconds(ms: number): string {
    const secs = Math.floor(ms / 1000)
    if (secs < 60) return `${secs}s`
    const mins = Math.floor(secs / 60)
    return `${mins}m ${secs % 60}s`
  }

  // Update configuration display
  function updateConfigDisplay(config?: VoicePipelineConfig) {
    if (!config) {
      config = kwami.agent.getConfig().livekit?.voice
    }

    // STT
    const stt = config?.stt
    $('#config-stt-provider').textContent = stt?.provider?.toUpperCase() || 'DEEPGRAM'
    $('#config-stt-model').textContent = stt?.model?.toUpperCase() || 'NOVA-3'

    // LLM
    const llm = config?.llm
    $('#config-llm-provider').textContent = llm?.provider?.toUpperCase() || 'OPENAI'
    $('#config-llm-model').textContent = llm?.model?.toUpperCase() || 'GPT-4.1-MINI'

    // TTS
    const tts = config?.tts
    $('#config-tts-provider').textContent = tts?.provider?.toUpperCase() || 'CARTESIA'
    $('#config-tts-model').textContent = tts?.model?.toUpperCase() || 'SONIC-3'
    $('#config-tts-voice').textContent = tts?.voice?.substring(0, 8) || '—'

    // VAD
    const vad = config?.vad
    $('#config-vad').textContent = vad?.provider?.toUpperCase() || 'SILERO'

    // Enhancements
    const enhancements = config?.enhancements
    const turnEl = $('#config-turn-detection')
    const turnEnabled = enhancements?.turnDetection?.enabled ?? true
    turnEl.textContent = turnEnabled ? 'TRUE' : 'FALSE'
    turnEl.className = `config-value boolean ${turnEnabled ? 'true' : 'false'}`

    const noiseEl = $('#config-noise-cancellation')
    const noiseEnabled = enhancements?.noiseCancellation?.enabled ?? true
    noiseEl.textContent = noiseEnabled ? 'TRUE' : 'FALSE'
    noiseEl.className = `config-value boolean ${noiseEnabled ? 'true' : 'false'}`
  }

  // Update latency display
  function updateLatencyDisplay(metrics: VoicePipelineMetrics) {
    const latency = metrics.latency
    
    $('#latency-stt').textContent = formatMs(latency.stt)
    $('#latency-eot').textContent = formatMs(latency.endOfTurn)
    $('#latency-llm').textContent = formatMs(latency.llm)
    $('#latency-tts').textContent = formatMs(latency.tts)
    $('#latency-overall').textContent = formatMs(latency.overall)

    // Update chart
    if (latency.overall !== undefined) {
      latencyHistory.push(latency.overall)
      if (latencyHistory.length > MAX_HISTORY) {
        latencyHistory.shift()
      }
      updateChart()
    }
  }

  // Update session stats
  function updateSessionStats(metrics: VoicePipelineMetrics) {
    $('#stat-turns').textContent = String(metrics.turnsCompleted)
    $('#stat-interruptions').textContent = String(metrics.interruptions)
    $('#stat-agent-time').textContent = formatSeconds(metrics.agentSpeakingTime)
    $('#stat-user-time').textContent = formatSeconds(metrics.userSpeakingTime)
  }

  // Update chart visualization
  function updateChart() {
    const chartEmpty = $('#chart-empty')
    const bars = panel.querySelectorAll<HTMLElement>('.chart-bar')
    
    if (latencyHistory.length === 0) {
      chartEmpty.classList.remove('hidden')
      return
    }
    
    chartEmpty.classList.add('hidden')
    
    // Find max for scaling
    const maxLatency = Math.max(...latencyHistory, 2000) // At least 2000ms scale
    
    bars.forEach((bar, i) => {
      const value = latencyHistory[latencyHistory.length - MAX_HISTORY + i] || 0
      const height = (value / maxLatency) * 100
      bar.style.height = `${Math.max(height, 4)}%`
    })
  }

  // Update status indicator
  function updateStatus(connected: boolean) {
    const status = $('#metrics-status')
    if (connected) {
      status.classList.add('active')
      status.innerHTML = '<span class="pulse-dot"></span>Live'
    } else {
      status.classList.remove('active')
      status.innerHTML = '<span class="pulse-dot"></span>Waiting'
    }
  }

  // Reset metrics
  function resetMetrics() {
    latencyHistory.length = 0
    
    $('#latency-stt').textContent = '—'
    $('#latency-eot').textContent = '—'
    $('#latency-llm').textContent = '—'
    $('#latency-tts').textContent = '—'
    $('#latency-overall').textContent = '—'
    
    $('#stat-turns').textContent = '0'
    $('#stat-interruptions').textContent = '0'
    $('#stat-agent-time').textContent = '0s'
    $('#stat-user-time').textContent = '0s'
    
    updateChart()
  }

  // Export metrics
  function exportMetrics() {
    const config = kwami.agent.getConfig().livekit?.voice
    const data = {
      timestamp: new Date().toISOString(),
      configuration: {
        vad: config?.vad?.provider,
        stt: { provider: config?.stt?.provider, model: config?.stt?.model },
        llm: { provider: config?.llm?.provider, model: config?.llm?.model },
        tts: { provider: config?.tts?.provider, model: config?.tts?.model },
      },
      enhancements: {
        turnDetection: config?.enhancements?.turnDetection?.enabled,
        noiseCancellation: config?.enhancements?.noiseCancellation?.enabled,
      },
      latencyHistory,
      stats: {
        turns: $('#stat-turns').textContent,
        interruptions: $('#stat-interruptions').textContent,
      }
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kwami-metrics-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Wire up buttons
  $('#reset-metrics-btn').addEventListener('click', resetMetrics)
  $('#export-metrics-btn').addEventListener('click', exportMetrics)

  // Listen for events
  window.addEventListener('kwami:connected', () => {
    updateStatus(true)
    resetMetrics()
  })

  window.addEventListener('kwami:disconnected', () => {
    updateStatus(false)
  })

  window.addEventListener('kwami:voiceConfigChanged', ((e: CustomEvent) => {
    updateConfigDisplay(e.detail as VoicePipelineConfig)
  }) as EventListener)

  window.addEventListener('kwami:enhancementsChanged', ((_e: CustomEvent) => {
    const config = kwami.agent.getConfig().livekit?.voice
    updateConfigDisplay(config)
  }) as EventListener)

  window.addEventListener('kwami:metrics', ((e: CustomEvent) => {
    const metrics = e.detail as VoicePipelineMetrics
    updateLatencyDisplay(metrics)
    updateSessionStats(metrics)
  }) as EventListener)

  // Initialize display
  updateConfigDisplay()
  updateStatus(kwami.isConnected())

  // Demo: simulate some latency updates for development
  // This would normally come from the actual voice session
  if (import.meta.env.DEV) {
    // Uncomment for demo:
    // setInterval(() => {
    //   const fakeMetrics: VoicePipelineMetrics = {
    //     latency: {
    //       stt: 200 + Math.random() * 100,
    //       endOfTurn: 300 + Math.random() * 100,
    //       llm: 800 + Math.random() * 200,
    //       tts: 150 + Math.random() * 100,
    //       overall: 1500 + Math.random() * 500,
    //     },
    //     turnsCompleted: Math.floor(Math.random() * 10),
    //     interruptions: Math.floor(Math.random() * 3),
    //     agentSpeakingTime: Math.random() * 60000,
    //     userSpeakingTime: Math.random() * 30000,
    //     sessionStart: Date.now() - 60000,
    //   }
    //   window.dispatchEvent(new CustomEvent('kwami:metrics', { detail: fakeMetrics }))
    // }, 3000)
  }

  return panel
}
