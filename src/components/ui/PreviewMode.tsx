"use client";

import { createContext, useContext } from "react";

/**
 * Marks a subtree as "this is the admin's preview pane, not the real page".
 *
 * The only thing that reads it is `Reveal`, which animates on scroll. Inside the
 * preview those elements would sit at opacity 0 forever — they never enter the
 * *window's* viewport, because they are in a scrolling panel that is also
 * scaled. Preview mode renders them plainly instead.
 *
 * Deliberately a context rather than a prop: it would otherwise have to be
 * threaded through every section and every heading to reach one component.
 */
const PreviewModeContext = createContext(false);

export function usePreviewMode(): boolean {
  return useContext(PreviewModeContext);
}

export function PreviewMode({ children }: { children: React.ReactNode }) {
  return <PreviewModeContext.Provider value={true}>{children}</PreviewModeContext.Provider>;
}
