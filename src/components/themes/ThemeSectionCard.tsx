"use client"

import { useState, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface ThemeSectionCardProps {
  title: string
  icon: ReactNode
  children: ReactNode
  defaultOpen?: boolean
}

export function ThemeSectionCard({
  title,
  icon,
  children,
  defaultOpen = false,
}: ThemeSectionCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Card className="overflow-hidden border-border/70 shadow-sm">
      <CardHeader className="p-0">
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left hover:bg-muted/30"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">{title}</h2>
            </div>
          </div>
          <ChevronDown
            className={cn("h-5 w-5 text-muted-foreground transition-transform", isOpen && "rotate-180")}
          />
        </button>
      </CardHeader>

      <div
        className={cn(
          "grid transition-all duration-300 ease-out",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <CardContent className="space-y-6 border-t bg-background px-6 py-6">
            {children}
          </CardContent>
        </div>
      </div>
    </Card>
  )
}
