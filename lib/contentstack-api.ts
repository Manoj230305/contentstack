export interface ContentstackConfig {
  apiKey: string
  deliveryToken: string
  environment: string
  region?: "us" | "eu" | "azure-na" | "azure-eu" | "gcp-na"
}

export interface ContentEntry {
  uid: string
  title: string
  content_type_uid: string
  locale: string
  url?: string
  tags: string[]
  created_at: string
  updated_at: string
  created_by: string
  updated_by: string
  [key: string]: any
}

export interface ContentType {
  uid: string
  title: string
  description: string
  schema: any[]
}

export interface SearchResult {
  entries: ContentEntry[]
  total_count: number
  skip: number
  limit: number
}

export class ContentstackAPI {
  private config: ContentstackConfig
  private baseUrl: string

  constructor(config: ContentstackConfig) {
    this.config = config
    const region = config.region || "us"
    const regionMap = {
      us: "api.contentstack.io",
      eu: "eu-api.contentstack.io",
      "azure-na": "azure-na-api.contentstack.io",
      "azure-eu": "azure-eu-api.contentstack.io",
      "gcp-na": "gcp-na-api.contentstack.io",
    }
    this.baseUrl = `https://${regionMap[region]}/v3`
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`
    const headers = {
      api_key: this.config.apiKey,
      access_token: this.config.deliveryToken,
      "Content-Type": "application/json",
      ...options.headers,
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      throw new Error(`Contentstack API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  async getContentTypes(): Promise<ContentType[]> {
    const response = await this.makeRequest("/content_types")
    return response.content_types
  }

  async getEntries(contentTypeUid: string, query: any = {}): Promise<SearchResult> {
    const queryParams = new URLSearchParams({
      environment: this.config.environment,
      locale: "en-us",
      ...query,
    })

    const response = await this.makeRequest(`/content_types/${contentTypeUid}/entries?${queryParams}`)

    return {
      entries: response.entries,
      total_count: response.count || response.entries.length,
      skip: query.skip || 0,
      limit: query.limit || 100,
    }
  }

  async searchEntries(searchTerm: string, contentTypes?: string[]): Promise<ContentEntry[]> {
    const allEntries: ContentEntry[] = []

    try {
      const contentTypesToSearch =
        contentTypes || (await this.getContentTypes().then((types) => types.map((t) => t.uid)))

      for (const contentTypeUid of contentTypesToSearch) {
        try {
          const result = await this.getEntries(contentTypeUid, {
            query: JSON.stringify({
              $or: [
                { title: { $regex: searchTerm, $options: "i" } },
                { description: { $regex: searchTerm, $options: "i" } },
              ],
            }),
          })
          allEntries.push(...result.entries)
        } catch (error) {
          console.warn(`Failed to search in content type ${contentTypeUid}:`, error)
        }
      }
    } catch (error) {
      console.error("Error searching entries:", error)
      throw error
    }

    return allEntries
  }

  async updateEntry(contentTypeUid: string, entryUid: string, data: any): Promise<ContentEntry> {
    const response = await this.makeRequest(`/content_types/${contentTypeUid}/entries/${entryUid}`, {
      method: "PUT",
      body: JSON.stringify({ entry: data }),
    })

    return response.entry
  }

  async bulkUpdateEntries(
    updates: Array<{
      contentTypeUid: string
      entryUid: string
      data: any
    }>,
  ): Promise<{ success: number; failed: number; errors: any[] }> {
    const results = { success: 0, failed: 0, errors: [] as any[] }

    for (const update of updates) {
      try {
        await this.updateEntry(update.contentTypeUid, update.entryUid, update.data)
        results.success++
      } catch (error) {
        results.failed++
        results.errors.push({
          entryUid: update.entryUid,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    return results
  }

  async validateConnection(): Promise<boolean> {
    try {
      await this.getContentTypes()
      return true
    } catch (error) {
      return false
    }
  }
}

export const createContentstackClient = (config: ContentstackConfig) => {
  return new ContentstackAPI(config)
}
