"use client";

import { createContext, useContext } from "react";

/** True while a Manager/Company Admin has "View as Employee" turned on from
 * the user menu — pages should hide their admin-only tabs/actions while this
 * is on, on top of DashboardShell already hiding admin-only sidebar links. */
export const ViewAsEmployeeContext = createContext<boolean>(false);

export function useViewAsEmployee(): boolean {
  return useContext(ViewAsEmployeeContext);
}
