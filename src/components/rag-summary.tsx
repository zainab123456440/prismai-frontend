import * as React from "react"
import { cn } from "@/app/lib/utils"
import { Card, CardContent } from "./ui/card"

export function RAGSummarizer({ summary, isLoading }: { summary: string; isLoading?: boolean }) {
  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardContent className="p-6">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
          ✨ AI Summary
        </h3>
        {isLoading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-muted rounded w-full"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {summary || "Upload a document to see an AI-generated summary here."}
          </p>
        )}
      </CardContent>
    </Card>
  )
}