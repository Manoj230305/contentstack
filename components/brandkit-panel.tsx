"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { brandkitManager, type BrandCompliance } from "@/lib/brandkit-manager"
import {
  Shield,
  ShieldCheck,
  ShieldX,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  Lightbulb,
} from "lucide-react"

interface BrandkitPanelProps {
  content: string
  onTermSelect: (term: string) => void
  onComplianceChange: (compliance: BrandCompliance) => void
}

export function BrandkitPanel({ content, onTermSelect, onComplianceChange }: BrandkitPanelProps) {
  const [compliance, setCompliance] = useState<BrandCompliance | null>(null)
  const [guidelines, setGuidelines] = useState(brandkitManager.getBrandGuidelines())
  const [selectedCategory, setSelectedCategory] = useState<"approved" | "deprecated" | "banned">("approved")

  useEffect(() => {
    if (content) {
      const newCompliance = brandkitManager.validateContent(content)
      setCompliance(newCompliance)
      onComplianceChange(newCompliance)
    }
  }, [content, onComplianceChange])

  const getComplianceColor = (score: number) => {
    if (score >= 90) return "text-green-600"
    if (score >= 70) return "text-yellow-600"
    return "text-red-600"
  }

  const getComplianceIcon = (score: number) => {
    if (score >= 90) return <ShieldCheck className="h-4 w-4 text-green-600" />
    if (score >= 70) return <Shield className="h-4 w-4 text-yellow-600" />
    return <ShieldX className="h-4 w-4 text-red-600" />
  }

  const getSeverityIcon = (severity: "error" | "warning" | "info") => {
    switch (severity) {
      case "error":
        return <XCircle className="h-3 w-3 text-red-500" />
      case "warning":
        return <AlertTriangle className="h-3 w-3 text-yellow-500" />
      case "info":
        return <CheckCircle className="h-3 w-3 text-blue-500" />
    }
  }

  const handleTermClick = (term: string) => {
    onTermSelect(term)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Brand Compliance
          </h3>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" title="Export Brandkit">
              <Download className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" title="Import Brandkit">
              <Upload className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Compliance Score */}
        {compliance && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              {getComplianceIcon(compliance.score)}
              <span className="font-medium">Compliance Score</span>
            </div>
            <div className="text-right">
              <div className={`text-lg font-bold ${getComplianceColor(compliance.score)}`}>{compliance.score}%</div>
              <div className="text-xs text-muted-foreground">
                {compliance.isCompliant ? "Compliant" : "Issues Found"}
              </div>
            </div>
          </div>
        )}
      </div>

      <Tabs defaultValue="violations" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 mx-4 mt-2">
          <TabsTrigger value="violations">Issues</TabsTrigger>
          <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
          <TabsTrigger value="guidelines">Guidelines</TabsTrigger>
        </TabsList>

        <TabsContent value="violations" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              {compliance?.violations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShieldCheck className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p>No compliance violations found</p>
                  <p className="text-sm">Your content follows brand guidelines</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {compliance?.violations.map((violation) => (
                    <Card key={violation.id} className="border-l-4 border-l-red-500">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            {getSeverityIcon(violation.severity)}
                            <span className="font-medium text-sm">{violation.rule}</span>
                          </div>
                          <Badge variant="destructive" className="text-xs">
                            {violation.severity}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mb-2">{violation.message}</div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-1 rounded font-mono">
                            {violation.term}
                          </span>
                          {violation.suggestion && (
                            <>
                              <span>→</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                                onClick={() => handleTermClick(violation.suggestion!)}
                              >
                                {violation.suggestion}
                              </Button>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="suggestions" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              {compliance?.suggestions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Lightbulb className="h-8 w-8 mx-auto mb-2" />
                  <p>No suggestions available</p>
                  <p className="text-sm">Your content looks good</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {compliance?.suggestions.map((suggestion) => (
                    <Card key={suggestion.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <Lightbulb className="h-3 w-3 text-blue-500" />
                            <span className="font-medium text-sm">{suggestion.category}</span>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {Math.round(suggestion.confidence * 100)}% confidence
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mb-2">{suggestion.reason}</div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded font-mono">
                            {suggestion.original}
                          </span>
                          <span>→</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                            onClick={() => handleTermClick(suggestion.suggested)}
                          >
                            {suggestion.suggested}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="guidelines" className="flex-1 mt-0">
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-border">
              <div className="flex gap-1">
                <Button
                  variant={selectedCategory === "approved" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedCategory("approved")}
                  className="flex-1"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Approved
                </Button>
                <Button
                  variant={selectedCategory === "deprecated" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedCategory("deprecated")}
                  className="flex-1"
                >
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Deprecated
                </Button>
                <Button
                  variant={selectedCategory === "banned" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedCategory("banned")}
                  className="flex-1"
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  Banned
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                {guidelines[selectedCategory].map((term) => (
                  <Card key={term.id} className="cursor-pointer hover:bg-muted/50">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <div className="font-medium text-sm mb-1">{term.term}</div>
                          {term.alternatives && term.alternatives.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              Alternatives: {term.alternatives.join(", ")}
                            </div>
                          )}
                        </div>
                        <Badge
                          variant={
                            term.category === "approved"
                              ? "default"
                              : term.category === "deprecated"
                                ? "secondary"
                                : "destructive"
                          }
                          className="text-xs"
                        >
                          {term.category}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTermClick(term.term)}
                          className="h-6 px-2 text-xs"
                        >
                          Use Term
                        </Button>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <Button variant="outline" className="w-full bg-transparent" size="sm">
                  <Plus className="h-3 w-3 mr-1" />
                  Add New Term
                </Button>
              </div>
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
