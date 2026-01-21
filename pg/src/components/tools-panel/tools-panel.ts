import type { Kwami, ToolDefinition } from 'kwami'
import template from './tools-panel.html?raw'
import './tools-panel.css'

export function createToolsPanel(kwami: Kwami): HTMLElement {
  const panel = document.createElement('div')
  panel.className = 'panel-inner'
  panel.innerHTML = template

  const $ = <T extends HTMLElement>(sel: string) => panel.querySelector<T>(sel)!
  const $$ = <T extends HTMLElement>(sel: string) => panel.querySelectorAll<T>(sel)

  function renderToolsList(tools: ToolDefinition[]): string {
    if (!tools.length) {
      return `
        <div class="tools-empty">
          <iconify-icon icon="ph:toolbox-duotone"></iconify-icon>
          <span>No tools registered</span>
        </div>
      `
    }

    return tools.map(t => `
      <div class="tool-card">
        <div class="tool-header">
          <iconify-icon icon="ph:function-duotone"></iconify-icon>
          <span class="tool-name">${t.name}</span>
          <button class="tool-remove" data-tool="${t.name}" title="Remove tool">
            <iconify-icon icon="ph:x-duotone"></iconify-icon>
          </button>
        </div>
        <p class="tool-description">${t.description}</p>
        ${t.parameters ? `
          <details class="tool-params">
            <summary>Parameters</summary>
            <pre>${JSON.stringify(t.parameters, null, 2)}</pre>
          </details>
        ` : ''}
      </div>
    `).join('')
  }

  // Refresh tools list
  function refreshTools() {
    const tools = kwami.tools.getAll()
    $('#tools-list').innerHTML = renderToolsList(tools)
    
    // Update exec dropdown
    const select = $<HTMLSelectElement>('#exec-tool-name')
    select.innerHTML = `
      <option value="">Select a tool...</option>
      ${tools.map(t => `<option value="${t.name}">${t.name}</option>`).join('')}
    `

    // Attach remove handlers
    $$<HTMLButtonElement>('.tool-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const toolName = btn.dataset.tool!
        if (confirm(`Remove tool "${toolName}"?`)) {
          kwami.tools.unregister(toolName)
          refreshTools()
        }
      })
    })
  }

  // Initial render
  refreshTools()

  $('#refresh-tools-btn').addEventListener('click', refreshTools)

  // Add custom tool
  $('#add-tool-btn').addEventListener('click', () => {
    const name = $<HTMLInputElement>('#tool-name').value.trim()
    const description = $<HTMLTextAreaElement>('#tool-description').value.trim()
    const paramsStr = $<HTMLTextAreaElement>('#tool-parameters').value.trim()

    if (!name || !description) {
      alert('Name and description are required')
      return
    }

    let parameters: Record<string, unknown> | undefined
    if (paramsStr) {
      try {
        parameters = JSON.parse(paramsStr)
      } catch {
        alert('Invalid JSON in parameters')
        return
      }
    }

    kwami.tools.register({
      name,
      description,
      parameters,
      handler: async (params) => {
        console.log(`Tool ${name} called with:`, params)
        return { success: true, message: `Tool ${name} executed (mock)` }
      },
    })

    // Clear form
    $<HTMLInputElement>('#tool-name').value = ''
    $<HTMLTextAreaElement>('#tool-description').value = ''
    $<HTMLTextAreaElement>('#tool-parameters').value = ''

    refreshTools()
  })

  // Connect MCP
  $('#connect-mcp-btn').addEventListener('click', async () => {
    const name = $<HTMLInputElement>('#mcp-name').value.trim()
    const url = $<HTMLInputElement>('#mcp-url').value.trim()
    const apiKey = $<HTMLInputElement>('#mcp-api-key').value.trim()

    if (!name || !url) {
      alert('Name and URL are required')
      return
    }

    try {
      await kwami.tools.connectMCP({ name, url, apiKey: apiKey || undefined })
      
      // Update MCP list
      const mcpList = $('#mcp-list')
      const emptyEl = mcpList.querySelector('.mcp-empty')
      if (emptyEl) emptyEl.remove()

      const mcpCard = document.createElement('div')
      mcpCard.className = 'mcp-card'
      mcpCard.innerHTML = `
        <div class="mcp-header">
          <iconify-icon icon="ph:plugs-connected-duotone"></iconify-icon>
          <span class="mcp-name">${name}</span>
          <span class="mcp-status connected">Connected</span>
        </div>
        <span class="mcp-url">${url}</span>
        <button class="action-btn small" data-mcp="${name}">
          <iconify-icon icon="ph:plug-duotone"></iconify-icon>
          Disconnect
        </button>
      `
      mcpList.appendChild(mcpCard)

      // Refresh tools to show MCP tools
      refreshTools()

      // Clear form
      $<HTMLInputElement>('#mcp-name').value = ''
      $<HTMLInputElement>('#mcp-url').value = ''
      $<HTMLInputElement>('#mcp-api-key').value = ''
    } catch (error) {
      alert('Failed to connect: ' + (error as Error).message)
    }
  })

  // Execute tool
  $('#exec-tool-btn').addEventListener('click', async () => {
    const toolName = $<HTMLSelectElement>('#exec-tool-name').value
    const paramsStr = $<HTMLTextAreaElement>('#exec-params').value.trim()
    const resultEl = $('#exec-result')

    if (!toolName) {
      alert('Select a tool first')
      return
    }

    let params: Record<string, unknown> = {}
    if (paramsStr) {
      try {
        params = JSON.parse(paramsStr)
      } catch {
        alert('Invalid JSON in parameters')
        return
      }
    }

    resultEl.innerHTML = `
      <div class="exec-loading">
        <iconify-icon icon="ph:spinner-gap-duotone" class="spin"></iconify-icon>
        Executing...
      </div>
    `

    try {
      const result = await kwami.executeTool(toolName, params)
      resultEl.innerHTML = `
        <div class="exec-success">
          <iconify-icon icon="ph:check-circle-duotone"></iconify-icon>
          <pre>${JSON.stringify(result, null, 2)}</pre>
        </div>
      `
    } catch (error) {
      resultEl.innerHTML = `
        <div class="exec-error">
          <iconify-icon icon="ph:x-circle-duotone"></iconify-icon>
          ${(error as Error).message}
        </div>
      `
    }
  })

  // Quick templates
  const templates: Record<string, { name: string; description: string; parameters: Record<string, unknown> }> = {
    weather: {
      name: 'get_weather',
      description: 'Get current weather for a location',
      parameters: {
        location: { type: 'string', description: 'City name or coordinates' },
        units: { type: 'string', enum: ['metric', 'imperial'], description: 'Temperature units' },
      },
    },
    search: {
      name: 'web_search',
      description: 'Search the web for information',
      parameters: {
        query: { type: 'string', description: 'Search query' },
        limit: { type: 'number', description: 'Max results to return' },
      },
    },
    calculator: {
      name: 'calculate',
      description: 'Perform mathematical calculations',
      parameters: {
        expression: { type: 'string', description: 'Math expression to evaluate' },
      },
    },
    datetime: {
      name: 'get_datetime',
      description: 'Get current date and time',
      parameters: {
        timezone: { type: 'string', description: 'Timezone (e.g., "America/New_York")' },
        format: { type: 'string', description: 'Output format' },
      },
    },
  }

  $$<HTMLButtonElement>('.template-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const templateName = btn.dataset.template!
      const tmpl = templates[templateName]
      if (tmpl) {
        $<HTMLInputElement>('#tool-name').value = tmpl.name
        $<HTMLTextAreaElement>('#tool-description').value = tmpl.description
        $<HTMLTextAreaElement>('#tool-parameters').value = JSON.stringify(tmpl.parameters, null, 2)
      }
    })
  })

  return panel
}
