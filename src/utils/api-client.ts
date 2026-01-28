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

export interface ApiClientOptions {
    authToken?: string
}

/**
 * Build headers for API requests
 */
function buildHeaders(options?: ApiClientOptions): HeadersInit {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    }
    if (options?.authToken) {
        headers['Authorization'] = `Bearer ${options.authToken}`
    }
    return headers
}

/**
 * Fetch memory graph for a user
 * @param apiBaseUrl Base URL of the Kwami API (e.g. http://localhost:8080)
 * @param userId User ID to fetch memory for
 * @param options Optional settings including auth token
 */
export async function getMemoryGraph(
    apiBaseUrl: string,
    userId: string,
    options?: ApiClientOptions
): Promise<MemoryGraph> {
    const url = `${apiBaseUrl}/memory/${userId}/graph`
    const response = await fetch(url, {
        headers: buildHeaders(options),
    })

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
 * @param apiBaseUrl Base URL of the Kwami API (e.g. http://localhost:8080)
 * @param userId User ID to fetch memory for
 * @param options Optional settings including auth token
 */
export async function getUserFacts(
    apiBaseUrl: string,
    userId: string,
    options?: ApiClientOptions
): Promise<string[]> {
    const url = `${apiBaseUrl}/memory/${userId}/facts`
    const response = await fetch(url, {
        headers: buildHeaders(options),
    })

    if (!response.ok) {
        if (response.status === 404) {
            return []
        }
        throw new Error(`Failed to fetch facts: ${response.statusText}`)
    }

    return response.json()
}
