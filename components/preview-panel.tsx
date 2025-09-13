"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { SmartMatch } from "@/lib/smart-replacement-engine"
import { Eye, EyeOff, Check, X, ArrowRight, FileText, Link, Mail, Building, CheckCircle2, Clock } from "lucide-react"

interface PreviewPanelProps {
  matches: SmartMatch[]
  originalContent: string
  onApproveChange: (matchId: string) => void
  onRejectChange: (matchId: string) => void
  onApproveAll: () => void
  onRejectAll: () => void
}

export function PreviewPanel({
  matches,
  originalContent,
  onApproveChange,
  onRejectChange,
  onApproveAll,
  onRejectAll,
}: PreviewPanelProps) {
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null)
  const [showDiff, setShowDiff] = useState(true)
  const [approvedChanges, setApprovedChanges] = useState<Set<string>>(new Set())
  const [rejectedChanges, setRejectedChanges] = useState<Set<string>>(new Set())

  const handleApprove = (matchId: string) => {
    setApprovedChanges((prev) => new Set([...prev, matchId]))
    setRejectedChanges((prev) => {
      const newSet = new Set(prev)
      newSet.delete(matchId)
      return newSet
    })
    onApproveChange(matchId)
  }

  const handleReject = (matchId: string) => {
    setRejectedChanges((prev) => new Set([...prev, matchId]))
    setApprovedChanges((prev) => {
      const newSet = new Set(prev)
      newSet.delete(matchId)
      return newSet
    })
    onRejectChange(matchId)
  }

  const getChangeStatus = (matchId: string) => {
    if (approvedChanges.has(matchId)) return "approved"
    if (rejectedChanges.has(matchId)) return "rejected"
    return "pending"
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "text":
        return <FileText className="h-4 w-4" />
      case "link":
        return <Link className="h-4 w-4" />
      case "email":
        return <Mail className="h-4 w-4" />
      case "entity":
        return <Building className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const generatePreviewContent = () => {
    let previewContent = originalContent
    const approvedMatches = matches.filter((match) => approvedChanges.has(match.id))

    // Apply approved changes in reverse order to maintain positions
    approvedMatches
      .sort((a, b) => b.position - a.position)
      .forEach((match) => {
        const beforeText = previewContent.substring(0, match.position)
        const afterText = previewContent.substring(match.position + match.text.length)
        previewContent = beforeText + match.suggestedReplacement + afterText
      })

    return previewContent
  }

  const pendingChanges = matches.filter((match) => !approvedChanges.has(match.id) && !rejectedChanges.has(match.id))
  const approvedCount = approvedChanges.size
  const rejectedCount = rejectedChanges.size

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Preview Changes
          </h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDiff(!showDiff)}
              className="flex items-center gap-1"
            >
              {showDiff ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {showDiff ? "Hide" : "Show"} Diff
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-yellow-500" />
            <span className="text-muted-foreground">{pendingChanges.length} pending</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            <span className="text-muted-foreground">{approvedCount} approved</span>
          </div>
          <div className="flex items-center gap-1">
            <X className="h-3 w-3 text-red-500" />
            <span className="text-muted-foreground">{rejectedCount} rejected</span>
          </div>
        </div>

        {/* Bulk Actions */}
        {matches.length > 0 && (
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={onApproveAll} disabled={approvedCount === matches.length} className="flex-1">
              <Check className="h-3 w-3 mr-1" />
              Approve All
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onRejectAll}
              disabled={rejectedCount === matches.length}
              className="flex-1 bg-transparent"
            >
              <X className="h-3 w-3 mr-1" />
              Reject All
            </Button>
          </div>
        )}
      </div>

      {matches.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center text-muted-foreground">
            <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No changes to preview</p>
            <p className="text-sm">Start a search to see intelligent replacements</p>
          </div>
        </div>
      ) : (
        <Tabs defaultValue="changes" className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2 mx-4 mt-2">
            <TabsTrigger value="changes">Individual Changes</TabsTrigger>
            <TabsTrigger value="preview">Full Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="changes" className="flex-1 mt-0">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
                {matches.map((match, index) => {
                  const status = getChangeStatus(match.id)
                  const isSelected = selectedMatch === match.id

                  return (
                    <Card
                      key={match.id}
                      className={`cursor-pointer transition-all ${isSelected ? "ring-2 ring-accent" : ""} ${
                        status === "approved"
                          ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
                          : status === "rejected"
                            ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
                            : ""
                      }`}
                      onClick={() => setSelectedMatch(isSelected ? null : match.id)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getTypeIcon(match.type)}
                            <Badge variant="outline" className="text-xs">
                              {match.type}
                            </Badge>
                            <Badge
                              variant={
                                match.confidence === "high"
                                  ? "default"
                                  : match.confidence === "medium"
                                    ? "secondary"
                                    : "destructive"
                              }
                              className="text-xs"
                            >
                              {match.confidence}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            {status === "approved" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                            {status === "rejected" && <X className="h-4 w-4 text-red-500" />}
                            {status === "pending" && <Clock className="h-4 w-4 text-yellow-500" />}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          {/* Change Preview */}
                          <div className="flex items-center gap-2 text-sm">
                            <span className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-1 rounded text-xs font-mono">
                              {match.text}
                            </span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded text-xs font-mono">
                              {match.suggestedReplacement}
                            </span>
                          </div>

                          {/* Reasoning */}
                          <p className="text-xs text-muted-foreground">{match.reasoning}</p>

                          {/* Metadata */}
                          {match.metadata?.originalUrl && (
                            <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                              <div className="font-medium mb-1">URL Update:</div>
                              <div className="break-all">
                                <span className="text-red-600">{match.metadata.originalUrl}</span>
                                <br />
                                <ArrowRight className="h-3 w-3 inline mr-1" />
                                <span className="text-green-600">{match.metadata.newUrl}</span>
                              </div>
                            </div>
                          )}

                          {/* Context */}
                          {isSelected && (
                            <div className="text-xs text-muted-foreground bg-muted p-2 rounded mt-2">
                              <div className="font-medium mb-1">Context:</div>
                              <div className="break-words">{match.context}</div>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleApprove(match.id)
                              }}
                              disabled={status === "approved"}
                              className="flex-1"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              {status === "approved" ? "Approved" : "Approve"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleReject(match.id)
                              }}
                              disabled={status === "rejected"}
                              className="flex-1"
                            >
                              <X className="h-3 w-3 mr-1" />
                              {status === "rejected" ? "Rejected" : "Reject"}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="preview" className="flex-1 mt-0">
            <div className="h-full flex flex-col">
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Content Preview</h4>
                  <Badge variant="outline">{approvedCount} changes applied</Badge>
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-4">
                  <Card>
                    <CardContent className="p-4">
                      <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{
                          __html: generatePreviewContent(),
                        }}
                      />
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
