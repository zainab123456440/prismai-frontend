import * as React from "react"
import { cn } from "@/app/lib/utils"

export function NavBar({ className }: React.ComponentProps<"nav">) {
  return (
    <nav className={cn("flex h-16 items-center border-b px-6 justify-between", className)}>
      <div className="flex items-center gap-4">
        <h2 className="text-sm font-medium">Dashboard / RAG Assistant</h2>
      </div>
      <div className="flex items-center gap-4">
        <div className="h-8 w-8 rounded-full bg-primary/10 border flex items-center justify-center text-xs font-bold">
          ZI
        </div>
      </div>
    </nav>
  )
}