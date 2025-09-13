export interface BrandTerm {
  id: string
  term: string
  category: "approved" | "deprecated" | "banned"
  alternatives?: string[]
  context?: string[]
  lastUpdated: Date
  createdBy: string
}

export interface BrandRule {
  id: string
  name: string
  description: string
  pattern: RegExp | string
  severity: "error" | "warning" | "info"
  suggestion?: string
  category: "terminology" | "style" | "legal" | "tone"
}

export interface BrandCompliance {
  isCompliant: boolean
  score: number // 0-100
  violations: BrandViolation[]
  suggestions: BrandSuggestion[]
}

export interface BrandViolation {
  id: string
  term: string
  position: number
  severity: "error" | "warning" | "info"
  rule: string
  message: string
  suggestion?: string
}

export interface BrandSuggestion {
  id: string
  original: string
  suggested: string
  reason: string
  confidence: number
  category: string
}

export class BrandkitManager {
  private terms: BrandTerm[] = []
  private rules: BrandRule[] = []

  constructor() {
    this.initializeDefaultBrandkit()
  }

  private initializeDefaultBrandkit() {
    // Default approved terms
    this.terms = [
      {
        id: "1",
        term: "Omega Corporation",
        category: "approved",
        alternatives: ["OmegaCorp", "Omega"],
        context: ["company", "business", "corporate"],
        lastUpdated: new Date(),
        createdBy: "Brand Team",
      },
      {
        id: "2",
        term: "Omega Solutions",
        category: "approved",
        alternatives: ["Omega Tech Solutions"],
        context: ["services", "technology"],
        lastUpdated: new Date(),
        createdBy: "Brand Team",
      },
      {
        id: "3",
        term: "Alpha Company",
        category: "deprecated",
        alternatives: ["Omega Corporation", "Omega Solutions"],
        context: ["old brand name"],
        lastUpdated: new Date(),
        createdBy: "Brand Team",
      },
      {
        id: "4",
        term: "AlphaCorp",
        category: "deprecated",
        alternatives: ["OmegaCorp"],
        context: ["old brand name"],
        lastUpdated: new Date(),
        createdBy: "Brand Team",
      },
      {
        id: "5",
        term: "Competitor Corp",
        category: "banned",
        alternatives: ["industry leader", "market competitor"],
        context: ["competitor reference"],
        lastUpdated: new Date(),
        createdBy: "Legal Team",
      },
    ]

    // Default brand rules
    this.rules = [
      {
        id: "rule-1",
        name: "Approved Company Names",
        description: "Only use approved company names and variations",
        pattern: /\b(Omega Corporation|OmegaCorp|Omega Solutions)\b/gi,
        severity: "info",
        category: "terminology",
      },
      {
        id: "rule-2",
        name: "Deprecated Terms",
        description: "Avoid using deprecated brand terms",
        pattern: /\b(Alpha Company|AlphaCorp|Alpha Inc)\b/gi,
        severity: "warning",
        suggestion: "Use 'Omega Corporation' instead",
        category: "terminology",
      },
      {
        id: "rule-3",
        name: "Banned Terms",
        description: "Never use banned or competitor terms",
        pattern: /\b(Competitor Corp|BadBrand Inc)\b/gi,
        severity: "error",
        suggestion: "Remove or replace with approved alternative",
        category: "legal",
      },
      {
        id: "rule-4",
        name: "Professional Tone",
        description: "Maintain professional language",
        pattern: /\b(awesome|cool|amazing)\b/gi,
        severity: "warning",
        suggestion: "Use more professional language like 'excellent', 'outstanding', or 'innovative'",
        category: "tone",
      },
    ]
  }

  addTerm(term: BrandTerm): void {
    this.terms.push(term)
  }

  updateTerm(id: string, updates: Partial<BrandTerm>): void {
    const index = this.terms.findIndex((term) => term.id === id)
    if (index !== -1) {
      this.terms[index] = { ...this.terms[index], ...updates, lastUpdated: new Date() }
    }
  }

  deleteTerm(id: string): void {
    this.terms = this.terms.filter((term) => term.id !== id)
  }

  getTerms(category?: "approved" | "deprecated" | "banned"): BrandTerm[] {
    if (category) {
      return this.terms.filter((term) => term.category === category)
    }
    return this.terms
  }

  addRule(rule: BrandRule): void {
    this.rules.push(rule)
  }

  getRules(): BrandRule[] {
    return this.rules
  }

  validateContent(content: string): BrandCompliance {
    const violations: BrandViolation[] = []
    const suggestions: BrandSuggestion[] = []

    // Check against brand rules
    this.rules.forEach((rule) => {
      const pattern = typeof rule.pattern === "string" ? new RegExp(rule.pattern, "gi") : rule.pattern
      let match

      while ((match = pattern.exec(content)) !== null) {
        violations.push({
          id: `violation-${violations.length}`,
          term: match[0],
          position: match.index,
          severity: rule.severity,
          rule: rule.name,
          message: rule.description,
          suggestion: rule.suggestion,
        })
      }
    })

    // Check for deprecated terms and suggest alternatives
    this.terms
      .filter((term) => term.category === "deprecated")
      .forEach((term) => {
        const regex = new RegExp(`\\b${term.term}\\b`, "gi")
        let match

        while ((match = regex.exec(content)) !== null) {
          if (term.alternatives && term.alternatives.length > 0) {
            suggestions.push({
              id: `suggestion-${suggestions.length}`,
              original: match[0],
              suggested: term.alternatives[0],
              reason: `Replace deprecated term with approved alternative`,
              confidence: 0.9,
              category: "terminology",
            })
          }
        }
      })

    // Check for banned terms
    this.terms
      .filter((term) => term.category === "banned")
      .forEach((term) => {
        const regex = new RegExp(`\\b${term.term}\\b`, "gi")
        let match

        while ((match = regex.exec(content)) !== null) {
          violations.push({
            id: `violation-${violations.length}`,
            term: match[0],
            position: match.index,
            severity: "error",
            rule: "Banned Terms",
            message: `"${term.term}" is a banned term and must be removed`,
            suggestion: term.alternatives?.[0] || "Remove this term",
          })
        }
      })

    // Calculate compliance score
    const errorCount = violations.filter((v) => v.severity === "error").length
    const warningCount = violations.filter((v) => v.severity === "warning").length
    const score = Math.max(0, 100 - errorCount * 20 - warningCount * 10)

    return {
      isCompliant: errorCount === 0,
      score,
      violations,
      suggestions,
    }
  }

  getSuggestedReplacements(term: string): string[] {
    // Find approved alternatives for the term
    const deprecatedTerm = this.terms.find(
      (t) => t.category === "deprecated" && t.term.toLowerCase() === term.toLowerCase(),
    )

    if (deprecatedTerm?.alternatives) {
      return deprecatedTerm.alternatives
    }

    // Find similar approved terms
    const approvedTerms = this.terms.filter((t) => t.category === "approved")
    return approvedTerms
      .filter((t) => t.term.toLowerCase().includes(term.toLowerCase().split(" ")[0]))
      .map((t) => t.term)
      .slice(0, 3)
  }

  getBrandGuidelines(): {
    approved: BrandTerm[]
    deprecated: BrandTerm[]
    banned: BrandTerm[]
    rules: BrandRule[]
  } {
    return {
      approved: this.getTerms("approved"),
      deprecated: this.getTerms("deprecated"),
      banned: this.getTerms("banned"),
      rules: this.getRules(),
    }
  }

  exportBrandkit(): string {
    return JSON.stringify(
      {
        terms: this.terms,
        rules: this.rules,
        exportDate: new Date().toISOString(),
      },
      null,
      2,
    )
  }

  importBrandkit(data: string): void {
    try {
      const parsed = JSON.parse(data)
      if (parsed.terms) this.terms = parsed.terms
      if (parsed.rules) this.rules = parsed.rules
    } catch (error) {
      throw new Error("Invalid brandkit data format")
    }
  }
}

export const brandkitManager = new BrandkitManager()
