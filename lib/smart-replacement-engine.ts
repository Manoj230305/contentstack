export interface ReplacementRule {
  id: string
  findPattern: string | RegExp
  replaceWith: string
  type: "exact" | "contextual" | "entity" | "link" | "email"
  context?: string[]
  confidence: "high" | "medium" | "low"
  metadata?: {
    originalUrl?: string
    newUrl?: string
    entityType?: "company" | "person" | "product" | "location"
  }
}

export interface SmartMatch {
  id: string
  text: string
  context: string
  position: number
  type: "text" | "link" | "email" | "metadata" | "entity"
  confidence: "high" | "medium" | "low"
  suggestedReplacement: string
  reasoning: string
  metadata?: {
    originalUrl?: string
    newUrl?: string
    entityType?: string
    relatedMatches?: string[]
  }
}

export class SmartReplacementEngine {
  private rules: ReplacementRule[] = []
  private entityPatterns = {
    company: /\b[A-Z][a-zA-Z\s&.,]+(?:Inc|LLC|Corp|Corporation|Company|Ltd|Limited)\b/g,
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    url: /https?:\/\/[^\s<>"{}|\\^`[\]]+/g,
    phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  }

  private brandTerms = {
    approved: ["Omega Corporation", "OmegaCorp", "Omega Solutions"],
    deprecated: ["Alpha Company", "AlphaCorp", "Alpha Inc"],
    banned: ["Competitor Corp", "BadBrand Inc"],
  }

  addRule(rule: ReplacementRule): void {
    this.rules.push(rule)
  }

  removeRule(ruleId: string): void {
    this.rules = this.rules.filter((rule) => rule.id !== ruleId)
  }

  analyzeContent(content: string, findText: string, replaceText: string): SmartMatch[] {
    const matches: SmartMatch[] = []

    // Context-aware text replacement
    const textMatches = this.findContextualMatches(content, findText, replaceText)
    matches.push(...textMatches)

    // Entity-based replacements
    const entityMatches = this.findEntityMatches(content, findText, replaceText)
    matches.push(...entityMatches)

    // Link and URL replacements
    const linkMatches = this.findLinkMatches(content, findText, replaceText)
    matches.push(...linkMatches)

    // Email replacements
    const emailMatches = this.findEmailMatches(content, findText, replaceText)
    matches.push(...emailMatches)

    return matches.sort((a, b) => a.position - b.position)
  }

  private findContextualMatches(content: string, findText: string, replaceText: string): SmartMatch[] {
    const matches: SmartMatch[] = []
    const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")
    let match

    while ((match = regex.exec(content)) !== null) {
      const position = match.index
      const context = this.extractContext(content, position, match[0].length)
      const contextualAnalysis = this.analyzeContext(context, findText, replaceText)

      matches.push({
        id: `text-${position}`,
        text: match[0],
        context: context,
        position: position,
        type: "text",
        confidence: contextualAnalysis.confidence,
        suggestedReplacement: contextualAnalysis.replacement,
        reasoning: contextualAnalysis.reasoning,
      })
    }

    return matches
  }

  private findEntityMatches(content: string, findText: string, replaceText: string): SmartMatch[] {
    const matches: SmartMatch[] = []

    // Company name detection and replacement
    const companyMatches = content.matchAll(this.entityPatterns.company)
    for (const match of companyMatches) {
      if (match[0].toLowerCase().includes(findText.toLowerCase())) {
        const position = match.index || 0
        const context = this.extractContext(content, position, match[0].length)

        matches.push({
          id: `entity-${position}`,
          text: match[0],
          context: context,
          position: position,
          type: "entity",
          confidence: "high",
          suggestedReplacement: this.generateEntityReplacement(match[0], findText, replaceText),
          reasoning: "Detected as company entity - will preserve legal structure",
          metadata: {
            entityType: "company",
          },
        })
      }
    }

    return matches
  }

  private findLinkMatches(content: string, findText: string, replaceText: string): SmartMatch[] {
    const matches: SmartMatch[] = []

    // Find HTML links containing the search text
    const linkRegex = /<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi
    let match

    while ((match = linkRegex.exec(content)) !== null) {
      const [fullMatch, href, linkText] = match
      const position = match.index || 0

      if (
        linkText.toLowerCase().includes(findText.toLowerCase()) ||
        href.toLowerCase().includes(findText.toLowerCase())
      ) {
        const context = this.extractContext(content, position, fullMatch.length)
        const urlReplacement = this.generateUrlReplacement(href, findText, replaceText)
        const textReplacement = linkText.replace(new RegExp(findText, "gi"), replaceText)

        matches.push({
          id: `link-${position}`,
          text: linkText,
          context: context,
          position: position,
          type: "link",
          confidence: "high",
          suggestedReplacement: textReplacement,
          reasoning: "Smart link update - will update both text and URL",
          metadata: {
            originalUrl: href,
            newUrl: urlReplacement,
          },
        })
      }
    }

    return matches
  }

  private findEmailMatches(content: string, findText: string, replaceText: string): SmartMatch[] {
    const matches: SmartMatch[] = []
    const emailMatches = content.matchAll(this.entityPatterns.email)

    for (const match of emailMatches) {
      if (match[0].toLowerCase().includes(findText.toLowerCase())) {
        const position = match.index || 0
        const context = this.extractContext(content, position, match[0].length)
        const emailReplacement = this.generateEmailReplacement(match[0], findText, replaceText)

        matches.push({
          id: `email-${position}`,
          text: match[0],
          context: context,
          position: position,
          type: "email",
          confidence: "medium",
          suggestedReplacement: emailReplacement,
          reasoning: "Email address detected - will update domain if company name changes",
        })
      }
    }

    return matches
  }

  private analyzeContext(
    context: string,
    findText: string,
    replaceText: string,
  ): {
    confidence: "high" | "medium" | "low"
    replacement: string
    reasoning: string
  } {
    // Analyze surrounding words for context
    const words = context.toLowerCase().split(/\s+/)
    const findWords = findText.toLowerCase().split(/\s+/)

    // Check for brand compliance
    if (this.brandTerms.banned.some((term) => replaceText.toLowerCase().includes(term.toLowerCase()))) {
      return {
        confidence: "low",
        replacement: replaceText,
        reasoning: "Warning: Replacement contains banned brand term",
      }
    }

    if (this.brandTerms.approved.some((term) => replaceText.toLowerCase().includes(term.toLowerCase()))) {
      return {
        confidence: "high",
        replacement: replaceText,
        reasoning: "Replacement uses approved brand terminology",
      }
    }

    // Context-aware replacement logic
    if (words.some((word) => ["launched", "announced", "released"].includes(word))) {
      return {
        confidence: "high",
        replacement: replaceText,
        reasoning: "Product/company announcement context detected",
      }
    }

    if (words.some((word) => ["visit", "website", "online"].includes(word))) {
      return {
        confidence: "high",
        replacement: replaceText,
        reasoning: "Web reference context detected",
      }
    }

    return {
      confidence: "medium",
      replacement: replaceText,
      reasoning: "Standard text replacement",
    }
  }

  private generateEntityReplacement(entity: string, findText: string, replaceText: string): string {
    // Preserve legal structure (Inc, LLC, Corp, etc.)
    const legalSuffixes = ["Inc", "LLC", "Corp", "Corporation", "Company", "Ltd", "Limited"]
    const suffix = legalSuffixes.find((s) => entity.includes(s))

    if (suffix && !replaceText.includes(suffix)) {
      return `${replaceText} ${suffix}`
    }

    return entity.replace(new RegExp(findText, "gi"), replaceText)
  }

  private generateUrlReplacement(url: string, findText: string, replaceText: string): string {
    // Smart URL replacement - convert company names to domain-friendly format
    const domainFriendly = replaceText
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9]/g, "")

    if (url.includes(findText.toLowerCase().replace(/\s+/g, ""))) {
      return url.replace(new RegExp(findText.toLowerCase().replace(/\s+/g, ""), "gi"), domainFriendly)
    }

    return url
  }

  private generateEmailReplacement(email: string, findText: string, replaceText: string): string {
    const [localPart, domain] = email.split("@")

    // Replace in domain if company name is in domain
    if (domain.toLowerCase().includes(findText.toLowerCase().replace(/\s+/g, ""))) {
      const newDomain = domain.replace(
        new RegExp(findText.toLowerCase().replace(/\s+/g, ""), "gi"),
        replaceText.toLowerCase().replace(/\s+/g, ""),
      )
      return `${localPart}@${newDomain}`
    }

    // Replace in local part if needed
    if (localPart.toLowerCase().includes(findText.toLowerCase().replace(/\s+/g, ""))) {
      const newLocalPart = localPart.replace(
        new RegExp(findText.toLowerCase().replace(/\s+/g, ""), "gi"),
        replaceText.toLowerCase().replace(/\s+/g, ""),
      )
      return `${newLocalPart}@${domain}`
    }

    return email
  }

  private extractContext(content: string, position: number, length: number, contextLength = 100): string {
    const start = Math.max(0, position - contextLength)
    const end = Math.min(content.length, position + length + contextLength)
    return content.substring(start, end)
  }

  validateBrandCompliance(text: string): {
    isCompliant: boolean
    issues: string[]
    suggestions: string[]
  } {
    const issues: string[] = []
    const suggestions: string[] = []

    // Check for banned terms
    this.brandTerms.banned.forEach((term) => {
      if (text.toLowerCase().includes(term.toLowerCase())) {
        issues.push(`Contains banned term: "${term}"`)
        suggestions.push(`Consider using approved alternative`)
      }
    })

    // Check for deprecated terms
    this.brandTerms.deprecated.forEach((term) => {
      if (text.toLowerCase().includes(term.toLowerCase())) {
        issues.push(`Contains deprecated term: "${term}"`)
        const approvedAlternative = this.brandTerms.approved[0]
        suggestions.push(`Replace with: "${approvedAlternative}"`)
      }
    })

    return {
      isCompliant: issues.length === 0,
      issues,
      suggestions,
    }
  }
}

export const smartReplacementEngine = new SmartReplacementEngine()
