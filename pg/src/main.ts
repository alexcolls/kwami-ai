import 'iconify-icon'
import './styles/global.css'
import './styles/shared.css'
import { Kwami } from 'kwami-ai'
import { createPanelSystem } from './components/sidebar'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div id="kwami-root">
    <canvas id="kwami-canvas"></canvas>
  </div>
`

const canvas = document.querySelector<HTMLCanvasElement>('#kwami-canvas')!

// Create the full Kwami instance (Avatar + Agent + Persona + Memory + Tools)
const kwami = new Kwami(canvas, {
  avatar: {
    renderer: 'blob',
    blob: {
      colors: { x: '#ff0066', y: '#00ff66', z: '#6600ff' },
      spikes: { x: 0.3, y: 0.3, z: 0.3 },
      rotation: { x: 0.002, y: 0.003, z: 0.001 },
    },
    scene: {
      background: {
        type: 'gradient',
        gradient: {
          colors: ['#0a0a1a', '#1a1a3a', '#0a0a1a'],
          direction: 'radial',
        },
      },
    },
  },
  agent: {
    adapter: 'livekit',
    livekit: {
      // Configure these for your LiveKit server
      url: import.meta.env.VITE_LIVEKIT_URL || '',
      // For local dev (API key + secret)
      apiKey: import.meta.env.VITE_LIVEKIT_API_KEY || '',
      apiSecret: import.meta.env.VITE_LIVEKIT_API_SECRET || '',
      // OR for production (token endpoint)
      tokenEndpoint: import.meta.env.VITE_LIVEKIT_TOKEN_ENDPOINT || '',
    },
  },
  persona: {
    name: 'Kwami',
    personality: 'A friendly and helpful AI companion',
    traits: ['friendly', 'helpful', 'curious'],
    conversationStyle: 'friendly',
    responseLength: 'medium',
    emotionalTone: 'warm',
  },
  memory: {
    adapter: 'zep',
    zep: {
      apiKey: import.meta.env.VITE_ZEP_API_KEY || '',
      baseUrl: import.meta.env.VITE_ZEP_BASE_URL || '',
    },
  },
})

// Make kwami available globally for console testing
declare global {
  interface Window {
    kwami: Kwami
  }
}
window.kwami = kwami

// Create and mount the panel system
createPanelSystem(kwami)

// Keyboard shortcuts for avatar state (panel shortcuts are in sidebar.ts)
document.addEventListener('keydown', (e) => {
  // Ignore if typing in an input
  if ((e.target as HTMLElement).tagName === 'INPUT' || 
      (e.target as HTMLElement).tagName === 'TEXTAREA') return
  
  if (e.key === 'r') {
    kwami.avatar.randomize()
    window.dispatchEvent(new CustomEvent('kwami:randomized'))
    console.log('🎲 Randomized!')
  }
  if (e.key === 'l') {
    kwami.setState('listening')
    window.dispatchEvent(new CustomEvent('kwami:stateChanged', { detail: 'listening' }))
    console.log('🎤 Listening mode')
  }
  if (e.key === 't') {
    kwami.setState('thinking')
    window.dispatchEvent(new CustomEvent('kwami:stateChanged', { detail: 'thinking' }))
    console.log('🤔 Thinking mode')
  }
  if (e.key === 'i') {
    kwami.setState('idle')
    window.dispatchEvent(new CustomEvent('kwami:stateChanged', { detail: 'idle' }))
    console.log('😴 Idle mode')
  }
})

console.log('🎮 Kwami Playground')
console.log('Shortcuts: R=randomize, L=listening, T=thinking, I=idle, P=toggle panel')
console.log('Panel shortcuts: 1-8 for different panels')
console.log('Access kwami via window.kwami in console')
