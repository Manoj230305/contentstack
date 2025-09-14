"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import axios from "axios"

export function ContentstackEditor() {
  const [content, setContent] = useState(`Example content: Alpha Company launched a revolutionary product last year. Visit "https://alpha.com" Alpha Company for more information. Contact us at "mailto:contact@alphacompany.com" contact@alphacompany.com.`)
  const [findText, setFindText] = useState("")
  const [replaceText, setReplaceText] = useState("")
  const [previewContent, setPreviewContent] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [replaceAll, setReplaceAll] = useState(false)

  const handleFindAndPreview = async () => {
    setIsLoading(true)
  
    try {
      const payload = {
        content,
        find: findText,
        replace: replaceText,
        replaceAll
      }
  
      const response = await axios.post("http://192.168.43.133:8000/api/smart-context-replace/", payload)
      setPreviewContent(response.data.rephrased)  // ← Use .rephrased instead of .modifiedContent
    } catch (error) {
      console.error("API Error:", error)
    } finally {
      setIsLoading(false)
    }
  }
 
  const handleApplyChanges = () => {
    if (previewContent !== null) {
      setContent(previewContent)
      setPreviewContent(null)
    }
  }

  const handleManualReplace = () => {
    if (!findText) return

    const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), replaceAll ? "gi" : "")
    const replaced = content.replace(regex, replaceText)
    setPreviewContent(replaced)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 p-6">
      <Card className="max-w-4xl mx-auto p-4 shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle>Contentstack Find & Replace</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-40 rounded-lg border p-3 text-sm"
            placeholder="Edit your content here..."
          />

          <div className="flex gap-4 items-center">
            <Input
              type="text"
              placeholder="Find"
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
              className="flex-1"
            />
            <Input
              type="text"
              placeholder="Replace with"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              className="flex-1"
            />
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={replaceAll}
                onChange={(e) => setReplaceAll(e.target.checked)}
                className="rounded accent-blue-500"
              />
              Replace All
            </label>
          </div>

          <div className="flex gap-4">
            <Button onClick={handleManualReplace} disabled={isLoading}>
              Manual Replace Preview
            </Button>

            <Button onClick={handleFindAndPreview} disabled={isLoading}>
              Server Replace Preview
            </Button>

            <Button
              onClick={handleApplyChanges}
              disabled={previewContent === null}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              Apply Preview to Content
            </Button>
          </div>

          {isLoading && <p className="text-muted-foreground">Processing...</p>}

          {previewContent && (
            <>
              <Separator className="my-4" />
              <h3 className="font-semibold">Preview Content:</h3>
              <div className="p-4 bg-gray-100 rounded-lg whitespace-pre-wrap border">
                {previewContent}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
