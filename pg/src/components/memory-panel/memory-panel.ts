import type { Kwami, MemoryContext, MemorySearchResult } from 'kwami-ai'
import template from './memory-panel.html?raw'
import './memory-panel.css'

export function createMemoryPanel(kwami: Kwami): HTMLElement {
  const panel = document.createElement('div')
  panel.className = 'panel-inner'
  panel.innerHTML = template

  const $ = <T extends HTMLElement>(sel: string) => panel.querySelector<T>(sel)!

  // Initialize from config
  const config = kwami.memory.getConfig()
  $('#adapter-value').textContent = config.adapter || 'zep'
  if (config.zep?.apiKey) {
    $<HTMLInputElement>('#zep-api-key').value = config.zep.apiKey
  }
  if (config.zep?.baseUrl) {
    $<HTMLInputElement>('#zep-base-url').value = config.zep.baseUrl
  }

  updateInitializedStatus()

  // Refresh context
  async function refreshContext() {
    if (!kwami.memory.isInitialized()) {
      $('#context-display').innerHTML = `
        <div class="context-empty">
          <iconify-icon icon="ph:warning-duotone"></iconify-icon>
          <span>Memory not initialized</span>
          <span class="hint">Connect to the agent first</span>
        </div>
      `
      return
    }

    try {
      const context: MemoryContext = await kwami.getMemoryContext()
      displayContext(context)
    } catch (error) {
      $('#context-display').innerHTML = `
        <div class="context-empty error">
          <iconify-icon icon="ph:x-circle-duotone"></iconify-icon>
          <span>Failed to load context</span>
          <span class="hint">${(error as Error).message}</span>
        </div>
      `
    }
  }

  function displayContext(context: MemoryContext) {
    const container = $('#context-display')
    
    let html = ''

    if (context.summary) {
      html += `
        <div class="context-section">
          <h4><iconify-icon icon="ph:article-duotone"></iconify-icon> Summary</h4>
          <p>${context.summary}</p>
        </div>
      `
    }

    if (context.facts && context.facts.length > 0) {
      html += `
        <div class="context-section">
          <h4><iconify-icon icon="ph:lightbulb-duotone"></iconify-icon> Facts</h4>
          <ul class="facts-list">
            ${context.facts.map(f => `<li>${f}</li>`).join('')}
          </ul>
        </div>
      `
    }

    if (context.entities && context.entities.length > 0) {
      html += `
        <div class="context-section">
          <h4><iconify-icon icon="ph:tag-duotone"></iconify-icon> Entities</h4>
          <div class="entities-list">
            ${context.entities.map(e => `
              <span class="entity-tag">
                <span class="entity-type">${e.type}</span>
                ${e.name}
              </span>
            `).join('')}
          </div>
        </div>
      `
    }

    if (context.recentMessages && context.recentMessages.length > 0) {
      updateMessagesList(context.recentMessages)
    }

    if (!html) {
      html = `
        <div class="context-empty">
          <iconify-icon icon="ph:brain-duotone"></iconify-icon>
          <span>No context available</span>
          <span class="hint">Start a conversation to build memory</span>
        </div>
      `
    }

    container.innerHTML = html
  }

  function updateMessagesList(messages: Array<{ role: string; content: string }>) {
    const container = $('#messages-list')
    
    if (!messages.length) {
      container.innerHTML = `
        <div class="messages-empty">
          <iconify-icon icon="ph:chat-circle-dots-duotone"></iconify-icon>
          <span>No recent messages</span>
        </div>
      `
      return
    }

    container.innerHTML = messages.slice(-5).map(m => `
      <div class="memory-message ${m.role}">
        <iconify-icon icon="${m.role === 'user' ? 'ph:user-duotone' : 'ph:robot-duotone'}"></iconify-icon>
        <span>${m.content.slice(0, 100)}${m.content.length > 100 ? '...' : ''}</span>
      </div>
    `).join('')
  }

  // Search memory
  async function searchMemory() {
    const query = $<HTMLInputElement>('#memory-search').value.trim()
    if (!query) return

    const resultsContainer = $('#search-results')
    resultsContainer.innerHTML = `
      <div class="search-loading">
        <iconify-icon icon="ph:spinner-gap-duotone" class="spin"></iconify-icon>
        Searching...
      </div>
    `

    try {
      const results: MemorySearchResult[] = await kwami.searchMemory(query, 5)
      displaySearchResults(results)
    } catch (error) {
      resultsContainer.innerHTML = `
        <div class="search-error">
          <iconify-icon icon="ph:x-circle-duotone"></iconify-icon>
          Search failed: ${(error as Error).message}
        </div>
      `
    }
  }

  function displaySearchResults(results: MemorySearchResult[]) {
    const container = $('#search-results')

    if (!results.length) {
      container.innerHTML = `
        <div class="search-empty">
          <iconify-icon icon="ph:magnifying-glass-duotone"></iconify-icon>
          <span>No results found</span>
        </div>
      `
      return
    }

    container.innerHTML = results.map(r => `
      <div class="search-result">
        <div class="result-score">${(r.score * 100).toFixed(0)}%</div>
        <div class="result-content">${r.content.slice(0, 150)}${r.content.length > 150 ? '...' : ''}</div>
      </div>
    `).join('')
  }

  function updateInitializedStatus() {
    const initEl = $('#memory-initialized')
    const isInit = kwami.memory.isInitialized()
    initEl.innerHTML = `
      <iconify-icon icon="${isInit ? 'ph:check-circle-duotone' : 'ph:x-circle-duotone'}"></iconify-icon>
      ${isInit ? 'Yes' : 'No'}
    `
  }

  $('#refresh-context-btn').addEventListener('click', refreshContext)
  
  $('#search-btn').addEventListener('click', searchMemory)
  $('#memory-search').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchMemory()
  })

  // Export context
  $('#export-memory-btn').addEventListener('click', async () => {
    try {
      const context = await kwami.getMemoryContext()
      const json = JSON.stringify(context, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'kwami-memory-context.json'
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      alert('Failed to export: ' + (error as Error).message)
    }
  })

  // Clear memory
  $('#clear-memory-btn').addEventListener('click', async () => {
    if (!confirm('⚠️ This will permanently delete all memory for this user. Continue?')) {
      return
    }

    try {
      await kwami.memory.clear()
      refreshContext()
      alert('Memory cleared successfully')
    } catch (error) {
      alert('Failed to clear memory: ' + (error as Error).message)
    }
  })

  // Auto-refresh when memory is initialized
  const checkInitialized = setInterval(() => {
    updateInitializedStatus()
    if (kwami.memory.isInitialized()) {
      refreshContext()
      clearInterval(checkInitialized)
    }
  }, 2000)

  return panel
}
