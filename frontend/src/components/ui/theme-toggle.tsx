"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button
        className="relative h-9 w-9 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md transition-colors hover:bg-white/10"
        aria-label="Toggle theme"
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <Sun className="h-4 w-4 text-white/70" />
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="relative h-9 w-9 rounded-xl border border-border bg-background/50 backdrop-blur-md transition-all duration-300 hover:bg-accent/10 hover:border-primary/50"
      aria-label="Toggle theme"
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-foreground/70" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-foreground/70" />
      </div>
    </button>
  )
}
