# Template-First Flow — Architecture Plan

**Status:** Approved, not yet implemented
**Date:** 2026-06-10
**Target release:** 2.0.0 (default-flow change in embedded consent UI = semver-major)

## Motivation

Current flow: user selects scopes → generates token → sees templates. This is backwards
from the user's mental model — non-technical users think in tasks ("I want a workout
planner"), not permission scopes. The initial human scoping decision is the weakest point
in the consent model; leading with tasks strengthens it while keeping full scope-level
control for power users.

**New flow:** templates first → pick one (with preview before committing) → scopes
auto-populate, visible and expanded → user reviews/modifies → generates token.

## Design principles

- **Template is a smart default, not a lock** — user always sees and can modify populated scopes.
- **Scopes expanded by default after template selection** — informed consent, no hidden permissions.
- **"Or select scopes manually"** — first-class path for power users, equal visual weight
  (same dark-pattern rule as Allow/Deny).
- **Guidance adapts to the final scope selection** — remove a scope and the template
  guidance updates; no stale recommendations.
- **Preview before commit** — staging a template shows exactly which scopes it would
  select + what the agent will be guided to do, before anything changes.
- **Mobile-responsive** — embedded in third-party apps; works at all container widths
  with the v1.1.0 stylesheet (container queries, 44px targets, dark mode, forced colors).

---

## Ground truth from the current code

Two existing concepts collide with this change:

1. **`templateQuickPicks`** (`TemplateQuickPick`: label, icon, `scopes[]`) — rendered by
   `ScopeSelector` as bulk-select pills. Already "template populates scopes," just buried
   inside step 1 where users don't think in tasks yet.
2. **`templates`** (`PromptTemplate`: title, subtitle, `requiredScopes[]`,
   `editableFields`, prompt body) — rendered by `PromptTemplates` only *after* token
   generation, filtered all-or-nothing by `hasAllScopes()` (`PromptTemplates.tsx`).

**Decisions:**
- Unify on `PromptTemplate` as the single template concept. It already has everything the
  new flow needs: `requiredScopes` to populate, prompt body + `editableFields` for guidance.
- Deprecate `templateQuickPicks`; internally map entries to guidance-less templates so
  existing hosts keep working.
- **The all-or-nothing filter dies for the selected template.** In the new flow, removing
  one scope would make the chosen template silently vanish — the opposite of "guidance
  adapts." Replaced by a degraded-guidance state (see `TemplateGuidance`).

---

## Flow & state machine

All flow state lives in `AgentAdmitPanel` (it already owns `selectedScopes`,
`selectedDuration`, and the token via `useAgentAdmit`):

```ts
mode: 'gallery' | 'template' | 'manual'   // new
stagedTemplateId: string | null            // new — previewing, not committed
selectedTemplateId: string | null          // new — committed
expandedGroups: Set<string>                // new — lifted from ScopeSelector
selectedScopes, selectedDuration           // existing
```

```
┌─ GALLERY ─────────────────────────────────────────────┐
│ TemplateGallery                                       │
│  card tap/click ──► STAGED (inline preview opens:     │
│    scope chips + "what the agent will do" + confirm)  │
│  hover/focus    ──► same preview, non-committal       │
│  [Use this template] ──► commit                       │
│  [Or select scopes manually] ──► manual               │
└──────────────┬───────────────────────┬────────────────┘
               ▼                       ▼
        mode='template'          mode='manual'
        scopes := t.requiredScopes    scopes := []
        groups w/ those scopes expand  ScopeSelector as today
               │                       │
               ▼                       ▼
┌─ REVIEW (both modes converge) ────────────────────────┐
│ TemplateSummaryBar ("Daily Coach · Change template")  │ ← template mode only
│ ScopeSelector — expanded, fully editable              │
│ TemplateGuidance — live preview, adapts to scope edits│
│ DurationPicker → Generate Token                       │
└──────────────┬────────────────────────────────────────┘
               ▼
        TokenDisplay + TemplateGuidance (copy w/ token)
```

**Transition rules:**
- **Staging ≠ selecting.** Staging is free browsing (stage another card, previous preview
  collapses). Only "Use this template" mutates `selectedScopes` — and it **replaces** them
  (template is a default, not additive).
- Scope edits in `template` mode never deselect the template; they only change what
  `TemplateGuidance` renders.
- **"Change template" = replace-with-confirm.** Returning to the gallery and committing a
  new template replaces scopes. If the user has hand-edited scopes since the last commit,
  show a confirmation before replacing. Never merge — merging undermines templates as
  predictable defaults. *(Decision confirmed.)*
- **No templates provided → gallery is skipped, manual mode is the default.** The current
  flow is the degenerate case. *(Decision confirmed.)*

---

## The preview interaction (touch-first)

Hover doesn't exist on the primary target (mobile WebViews), and hover-only content has
WCAG 1.4.13 problems. The **canonical interaction is tap-to-stage**: tapping a card
expands it in place (accordion — same pattern as today's `aa-template-card` /
`aa-template-header`) revealing:

- **Scope chips** — the exact pills that would be selected, colored with the existing
  `aa-pill-read/create/write/manage` classes so read vs write vs manage is legible
  *before* commit. This is the consent moment: no surprise permissions after the click.
- **"What your agent will do"** — `template.description` (new field), 1–2 sentences.
- **Confirm row** — `[Use this template]` primary; second tap / Escape collapses.

Desktop hover and keyboard focus show the *same* expanded preview (`aria-expanded` on
focus; pointer-enter stages visually). One state (`stagedTemplateId`), three input
methods, identical content — nothing hover-exclusive.

No popovers/portals — positioning inside unknown host containers is exactly what the
stylesheet architecture avoids. Accordion only.

---

## Component changes

### `AgentAdmitPanel` — owns the state machine (biggest diff)
- `onTemplateCommit(t)`:
  1. set `selectedTemplateId`, clear staged
  2. `setSelectedScopes([...t.requiredScopes])` (replace, not merge)
  3. expand every resource group containing one of those scopes (build a `scope → group`
     index from `scopeResources` once with `useMemo`)
  4. move focus to the Permissions section heading
  5. fire a polite live region: *"8 permissions selected by Daily Coach — review and
     adjust below."* (Focus move + announcement make informed consent real for
     screen-reader users.)
- New props:
  - `flow?: 'template-first' | 'scopes-first'` — default `'template-first'` at 2.0.0;
    old value is the escape hatch.
  - `onTemplateSelected?(template: PromptTemplate)` — host analytics hook; the metric for
    "strengthened initial scoping decision."
- **`onTokenGenerated` signature gains the template id**:
  `onTokenGenerated?(token, scopes, templateId: string | null)` — host backends can log
  *which task* the consent was granted for (audit trail). *(Decision confirmed.)*

### `TemplateGallery` — NEW (~120 lines)
- Cards from role-filtered `templates`; `isHero` keeps highlighted treatment; collapsed
  cards still show title, icon, subtitle, and a scope-count teaser ("5 permissions").
- Accordion preview per above; cards are buttons with `aria-expanded` + `aria-controls`,
  44px targets; staged card gets the `aa-preset-active`-style ring.
- Footer: "Or select scopes manually" — equal-weight secondary button.
- Gets `useStandaloneRoot` / `AapRootContext` treatment; individually exported.

### `ScopeSelector` — small, surgical
- Group expansion becomes **controlled-with-fallback**: optional `expandedGroups` /
  `onExpandedGroupsChange` props; internal state preserved when uncontrolled so the
  v1.1.0 standalone API is untouched.
- Drop embedded `templateQuickPicks` rendering when the panel runs template-first
  (gallery owns that job); keep for standalone/legacy use.
- Optional: `populatedScopes?: string[]` → subtle "from template" tint on untouched
  auto-selected pills. Nice-to-have, not load-bearing — visibility + editability are the
  consent mechanism, not provenance markers.
- No changes to pill toggle logic (read-implies rules in `handlePillToggle` already
  behave correctly when users modify a populated set).

### `PromptTemplates` — split into two roles
- Picking role → `TemplateGallery`.
- Guidance role → **`TemplateGuidance`** (NEW): props `template`, `selectedScopes`,
  `editableFields`, `token?`. Renders editable fields + compiled preview + copy button as
  today (`compileTemplate` and token-appending copy logic move over unchanged).
- **Adaptive guidance:** `missingScopes = template.requiredScopes − selectedScopes`.
  When non-empty: warning strip (uses `--aap-color-warning-text`), listing each missing
  scope in plain language with a one-tap "Re-add" chip (44px target); the compiled
  preview annotates affected instructions rather than disappearing. Scopes added beyond
  the template: `exampleCategories` already filters by `hasAnyScope`, so extra examples
  appear for free.
- `PromptTemplates` stays exported as a thin back-compat wrapper (public API in
  `index.ts`).

### Unchanged
`DurationPicker`, `TokenDisplay`, `ConnectionsList`, `AlertsPanel`,
`AgentAdmitAdminPanel`, all hooks (`useAgentAdmit`, `useAlerts`, `useAdminData`,
`useThemeClass`, `useStandaloneRoot`).

---

## Type changes (`types.ts`)

- `PromptTemplate` += `icon?: string`, `description?: string` (gallery/preview need them).
  Defer `optionalScopes?` — one populate source (`requiredScopes`) keeps one mental model
  for v1 of this flow.
- `ScopeSelectorProps` += `expandedGroups?`, `onExpandedGroupsChange?`, `populatedScopes?`.
- `AgentAdmitPanelProps` += `flow?`, `onTemplateSelected?`;
  `onTokenGenerated` gains third param `templateId: string | null`.
- `templateQuickPicks` gets `@deprecated` JSDoc (still honored via internal mapping to
  guidance-less templates).
- New exports: `TemplateGallery`, `TemplateGuidance`, `TemplateGalleryProps`,
  `TemplateGuidanceProps`.

---

## CSS additions (~10 classes; existing token system covers the rest)

`aa-template-gallery`, `aa-gallery-card`, `aa-gallery-card-staged`, `aa-gallery-preview`,
`aa-gallery-scope-chips` (reuses `aa-pill-*` colors at non-interactive chip size),
`aa-gallery-confirm-row`, `aa-manual-link`, `aa-template-summary-bar`,
`aa-guidance-warning`, `aa-readd-chip` (44px target).

- Container queries: 1-col cards < 400px, 2-col 400–639px, 3-col 640px+ (same breakpoints
  as `aa-preset-grid`).
- Dark mode / forced colors / reduced motion fall out of the token system; staged state
  needs one `[aria-expanded="true"]` forced-colors rule matching the pattern added in
  v1.1.0.
- All interactive elements: 44px touch targets, `:focus-visible` rings, text contrast
  ≥4.5:1 in both themes (extend the contrast verification script with new pairings).

---

## Implementation sequencing

1. **Types + `TemplateGuidance` extraction** — pure refactor, no behavior change;
   `PromptTemplates` becomes a wrapper. Ship as 1.x patch/minor.
2. **`ScopeSelector` controlled expansion + `TemplateGallery`** — additive, standalone-
   testable. Ship as 1.x minor.
3. **`AgentAdmitPanel` state machine behind `flow` prop** — default still
   `'scopes-first'`; hosts can opt in early.
4. **Flip default to `'template-first'`** — ship as **2.0.0** with migration notes
   (`flow="scopes-first"` is the one-line rollback).

---

## Resolved decisions

1. **No templates → skip gallery, manual default.** Confirmed.
2. **Change-template = replace-with-confirm** (confirm only when scopes were hand-edited
   since last commit). Never merge. Confirmed.
3. **`onTokenGenerated` includes `templateId`** for the host's audit trail — logs which
   task the consent was granted for. Confirmed.
