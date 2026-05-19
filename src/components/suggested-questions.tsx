import * as React from "react"
import { cn } from "@/app/lib/utils"

export function SuggestedQuestions({ questions, onSelect }: { 
  questions: string[]; 
  onSelect: (q: string) => void 
}) {
  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {questions.map((q, i) => (
        <button
          key={i}
          onClick={() => onSelect(q)}
          className="text-xs px-3 py-1.5 rounded-full border bg-background hover:bg-muted transition-colors"
        >
          {q}
        </button>
      ))}
    </div>
  )
}