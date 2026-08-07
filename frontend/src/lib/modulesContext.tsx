"use client";

import { createContext, useContext } from "react";

interface ModulesContextValue {
  /** Set of enabled module slugs for the current company. null = still loading. */
  enabledSlugs: Set<string> | null;
}

export const ModulesContext = createContext<ModulesContextValue>({
  enabledSlugs: null,
});

export function useModules(): ModulesContextValue {
  return useContext(ModulesContext);
}
