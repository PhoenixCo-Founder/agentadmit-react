/**
 * useStandaloneRoot — Gives individually-used components (ScopeSelector,
 * DurationPicker, TokenDisplay, PromptTemplates, ConnectionsList) a styled
 * root when they are NOT rendered inside an SDK panel.
 *
 * Standalone: returns "agent-admit-panel aa-dark|aa-light" so the component
 * gets the scoped reset, design tokens, container context, and theme.
 *
 * Nested (inside AgentAdmitPanel / AgentAdmitAdminPanel / AlertsPanel):
 * returns "" — a nested .agent-admit-panel root would re-declare the
 * light-theme tokens on itself and override dark-mode values inherited
 * from the parent panel, so the class must not be repeated.
 */

import { createContext, useContext } from 'react';
import { useThemeClass } from './useThemeClass';

/** True when rendering inside an .agent-admit-panel root provided by this SDK. */
export const AapRootContext = createContext(false);

export function useStandaloneRoot(theme?: 'light' | 'dark' | 'system'): string {
  const insideRoot = useContext(AapRootContext);
  const themeClass = useThemeClass(theme);
  return insideRoot ? '' : `agent-admit-panel ${themeClass}`;
}
