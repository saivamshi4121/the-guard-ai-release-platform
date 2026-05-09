"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";

/**
 * Theme provider keeps dark mode explicit and controllable (no CSS surprises).
 * We default to dark because this is internal infra tooling.
 */
export function ThemeProvider(props: ThemeProviderProps) {
  return <NextThemesProvider {...props} />;
}

