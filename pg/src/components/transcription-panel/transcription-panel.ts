import type { Kwami } from 'kwami-ai'
import template from './transcription-panel.html?raw'
import './transcription-panel.css'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

export function createTranscriptionPanel(kwami: Kwami): HTMLElement {
  const panel = document.createElement('div')
  panel.className = 'panel-inner'
  panel.innerHTML = template

  const $ = <T extends HTMLElement>(sel: string) => panel.querySelector<T>(sel)!

  let isConnected = false
  let messageCount = 0
  const messages: Message[] = []

  // Format timestamp
  function formatTime(timestamp: number): string {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    })
  }

  // Get icon for role
  function getRoleIcon(role: 'user' | 'assistant' | 'system'): string {
    switch (role) {
      case 'user': return 'ph:user-duotone'
      case 'assistant': return 'ph:robot-duotone'
      case 'system': return 'ph:info-duotone'
    }
  }

  // Get role label
  function getRoleLabel(role: 'user' | 'assistant' | 'system'): string {
    switch (role) {
      case 'user': return 'You'
      case 'assistant': return 'Kwami'
      case 'system': return 'System'
    }
  }

  // Add message to log
  function addMessage(role: 'user' | 'assistant' | 'system', content: string) {
    const timestamp = Date.now()
    messages.push({ role, content, timestamp })
    messageCount++

    const log = $('#conversation-log')
    const empty = $('#log-empty')
    if (empty) empty.remove()

    const messageEl = document.createElement('div')
    messageEl.className = `log-message ${role}`
    messageEl.innerHTML = `
      <div class="message-avatar">
        <iconify-icon icon="${getRoleIcon(role)}"></iconify-icon>
      </div>
      <div class="message-content">
        <div class="message-header">
          <span class="message-role">${getRoleLabel(role)}</span>
          <span class="message-time">${formatTime(timestamp)}</span>
        </div>
        <p class="message-text">${escapeHtml(content)}</p>
      </div>
    `
    log.appendChild(messageEl)
    log.scrollTop = log.scrollHeight

    // Update count
    $('#message-count').textContent = `${messageCount} message${messageCount !== 1 ? 's' : ''}`
  }

  // Escape HTML to prevent XSS
  function escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  // Clear log
  function clearLog() {
    messages.length = 0
    messageCount = 0
    const log = $('#conversation-log')
    log.innerHTML = `
      <div class="log-empty" id="log-empty">
        <iconify-icon icon="ph:chat-circle-dots-duotone"></iconify-icon>
        <span>No messages yet</span>
        <span class="log-hint">Connect and start talking to see transcriptions</span>
      </div>
    `
    $('#message-count').textContent = '0 messages'
  }

  // Update connection state
  function updateConnectionUI(connected: boolean) {
    isConnected = connected
    
    const messageInput = $<HTMLInputElement>('#message-input')
    const sendBtn = $<HTMLButtonElement>('#send-btn')
    const interruptBtn = $<HTMLButtonElement>('#interrupt-btn')

    messageInput.disabled = !connected
    sendBtn.disabled = !connected
    interruptBtn.disabled = !connected
  }

  // Update realtime indicators
  function updateIndicators(state: 'idle' | 'listening' | 'thinking' | 'speaking') {
    const userIndicator = $('#user-indicator')
    const agentIndicator = $('#agent-indicator')

    userIndicator.classList.remove('active')
    agentIndicator.classList.remove('active')

    switch (state) {
      case 'listening':
        userIndicator.classList.add('active')
        break
      case 'thinking':
        // Both indicators inactive during thinking
        break
      case 'speaking':
        agentIndicator.classList.add('active')
        break
    }
  }

  // Update interim transcript
  function updateInterimTranscript(text: string | null) {
    const container = $('#interim-transcript')
    const textEl = $('#interim-text')

    if (text) {
      container.classList.remove('hidden')
      textEl.textContent = text
    } else {
      container.classList.add('hidden')
      textEl.textContent = ''
    }
  }

  // Send message
  function sendMessage() {
    const input = $<HTMLInputElement>('#message-input')
    const text = input.value.trim()
    if (!text || !isConnected) return

    kwami.sendMessage(text)
    addMessage('user', text)
    input.value = ''
  }

  // Wire up send button
  $('#send-btn').addEventListener('click', sendMessage)
  $('#message-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage()
  })

  // Wire up interrupt button
  $('#interrupt-btn').addEventListener('click', () => {
    kwami.interrupt()
    addMessage('system', '🛑 Interrupted')
    updateIndicators('listening')
  })

  // Wire up clear button
  $('#clear-log-btn').addEventListener('click', clearLog)

  // Listen for global events
  window.addEventListener('kwami:message', ((e: CustomEvent) => {
    const { role, content } = e.detail as { role: 'user' | 'assistant' | 'system'; content: string }
    addMessage(role, content)

    // Update indicators based on role
    if (role === 'user') {
      updateIndicators('thinking')
      updateInterimTranscript(null)
    } else if (role === 'assistant') {
      updateIndicators('listening')
    }
  }) as EventListener)

  window.addEventListener('kwami:connected', () => {
    updateConnectionUI(true)
    updateIndicators('listening')
  })

  window.addEventListener('kwami:disconnected', () => {
    updateConnectionUI(false)
    updateIndicators('idle')
    updateInterimTranscript(null)
  })

  window.addEventListener('kwami:stateChanged', ((e: CustomEvent) => {
    const state = e.detail as 'idle' | 'listening' | 'thinking' | 'speaking'
    updateIndicators(state)
  }) as EventListener)

  window.addEventListener('kwami:interim', ((e: CustomEvent) => {
    const text = e.detail as string
    updateInterimTranscript(text)
  }) as EventListener)

  // Keyboard shortcut for interrupt
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isConnected) {
      kwami.interrupt()
      addMessage('system', '🛑 Interrupted (Esc)')
      updateIndicators('listening')
    }
  })

  // Initialize
  updateConnectionUI(kwami.isConnected())

  return panel
}
