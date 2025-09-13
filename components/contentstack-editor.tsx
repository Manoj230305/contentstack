"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { PreviewPanel } from "@/components/preview-panel"
import { BrandkitPanel } from "@/components/brandkit-panel"
import { ContentstackConnection } from "@/components/contentstack-connection"
import { smartReplacementEngine, type SmartMatch } from "@/lib/smart-replacement-engine"
import type { ContentstackAPI, ContentstackConfig, ContentEntry } from "@/lib/contentstack-api"
import type { BrandCompliance } from "@/lib/brandkit-manager"
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Link,
  Search,
  Replace,
  Settings,
  ChevronUp,
  ChevronDown,
  Eye,
  AlertTriangle,
  CheckCircle,
  Brain,
  Zap,
  Shield,
  Database,
  RefreshCw,
  Save,
  Loader2,
  FileText,
  Sparkles,
} from "lucide-react"

const sampleContent = `Example content: Alpha Company launched a revolutionary product last year. Visit "https://alpha.com" Alpha Company for more information. Contact us at "mailto:contact@alphacompany.com" contact@alphacompany.com.This intelligent editor will help you replace "Alpha Company" with "Omega Corporation" while automatically updating links and email addresses contextually.`

export function ContentstackEditor() {
  const [content, setContent] = useState(sampleContent)
  const [showFindReplace, setShowFindReplace] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showBrandkit, setShowBrandkit] = useState(false)
  const [findText, setFindText] = useState("")
  const [replaceText, setReplaceText] = useState("")
  const [matches, setMatches] = useState<SmartMatch[]>([])
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)
  const [isSearching, setIsSearching] = useState(false)
  const [useSmartEngine, setUseSmartEngine] = useState(true)
  const [brandCompliance, setBrandCompliance] = useState<BrandCompliance | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)

  const [contentstackClient, setContentstackClient] = useState<ContentstackAPI | null>(null)
  const [contentstackConfig, setContentstackConfig] = useState<ContentstackConfig | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [contentEntries, setContentEntries] = useState<ContentEntry[]>([])
  const [selectedEntries, setSelectedEntries] = useState<string[]>([])
  const [isLoadingEntries, setIsLoadingEntries] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showContentSelector, setShowContentSelector] = useState(false)


  const handleContentstackConnection = (client: ContentstackAPI, config: ContentstackConfig) => {
    setContentstackClient(client)
    setContentstackConfig(config)
    setIsConnected(true)
    loadContentEntries(client)
  }

  const loadContentEntries = async (client: ContentstackAPI) => {
    setIsLoadingEntries(true)
    try {
      const contentTypes = await client.getContentTypes()
      const allEntries: ContentEntry[] = []

      for (const contentType of contentTypes.slice(0, 5)) {
        // Limit to first 5 content types
        try {
          const result = await client.getEntries(contentType.uid, { limit: 10 })
          allEntries.push(...result.entries)
        } catch (error) {
          console.warn(`Failed to load entries for ${contentType.uid}:`, error)
        }
      }

      setContentEntries(allEntries)
    } catch (error) {
      console.error("Failed to load content entries:", error)
    } finally {
      setIsLoadingEntries(false)
    }
  }

  const handleSearch = async () => {
    if (!findText.trim()) {
      setMatches([])
      return
    }

    setIsSearching(true)

    try {
      let contentToAnalyze = editorRef.current?.innerHTML || sampleContent

      // If connected to Contentstack and entries are selected, search across those entries
      if (contentstackClient && selectedEntries.length > 0) {
        const selectedContent = contentEntries
          .filter((entry) => selectedEntries.includes(entry.uid))
          .map((entry) => JSON.stringify(entry))
          .join("\n\n")
        contentToAnalyze = selectedContent
      }

      setTimeout(() => {
        if (useSmartEngine) {
          const smartMatches = smartReplacementEngine.analyzeContent(contentToAnalyze, findText, replaceText)
          setMatches(smartMatches)
        } else {
          const simpleMatches = findSimpleMatches(contentToAnalyze, findText)
          setMatches(simpleMatches)
        }

        setCurrentMatchIndex(0)
        setIsSearching(false)
      }, 800)
    } catch (error) {
      console.error("Search failed:", error)
      setIsSearching(false)
    }
  }

  const handleApplyChangesToContentstack = async () => {
    if (!contentstackClient || matches.length === 0) return

    setIsSaving(true)
    try {
      const updates = matches.map((match) => ({
        contentTypeUid: "your_content_type", // This would be determined from the match
        entryUid: "entry_uid", // This would be determined from the match
        data: {
          // Apply the smart replacement to the entry data
          // This is a simplified example - real implementation would be more complex
        },
      }))

      const result = await contentstackClient.bulkUpdateEntries(updates)
      console.log(`Applied ${result.success} changes, ${result.failed} failed`)

      // Clear matches after successful application
      setMatches([])
      setShowPreview(false)
    } catch (error) {
      console.error("Failed to apply changes:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const findSimpleMatches = (content: string, searchText: string): SmartMatch[] => {
    const matches: SmartMatch[] = []
    const regex = new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")
    let match

    while ((match = regex.exec(content)) !== null) {
      matches.push({
        id: `simple-${match.index}`,
        text: match[0],
        context: content.substring(Math.max(0, match.index - 50), match.index + match[0].length + 50),
        position: match.index,
        type: "text",
        confidence: "medium",
        suggestedReplacement: replaceText,
        reasoning: "Simple text replacement",
      })
    }

    return matches
  }

  const navigateMatch = (direction: "next" | "prev") => {
    if (matches.length === 0) return

    if (direction === "next") {
      setCurrentMatchIndex((prev) => (prev + 1) % matches.length)
    } else {
      setCurrentMatchIndex((prev) => (prev - 1 + matches.length) % matches.length)
    }
  }

  const handleReplace = (matchId?: string) => {
    if (matchId) {
      // Replace single match
      setMatches((prev) => prev.filter((match) => match.id !== matchId))
    } else {
      // Replace current match
      if (matches.length > 0) {
        const currentMatch = matches[currentMatchIndex]
        setMatches((prev) => prev.filter((match) => match.id !== currentMatch.id))
        if (currentMatchIndex >= matches.length - 1) {
          setCurrentMatchIndex(Math.max(0, matches.length - 2))
        }
      }
    }
  }

  const handleReplaceAll = () => {
    setMatches([])
    setCurrentMatchIndex(0)
  }

  const handleApproveChange = (matchId: string) => {
    console.log(`Approved change: ${matchId}`)
  }

  const handleRejectChange = (matchId: string) => {
    setMatches((prev) => prev.filter((match) => match.id !== matchId))
  }

  const handleApproveAll = () => {
    console.log("Approved all changes")
    setMatches([])
  }

  const handleRejectAll = () => {
    setMatches([])
  }

  const handleBrandTermSelect = (term: string) => {
    setReplaceText(term)
  }

  const handleComplianceChange = (compliance: BrandCompliance) => {
    setBrandCompliance(compliance)
  }

  const handleFormat = (action: string) => {
    // Rich text formatting logic will be implemented
    console.log(`Formatting: ${action}`)
  }

  const getBrandComplianceColor = () => {
    if (!brandCompliance) return ""
    if (brandCompliance.score >= 90) return "text-green-600"
    if (brandCompliance.score >= 70) return "text-yellow-600"
    return "text-red-600"
  }

  useEffect(() => {
    let debounceTimer: NodeJS.Timeout

    if (findText && replaceText) {
      debounceTimer = setTimeout(() => {
        if (!findText.trim()) {
          setMatches([])
          setShowPreview(false)
          return
        }

        setIsSearching(true)

        try {
          let contentToAnalyze = editorRef.current?.innerHTML || sampleContent

          // If connected to Contentstack and entries are selected, search across those entries
          if (contentstackClient && selectedEntries.length > 0) {
            const selectedContent = contentEntries
              .filter((entry) => selectedEntries.includes(entry.uid))
              .map((entry) => JSON.stringify(entry))
              .join("\n\n")
            contentToAnalyze = selectedContent
          }

          setTimeout(() => {
            if (useSmartEngine) {
              const smartMatches = smartReplacementEngine.analyzeContent(contentToAnalyze, findText, replaceText)
              setMatches(smartMatches)
            } else {
              const simpleMatches = findSimpleMatches(contentToAnalyze, findText)
              setMatches(simpleMatches)
            }

            setCurrentMatchIndex(0)
            setIsSearching(false)
            setShowPreview(true)
          }, 800)
        } catch (error) {
          console.error("Search failed:", error)
          setIsSearching(false)
        }
      }, 300)
    } else {
      setMatches([])
      setShowPreview(false)
    }

    return () => clearTimeout(debounceTimer)
  }, [findText, replaceText, useSmartEngine, contentstackClient, selectedEntries, contentEntries, sampleContent])

  const formatButtons = [
    { icon: Bold, label: "Bold", action: "bold" },
    { icon: Italic, label: "Italic", action: "italic" },
    { icon: Underline, label: "Underline", action: "underline" },
  ]

  const alignButtons = [
    { icon: AlignLeft, label: "Align Left", action: "left" },
    { icon: AlignCenter, label: "Align Center", action: "center" },
    { icon: AlignRight, label: "Align Right", action: "right" },
  ]

  const listButtons = [
    { icon: List, label: "Bullet List", action: "ul" },
    { icon: ListOrdered, label: "Numbered List", action: "ol" },
    { icon: Link, label: "Insert Link", action: "link" },
  ]

  return (
    <div className="flex h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-border/50 bg-card/80 backdrop-blur-sm px-6 py-4 shadow-soft">
          <div className="flex items-center justify-between">
            <div className="animate-fade-in">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-medium">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">Contentstack Find & Replace</h1>
              </div>
              <p className="text-sm text-muted-foreground">
                Intelligent content editing with context-aware replacements
              </p>
            </div>
            <div className="flex items-center gap-2 animate-slide-up">
              {isConnected && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowContentSelector(!showContentSelector)}
                  className="flex items-center gap-2 hover:shadow-soft transition-all duration-200 hover:scale-105"
                >
                  <Database className="h-4 w-4" />
                  Content ({contentEntries.length})
                  {selectedEntries.length > 0 && (
                    <Badge variant="secondary" className="ml-1 animate-scale-in">
                      {selectedEntries.length} selected
                    </Badge>
                  )}
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFindReplace(!showFindReplace)}
                className="flex items-center gap-2 hover:shadow-soft transition-all duration-200 hover:scale-105"
              >
                <Search className="h-4 w-4" />
                Find & Replace
                {matches.length > 0 && (
                  <Badge variant="secondary" className="ml-1 animate-scale-in">
                    {matches.length}
                  </Badge>
                )}
              </Button>

              {matches.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex items-center gap-2 hover:shadow-soft transition-all duration-200 hover:scale-105"
                  >
                    <Eye className="h-4 w-4" />
                    Preview
                  </Button>

                  {isConnected && (
                    <Button
                      size="sm"
                      onClick={handleApplyChangesToContentstack}
                      disabled={isSaving}
                      className="flex items-center gap-2 gradient-primary text-white hover:shadow-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Apply to CMS
                    </Button>
                  )}
                </>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBrandkit(!showBrandkit)}
                className="flex items-center gap-2 hover:shadow-soft transition-all duration-200 hover:scale-105"
              >
                <Shield className="h-4 w-4" />
                Brand Kit
                {brandCompliance && (
                  <Badge variant="secondary" className={`ml-1 animate-scale-in ${getBrandComplianceColor()}`}>
                    {brandCompliance.score}%
                  </Badge>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="hover:shadow-soft transition-all duration-200 hover:scale-105 bg-transparent"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* ContentstackConnection removed: no longer needed in UI */}

        {isConnected && showContentSelector && (
          <div className="border-b border-border/50 bg-muted/30 p-4 animate-slide-up">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Select Content to Process</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadContentEntries(contentstackClient!)}
                  disabled={isLoadingEntries}
                  className="hover:shadow-soft transition-all duration-200"
                >
                  {isLoadingEntries ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-1" />
                  )}
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowContentSelector(false)}
                  className="hover:shadow-soft transition-all duration-200"
                >
                  Close
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {contentEntries.map((entry) => (
                <label
                  key={entry.uid}
                  className="flex items-center gap-2 p-3 rounded-lg border cursor-pointer hover:bg-accent/10 hover:border-accent/30 transition-all duration-200 hover:shadow-soft"
                >
                  <input
                    type="checkbox"
                    checked={selectedEntries.includes(entry.uid)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedEntries((prev) => [...prev, entry.uid])
                      } else {
                        setSelectedEntries((prev) => prev.filter((id) => id !== entry.uid))
                      }
                    }}
                    className="rounded accent-accent"
                  />
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{entry.title}</div>
                    <div className="text-xs text-muted-foreground">{entry.content_type_uid}</div>
                  </div>
                </label>
              ))}
            </div>

            {contentEntries.length === 0 && !isLoadingEntries && (
              <div className="text-center py-8 text-muted-foreground">
                <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No content entries found</p>
              </div>
            )}
          </div>
        )}

        {/* Toolbar */}
        <div className="border-b border-border/50 bg-muted/20 px-6 py-3">
          <div className="flex items-center gap-1">
            {/* Format Buttons */}
            <div className="flex items-center gap-1">
              {formatButtons.map((button) => (
                <Button
                  key={button.action}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFormat(button.action)}
                  className="h-8 w-8 p-0 hover:bg-accent/10 hover:text-accent transition-all duration-200 hover:scale-110"
                  title={button.label}
                >
                  <button.icon className="h-4 w-4" />
                </Button>
              ))}
            </div>

            <Separator orientation="vertical" className="mx-2 h-6" />

            {/* Alignment Buttons */}
            <div className="flex items-center gap-1">
              {alignButtons.map((button) => (
                <Button
                  key={button.action}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFormat(button.action)}
                  className="h-8 w-8 p-0 hover:bg-accent/10 hover:text-accent transition-all duration-200 hover:scale-110"
                  title={button.label}
                >
                  <button.icon className="h-4 w-4" />
                </Button>
              ))}
            </div>

            <Separator orientation="vertical" className="mx-2 h-6" />

            {/* List and Link Buttons */}
            <div className="flex items-center gap-1">
              {listButtons.map((button) => (
                <Button
                  key={button.action}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFormat(button.action)}
                  className="h-8 w-8 p-0 hover:bg-accent/10 hover:text-accent transition-all duration-200 hover:scale-110"
                  title={button.label}
                >
                  <button.icon className="h-4 w-4" />
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Editor Content */}
        <div className="flex-1 p-6">
          <Card className="h-full shadow-medium hover:shadow-large transition-all duration-300 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent animate-pulse"></div>
                  Content Editor
                </div>
                {brandCompliance && (
                  <div className="flex items-center gap-2 animate-fade-in">
                    <Shield className={`h-4 w-4 ${getBrandComplianceColor()}`} />
                    <span className={`text-sm ${getBrandComplianceColor()}`}>
                      {brandCompliance.isCompliant ? "Brand Compliant" : "Compliance Issues"}
                    </span>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="h-full">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[400px] w-full rounded-lg border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 transition-all duration-200 hover:border-accent/30 resize-vertical"
                placeholder="Start typing your content here..."
                style={{ minHeight: "400px" }}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Find & Replace Sidebar */}
      {showFindReplace && (
        <div className="w-96 border-l border-border/50 bg-sidebar/80 backdrop-blur-sm flex flex-col animate-slide-up shadow-large">
          <div className="p-4 border-b border-sidebar-border/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sidebar-foreground flex items-center gap-2">
                <Search className="h-4 w-4 text-accent" />
                Find & Replace
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFindReplace(false)}
                className="h-6 w-6 p-0 hover:bg-accent/10 transition-all duration-200"
              >
                ×
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-sidebar-foreground mb-2 block">Find</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Enter text to find..."
                    value={findText}
                    onChange={(e) => setFindText(e.target.value)}
                    className="w-full rounded-lg border border-sidebar-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 transition-all duration-200"
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-2.5">
                      <div className="animate-spin h-4 w-4 border-2 border-accent border-t-transparent rounded-full"></div>
                    </div>
                  )}
                </div>
                {matches.length > 0 && (
                  <div className="flex items-center justify-between mt-2 animate-fade-in">
                    <span className="text-xs text-muted-foreground">
                      {currentMatchIndex + 1} of {matches.length} matches
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigateMatch("prev")}
                        className="h-6 w-6 p-0 hover:bg-accent/10 transition-all duration-200"
                        disabled={matches.length === 0}
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigateMatch("next")}
                        className="h-6 w-6 p-0 hover:bg-accent/10 transition-all duration-200"
                        disabled={matches.length === 0}
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-sidebar-foreground mb-2 block">Replace with</label>
                <input
                  type="text"
                  placeholder="Enter replacement text..."
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  className="w-full rounded-lg border border-sidebar-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 transition-all duration-200"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 gradient-primary text-white hover:shadow-medium transition-all duration-200"
                  onClick={handleSearch}
                  disabled={!findText.trim()}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Find
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 bg-transparent hover:bg-accent/10 hover:border-accent transition-all duration-200"
                  onClick={() => handleReplace()}
                  disabled={matches.length === 0 || !replaceText.trim()}
                >
                  <Replace className="h-4 w-4 mr-2" />
                  Replace
                </Button>
              </div>

              <Button
                size="sm"
                variant="secondary"
                className="w-full hover:shadow-soft transition-all duration-200"
                onClick={handleReplaceAll}
                disabled={matches.length === 0 || !replaceText.trim()}
              >
                Replace All ({matches.length})
              </Button>
            </div>

            <Separator className="my-4" />

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-sidebar-foreground mb-2 flex items-center gap-2">
                  <Brain className="h-4 w-4 text-accent" />
                  Smart Engine
                </h4>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded accent-accent"
                    checked={useSmartEngine}
                    onChange={(e) => setUseSmartEngine(e.target.checked)}
                  />
                  <span className="text-sidebar-foreground text-sm">Use AI-powered replacement</span>
                  {useSmartEngine && <Zap className="h-3 w-3 text-accent animate-pulse" />}
                </label>
              </div>

              <div>
                <h4 className="text-sm font-medium text-sidebar-foreground mb-2">Smart Options</h4>
                <div className="space-y-2 text-sm">
                  <label className="flex items-center gap-2 cursor-pointer hover:text-accent transition-colors duration-200">
                    <input type="checkbox" className="rounded accent-accent" defaultChecked />
                    <span className="text-sidebar-foreground">Context-aware replacement</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-accent transition-colors duration-200">
                    <input type="checkbox" className="rounded accent-accent" defaultChecked />
                    <span className="text-sidebar-foreground">Update links automatically</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-accent transition-colors duration-200">
                    <input type="checkbox" className="rounded accent-accent" defaultChecked />
                    <span className="text-sidebar-foreground">Replace in metadata</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-accent transition-colors duration-200">
                    <input type="checkbox" className="rounded accent-accent" defaultChecked />
                    <span className="text-sidebar-foreground">Entity detection</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer hover:text-accent transition-colors duration-200">
                    <input type="checkbox" className="rounded accent-accent" />
                    <span className="text-sidebar-foreground">Case sensitive</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {matches.length > 0 && (
            <div className="flex-1 overflow-hidden">
              <div className="p-4 border-b border-sidebar-border/50">
                <h4 className="text-sm font-medium text-sidebar-foreground mb-2 flex items-center gap-2">
                  <Eye className="h-4 w-4 text-accent" />
                  Smart Analysis Results
                </h4>
              </div>
              <div className="flex-1 overflow-y-auto">
                {matches.map((match, index) => (
                  <div
                    key={match.id}
                    className={`p-3 border-b border-sidebar-border/30 transition-all duration-200 hover:bg-accent/5 ${
                      index === currentMatchIndex ? "bg-accent/10 border-l-2 border-l-accent shadow-soft" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            match.type === "text"
                              ? "default"
                              : match.type === "link"
                                ? "secondary"
                                : match.type === "entity"
                                  ? "outline"
                                  : "destructive"
                          }
                          className="text-xs animate-scale-in"
                        >
                          {match.type}
                        </Badge>
                        <div className="flex items-center gap-1">
                          {match.confidence === "high" ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : match.confidence === "medium" ? (
                            <AlertTriangle className="h-3 w-3 text-yellow-500" />
                          ) : (
                            <AlertTriangle className="h-3 w-3 text-red-500" />
                          )}
                          <span className="text-xs text-muted-foreground capitalize">{match.confidence}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReplace(match.id)}
                        className="h-6 px-2 text-xs hover:bg-accent/10 hover:text-accent transition-all duration-200"
                      >
                        Replace
                      </Button>
                    </div>
                    <div className="text-xs text-sidebar-foreground/80 mb-1">
                      <span className="bg-yellow-200 dark:bg-yellow-800/50 px-1 rounded">{match.text}</span>
                      {match.suggestedReplacement && (
                        <>
                          {" → "}
                          <span className="bg-green-200 dark:bg-green-800/50 px-1 rounded">
                            {match.suggestedReplacement}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mb-1">{match.reasoning}</div>
                    {match.metadata?.originalUrl && (
                      <div className="text-xs text-muted-foreground">
                        URL: {match.metadata.originalUrl} → {match.metadata.newUrl}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground truncate mt-1 opacity-70">{match.context}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preview Panel */}
      {showPreview && matches.length > 0 && (
        <div className="w-96 border-l border-border/50 bg-background/80 backdrop-blur-sm animate-slide-up shadow-large">
          <PreviewPanel
            matches={matches}
            originalContent={editorRef.current?.innerHTML || sampleContent}
            onApproveChange={handleApproveChange}
            onRejectChange={handleRejectChange}
            onApproveAll={handleApproveAll}
            onRejectAll={handleRejectAll}
          />
        </div>
      )}

      {/* Brandkit Panel */}
      {showBrandkit && (
        <div className="w-96 border-l border-border/50 bg-background/80 backdrop-blur-sm animate-slide-up shadow-large">
          <BrandkitPanel
            content={editorRef.current?.innerHTML || sampleContent}
            onTermSelect={handleBrandTermSelect}
            onComplianceChange={handleComplianceChange}
          />
        </div>
      )}
    </div>
  )
}
