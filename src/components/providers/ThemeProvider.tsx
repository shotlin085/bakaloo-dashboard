"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes"

// ─── Dark mode kill-switch ──────────────────────────────────────────────
// Dark mode is fully built (next-themes + the `.dark` token block in
// globals.css) but disabled product-side — the dashboard should always
// render light, regardless of OS/browser preference, with no user-facing
// way to switch into dark. Flip this to `true` to bring back system
// detection and the manual toggle (ThemeToggle reads this same flag) —
// no other code needs to change.
export const DARK_MODE_ENABLED = false

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  if (!DARK_MODE_ENABLED) {
    return (
      <NextThemesProvider
        {...props}
        forcedTheme="light"
        defaultTheme="light"
        enableSystem={false}
      >
        {children}
      </NextThemesProvider>
    )
  }

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
