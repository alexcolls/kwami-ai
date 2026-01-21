import type { Kwami } from 'kwami-ai'
import template from './sidebar.html?raw'
import './sidebar.css'
import { createAvatarPanel } from '../avatar-panel'
import { createScenePanel } from '../scene-panel'
import { createAudioPanel } from '../audio-panel'
import { createAgentPanel } from '../agent-panel'
import { createPersonaPanel } from '../persona-panel'
import { createMemoryPanel } from '../memory-panel'
import { createToolsPanel } from '../tools-panel'
import { createInfoPanel } from '../info-panel'

export type PanelType = 'avatar' | 'scene' | 'audio' | 'agent' | 'persona' | 'memory' | 'tools' | 'info'

interface KwamiWorkspace {
  id: string
  name: string
  emoji: string
  colors: { x: string; y: string; z: string }
}

interface PanelSystem {
  container: HTMLElement
  switchTo: (panel: PanelType) => void
  toggle: () => void
  isCollapsed: () => boolean
}

// Generate a random Kwami workspace
function generateRandomKwami(): KwamiWorkspace {
  const emojis = ['🌸', '🔮', '✨', '🌊', '🎭', '🌙', '⚡', '🎪', '🌈', '💫', '🦋', '🌺']
  const adjectives = ['Cosmic', 'Mystic', 'Neon', 'Stellar', 'Aurora', 'Crystal', 'Shadow', 'Prism']
  const nouns = ['Spark', 'Wave', 'Pulse', 'Echo', 'Drift', 'Glow', 'Flux', 'Vibe']
  
  const randomColor = () => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')
  
  return {
    id: `kwami_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`,
    emoji: emojis[Math.floor(Math.random() * emojis.length)],
    colors: { x: randomColor(), y: randomColor(), z: randomColor() },
  }
}

export function createPanelSystem(kwami: Kwami): PanelSystem {
  let currentPanel: PanelType = 'avatar'
  let collapsed = false

  // Kwami workspace management
  let workspaces: KwamiWorkspace[] = [generateRandomKwami()]
  let activeWorkspaceId = workspaces[0].id
  let kwamiTrayExpanded = false

  // Create main sidebar container
  const container = document.createElement('div')
  container.className = 'sidebar'
  container.innerHTML = template

  document.body.appendChild(container)

  const contentWrapper = container.querySelector('#panel-content-wrapper')!
  const toggleBtn = container.querySelector('#toggle-btn')!
  
  // Kwami selector elements
  const kwamiSelector = container.querySelector('#kwami-selector')!
  const kwamiActiveBtn = container.querySelector('#kwami-active-btn')!
  const kwamiPreview = container.querySelector<HTMLCanvasElement>('#kwami-preview')!
  const kwamiList = container.querySelector('#kwami-list')!
  const kwamiAddBtn = container.querySelector('#kwami-add-btn')!

  // Initialize Kwami preview canvas
  function updateKwamiPreview(workspace: KwamiWorkspace) {
    const ctx = kwamiPreview.getContext('2d')
    if (!ctx) return
    
    const { x, y, z } = workspace.colors
    const gradient = ctx.createLinearGradient(0, 0, 28, 28)
    gradient.addColorStop(0, x)
    gradient.addColorStop(0.5, y)
    gradient.addColorStop(1, z)
    
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.roundRect(0, 0, 28, 28, 6)
    ctx.fill()
  }

  // Render Kwami list
  function renderKwamiList() {
    const activeWs = workspaces.find(w => w.id === activeWorkspaceId)
    if (activeWs) {
      updateKwamiPreview(activeWs)
    }

    kwamiList.innerHTML = workspaces.map(ws => `
      <button class="kwami-item ${ws.id === activeWorkspaceId ? 'active' : ''}" 
              data-kwami-id="${ws.id}">
        <canvas class="kwami-item-preview" width="28" height="28" data-colors='${JSON.stringify(ws.colors)}'></canvas>
        <div class="kwami-item-info">
          <span class="kwami-item-name">${ws.name}</span>
          <span class="kwami-item-emoji">${ws.emoji}</span>
        </div>
      </button>
    `).join('')

    // Render mini previews for each item
    kwamiList.querySelectorAll<HTMLCanvasElement>('.kwami-item-preview').forEach(canvas => {
      const colors = JSON.parse(canvas.dataset.colors || '{}')
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      
      const gradient = ctx.createLinearGradient(0, 0, 28, 28)
      gradient.addColorStop(0, colors.x)
      gradient.addColorStop(0.5, colors.y)
      gradient.addColorStop(1, colors.z)
      
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.roundRect(0, 0, 28, 28, 6)
      ctx.fill()
    })

    // Wire up click handlers
    kwamiList.querySelectorAll<HTMLButtonElement>('.kwami-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.kwamiId!
        switchKwami(id)
      })
    })
  }

  function switchKwami(id: string) {
    if (id === activeWorkspaceId) {
      toggleKwamiTray()
      return
    }
    
    activeWorkspaceId = id
    const newWs = workspaces.find(w => w.id === id)
    if (newWs) {
      console.log(`🔄 Switched to Kwami: ${newWs.name} ${newWs.emoji}`)
      // TODO: Apply workspace config to kwami instance
    }
    
    renderKwamiList()
    toggleKwamiTray() // Close tray after switching
  }

  function addKwami() {
    const newWs = generateRandomKwami()
    workspaces.push(newWs)
    activeWorkspaceId = newWs.id
    console.log(`✨ Created new Kwami: ${newWs.name} ${newWs.emoji}`)
    renderKwamiList()
  }

  function toggleKwamiTray() {
    kwamiTrayExpanded = !kwamiTrayExpanded
    kwamiSelector.classList.toggle('expanded', kwamiTrayExpanded)
    
    // Collapse/expand the panel when toggling tray
    if (kwamiTrayExpanded) {
      // Collapse panel when opening tray
      if (!collapsed) {
        collapsed = true
        container.classList.add('collapsed')
        document.body.classList.add('sidebar-collapsed')
        const icon = toggleBtn.querySelector('iconify-icon')
        icon?.setAttribute('icon', 'ph:caret-right-bold')
      }
    }
  }

  // Initial render
  renderKwamiList()

  // Wire up Kwami selector
  kwamiActiveBtn.addEventListener('click', toggleKwamiTray)
  kwamiAddBtn.addEventListener('click', addKwami)

  // Close tray when clicking outside
  document.addEventListener('click', (e) => {
    if (kwamiTrayExpanded && !kwamiSelector.contains(e.target as Node)) {
      kwamiTrayExpanded = false
      kwamiSelector.classList.remove('expanded')
    }
  })

  // Create all panels
  const panels: Record<PanelType, HTMLElement> = {
    avatar: createAvatarPanel(kwami.avatar),
    scene: createScenePanel(kwami.avatar),
    audio: createAudioPanel(kwami.avatar),
    agent: createAgentPanel(kwami),
    persona: createPersonaPanel(kwami),
    memory: createMemoryPanel(kwami),
    tools: createToolsPanel(kwami),
    info: createInfoPanel(kwami),
  }

  // Add panels to content area
  Object.entries(panels).forEach(([key, panel]) => {
    panel.dataset.panelType = key
    panel.style.display = key === currentPanel ? 'block' : 'none'
    contentWrapper.appendChild(panel)
  })

  // Wire up panel navigation buttons
  container.querySelectorAll<HTMLButtonElement>('.switcher-btn[data-panel]').forEach(btn => {
    btn.addEventListener('click', () => {
      const panelType = btn.dataset.panel as PanelType
      switchTo(panelType)
    })
  })

  // Toggle button
  toggleBtn.addEventListener('click', toggle)

  function switchTo(panel: PanelType) {
    if (panel === currentPanel && !collapsed) return

    // If collapsed, expand first
    if (collapsed) {
      collapsed = false
      container.classList.remove('collapsed')
      document.body.classList.remove('sidebar-collapsed')
      const icon = toggleBtn.querySelector('iconify-icon')
      icon?.setAttribute('icon', 'ph:caret-left-bold')
    }

    // Update active button
    container.querySelectorAll('.switcher-btn[data-panel]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.panel === panel)
    })

    // Switch panel
    const currentEl = panels[currentPanel]
    const nextEl = panels[panel]

    currentEl.style.display = 'none'
    nextEl.style.display = 'block'

    currentPanel = panel
  }

  function toggle() {
    collapsed = !collapsed
    container.classList.toggle('collapsed', collapsed)
    document.body.classList.toggle('sidebar-collapsed', collapsed)
    
    const icon = toggleBtn.querySelector('iconify-icon')
    icon?.setAttribute('icon', collapsed ? 'ph:caret-right-bold' : 'ph:caret-left-bold')
  }

  function isCollapsed() {
    return collapsed
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if ((e.target as HTMLElement).tagName === 'INPUT' || 
        (e.target as HTMLElement).tagName === 'TEXTAREA') return

    // Number keys 1-8 for panels
    const key = parseInt(e.key)
    if (key >= 1 && key <= 8) {
      const panelTypes: PanelType[] = ['avatar', 'scene', 'audio', 'agent', 'persona', 'memory', 'tools', 'info']
      switchTo(panelTypes[key - 1])
    }
    
    // P to toggle sidebar
    if (e.key === 'p' || e.key === 'P') {
      toggle()
    }
  })

  return {
    container,
    switchTo,
    toggle,
    isCollapsed,
  }
}
