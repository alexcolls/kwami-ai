/**
 * API Client for interacting with Kwami Backend API
 */

export interface MemoryNode {
    id: string
    label: string
    type: string
    val?: number
    summary?: string
    uuid?: string
    created_at?: string
    labels?: string[]
}

export interface MemoryEdge {
    source: string
    target: string
    relation: string
}

export interface MemoryGraph {
    nodes: MemoryNode[]
    edges: MemoryEdge[]
}

/**
 * Fetch memory graph for a user
 * @param apiBaseUrl Base URL of the Kwami API (e.g. http://localhost:8080)
 * @param userId User ID to fetch memory for
 */
export async function getMemoryGraph(apiBaseUrl: string, userId: string): Promise<MemoryGraph> {
    const url = `${apiBaseUrl}/memory/${userId}/graph`
    const response = await fetch(url)

    if (!response.ok) {
        if (response.status === 404) {
            return { nodes: [], edges: [] }
        }
        throw new Error(`Failed to fetch memory graph: ${response.statusText}`)
    }

    return response.json()
}

/**
 * Fetch facts for a user
 */
export async function getUserFacts(apiBaseUrl: string, userId: string): Promise<string[]> {
    const url = `${apiBaseUrl}/memory/${userId}/facts`
    const response = await fetch(url)

    if (!response.ok) {
        if (response.status === 404) {
            return []
        }
        throw new Error(`Failed to fetch facts: ${response.statusText}`)
    }

    return response.json()
}
