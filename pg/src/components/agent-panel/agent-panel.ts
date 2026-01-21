import type { Kwami } from 'kwami'
import template from './agent-panel.html?raw'
import './agent-panel.css'

export function createAgentPanel(kwami: Kwami): HTMLElement {
  const panel = document.createElement('div')
  panel.className = 'panel-inner'
  panel.innerHTML = template

  const $ = <T extends HTMLElement>(sel: string) => panel.querySelector<T>(sel)!

  let isConnected = false
  let authMode: 'local' | 'endpoint' = 'local'

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

  function updateConnectionUI(connected: boolean) {
    isConnected = connected
    
    const badge = $('#connection-badge')
    const statusIcon = $('#status-icon')
    const statusLabel = $('#status-label')
    const statusDetail = $('#status-detail')
    const connectBtn = $<HTMLButtonElement>('#connect-btn')
    const disconnectBtn = $<HTMLButtonElement>('#disconnect-btn')
    const messageInput = $<HTMLInputElement>('#message-input')
    const sendBtn = $<HTMLButtonElement>('#send-btn')
    const interruptBtn = $<HTMLButtonElement>('#interrupt-btn')

    if (connected) {
      badge.className = 'connection-badge connected'
      badge.innerHTML = '<span class="badge-dot"></span>Connected'
      statusIcon.setAttribute('icon', 'ph:plugs-connected-duotone')
      statusLabel.textContent = 'Connected'
      statusDetail.textContent = 'Voice pipeline active'
      connectBtn.disabled = true
      disconnectBtn.disabled = false
      messageInput.disabled = false
      sendBtn.disabled = false
      interruptBtn.disabled = false
    } else {
      badge.className = 'connection-badge disconnected'
      badge.innerHTML = '<span class="badge-dot"></span>Disconnected'
      statusIcon.setAttribute('icon', 'ph:plug-duotone')
      statusLabel.textContent = 'Not Connected'
      statusDetail.textContent = 'Configure and connect to start'
      connectBtn.disabled = false
      disconnectBtn.disabled = true
      messageInput.disabled = true
      sendBtn.disabled = true
      interruptBtn.disabled = true
    }
  }

  function addMessage(role: 'user' | 'assistant' | 'system', content: string) {
    const log = $('#conversation-log')
    const empty = log.querySelector('.log-empty')
    if (empty) empty.remove()

    const messageEl = document.createElement('div')
    messageEl.className = `log-message ${role}`
    messageEl.innerHTML = `
      <div class="message-avatar">
        <iconify-icon icon="${role === 'user' ? 'ph:user-duotone' : role === 'assistant' ? 'ph:robot-duotone' : 'ph:info-duotone'}"></iconify-icon>
      </div>
      <div class="message-content">
        <span class="message-role">${role === 'user' ? 'You' : role === 'assistant' ? 'Kwami' : 'System'}</span>
        <p>${content}</p>
      </div>
    `
    log.appendChild(messageEl)
    log.scrollTop = log.scrollHeight
  }

  // Connect button
  $('#connect-btn').addEventListener('click', async () => {
    const url = $<HTMLInputElement>('#livekit-url').value.trim()
    const roomName = $<HTMLInputElement>('#room-name').value.trim()
    const userId = $<HTMLInputElement>('#user-id').value.trim()

    if (!url) {
      addMessage('system', '⚠️ Please configure LiveKit Server URL')
      return
    }

    let livekitConfig: Record<string, string | undefined> = { url, roomName }

    if (authMode === 'local') {
      const apiKey = $<HTMLInputElement>('#livekit-api-key').value.trim()
      const apiSecret = $<HTMLInputElement>('#livekit-api-secret').value.trim()
      
      if (!apiKey || !apiSecret) {
        addMessage('system', '⚠️ Please provide API Key and Secret for local development')
        return
      }
      livekitConfig = { ...livekitConfig, apiKey, apiSecret }
    } else {
      const tokenEndpoint = $<HTMLInputElement>('#livekit-token-endpoint').value.trim()
      
      if (!tokenEndpoint) {
        addMessage('system', '⚠️ Please provide Token Endpoint URL')
        return
      }
      livekitConfig = { ...livekitConfig, tokenEndpoint }
    }

    try {
      addMessage('system', '🔄 Connecting to LiveKit...')
      
      kwami.agent.updateConfig({
        livekit: livekitConfig
      })

      await kwami.connect(userId, {
        onUserTranscript: (transcript) => {
          addMessage('user', transcript)
        },
        onAgentResponse: (text) => {
          addMessage('assistant', text)
        },
        onError: (error) => {
          addMessage('system', `❌ Error: ${error.message}`)
        },
      })

      updateConnectionUI(true)
      addMessage('system', '✅ Connected successfully!')
    } catch (error) {
      addMessage('system', `❌ Connection failed: ${(error as Error).message}`)
      updateConnectionUI(false)
    }
  })

  // Disconnect button
  $('#disconnect-btn').addEventListener('click', async () => {
    try {
      await kwami.disconnect()
      updateConnectionUI(false)
      addMessage('system', '🔌 Disconnected')
    } catch (error) {
      addMessage('system', `❌ Disconnect error: ${(error as Error).message}`)
    }
  })

  // Send message
  const sendMessage = () => {
    const input = $<HTMLInputElement>('#message-input')
    const text = input.value.trim()
    if (!text || !isConnected) return

    kwami.sendMessage(text)
    addMessage('user', text)
    input.value = ''
  }

  $('#send-btn').addEventListener('click', sendMessage)
  $('#message-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage()
  })

  // Interrupt button
  $('#interrupt-btn').addEventListener('click', () => {
    kwami.interrupt()
    addMessage('system', '🛑 Interrupted')
  })

  // Clear log button
  $('#clear-log-btn').addEventListener('click', () => {
    const log = $('#conversation-log')
    log.innerHTML = `
      <div class="log-empty">
        <iconify-icon icon="ph:chat-circle-dots-duotone"></iconify-icon>
        <span>No messages yet</span>
      </div>
    `
  })

  // Check initial connection state
  updateConnectionUI(kwami.isConnected())

  return panel
}
