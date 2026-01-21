import type { Kwami } from 'kwami-ai'
import template from './agent-panel.html?raw'
import './agent-panel.css'

export function createAgentPanel(kwami: Kwami): HTMLElement {
  const panel = document.createElement('div')
  panel.className = 'panel-inner'
  panel.innerHTML = template

  const $ = <T extends HTMLElement>(sel: string) => panel.querySelector<T>(sel)!

  let authMode: 'local' | 'endpoint' = 'local'
  let sessionStartTime: number | null = null
  let durationInterval: ReturnType<typeof setInterval> | null = null

  // Initialize from config
  const config = kwami.agent.getConfig()
  if (config.livekit?.url) {
    $<HTMLInputElement>('#livekit-url').value = config.livekit.url
  }
  if (config.livekit?.apiKey) {
    $<HTMLInputElement>('#livekit-api-key').value = config.livekit.apiKey
  }
  if (config.livekit?.apiSecret) {
    $<HTMLInputElement>('#livekit-api-secret').value = config.livekit.apiSecret
  }
  if (config.livekit?.tokenEndpoint) {
    $<HTMLInputElement>('#livekit-token-endpoint').value = config.livekit.tokenEndpoint
  }

  // Auth mode tabs
  panel.querySelectorAll('.auth-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const mode = (tab as HTMLElement).dataset.mode as 'local' | 'endpoint'
      authMode = mode

      panel.querySelectorAll('.auth-tab').forEach((t) => t.classList.remove('active'))
      tab.classList.add('active')

      $('#auth-local').classList.toggle('hidden', mode !== 'local')
      $('#auth-endpoint').classList.toggle('hidden', mode !== 'endpoint')
    })
  })

  function updateConnectionUI(connected: boolean, roomName?: string, userId?: string) {
    const badge = $('#connection-badge')
    const statusIcon = $('#status-icon')
    const statusLabel = $('#status-label')
    const statusDetail = $('#status-detail')
    const connectBtn = $<HTMLButtonElement>('#connect-btn')
    const disconnectBtn = $<HTMLButtonElement>('#disconnect-btn')
    const sessionSection = $('#session-info-section')

    if (connected) {
      badge.className = 'connection-badge connected'
      badge.innerHTML = '<span class="badge-dot"></span>Connected'
      statusIcon.setAttribute('icon', 'ph:plugs-connected-duotone')
      statusLabel.textContent = 'Connected'
      statusDetail.textContent = 'Voice pipeline active'
      connectBtn.disabled = true
      disconnectBtn.disabled = false
      
      // Show session info
      sessionSection.style.display = 'block'
      $('#session-room').textContent = roomName || '-'
      $('#session-user').textContent = userId || '-'
      
      // Start duration timer
      sessionStartTime = Date.now()
      durationInterval = setInterval(updateDuration, 1000)
      
      // Emit connection event
      window.dispatchEvent(new CustomEvent('kwami:connected', { 
        detail: { roomName, userId } 
      }))
    } else {
      badge.className = 'connection-badge disconnected'
      badge.innerHTML = '<span class="badge-dot"></span>Disconnected'
      statusIcon.setAttribute('icon', 'ph:plug-duotone')
      statusLabel.textContent = 'Not Connected'
      statusDetail.textContent = 'Configure and connect to start'
      connectBtn.disabled = false
      disconnectBtn.disabled = true
      
      // Hide session info
      sessionSection.style.display = 'none'
      
      // Stop duration timer
      if (durationInterval) {
        clearInterval(durationInterval)
        durationInterval = null
      }
      sessionStartTime = null
      
      // Emit disconnection event
      window.dispatchEvent(new CustomEvent('kwami:disconnected'))
    }
  }

  function updateDuration() {
    if (!sessionStartTime) return
    const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000)
    const mins = Math.floor(elapsed / 60)
    const secs = elapsed % 60
    $('#session-duration').textContent = `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Connect button
  $('#connect-btn').addEventListener('click', async () => {
    const url = $<HTMLInputElement>('#livekit-url').value.trim()
    const roomName = $<HTMLInputElement>('#room-name').value.trim()
    const userId = $<HTMLInputElement>('#user-id').value.trim()

    if (!url) {
      window.dispatchEvent(new CustomEvent('kwami:message', { 
        detail: { role: 'system', content: '⚠️ Please configure LiveKit Server URL' }
      }))
      return
    }

    let livekitConfig: Record<string, string | undefined> = { url, roomName }

    if (authMode === 'local') {
      const apiKey = $<HTMLInputElement>('#livekit-api-key').value.trim()
      const apiSecret = $<HTMLInputElement>('#livekit-api-secret').value.trim()
      
      if (!apiKey || !apiSecret) {
        window.dispatchEvent(new CustomEvent('kwami:message', { 
          detail: { role: 'system', content: '⚠️ Please provide API Key and Secret for local development' }
        }))
        return
      }
      livekitConfig = { ...livekitConfig, apiKey, apiSecret }
    } else {
      const tokenEndpoint = $<HTMLInputElement>('#livekit-token-endpoint').value.trim()
      
      if (!tokenEndpoint) {
        window.dispatchEvent(new CustomEvent('kwami:message', { 
          detail: { role: 'system', content: '⚠️ Please provide Token Endpoint URL' }
        }))
        return
      }
      livekitConfig = { ...livekitConfig, tokenEndpoint }
    }

    try {
      window.dispatchEvent(new CustomEvent('kwami:message', { 
        detail: { role: 'system', content: '🔄 Connecting to LiveKit...' }
      }))
      
      kwami.agent.updateConfig({
        livekit: livekitConfig
      })

      await kwami.connect(userId, {
        onUserTranscript: (transcript) => {
          window.dispatchEvent(new CustomEvent('kwami:message', { 
            detail: { role: 'user', content: transcript }
          }))
        },
        onAgentResponse: (text) => {
          window.dispatchEvent(new CustomEvent('kwami:message', { 
            detail: { role: 'assistant', content: text }
          }))
        },
        onError: (error) => {
          window.dispatchEvent(new CustomEvent('kwami:message', { 
            detail: { role: 'system', content: `❌ Error: ${error.message}` }
          }))
        },
      })

      updateConnectionUI(true, roomName, userId)
      window.dispatchEvent(new CustomEvent('kwami:message', { 
        detail: { role: 'system', content: '✅ Connected successfully!' }
      }))
    } catch (error) {
      window.dispatchEvent(new CustomEvent('kwami:message', { 
        detail: { role: 'system', content: `❌ Connection failed: ${(error as Error).message}` }
      }))
      updateConnectionUI(false)
    }
  })

  // Disconnect button
  $('#disconnect-btn').addEventListener('click', async () => {
    try {
      await kwami.disconnect()
      updateConnectionUI(false)
      window.dispatchEvent(new CustomEvent('kwami:message', { 
        detail: { role: 'system', content: '🔌 Disconnected' }
      }))
    } catch (error) {
      window.dispatchEvent(new CustomEvent('kwami:message', { 
        detail: { role: 'system', content: `❌ Disconnect error: ${(error as Error).message}` }
      }))
    }
  })

  // Check initial connection state
  updateConnectionUI(kwami.isConnected())

  return panel
}
