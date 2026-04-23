## Context

`scene` is the main learning workspace. Its UI spans `src/app/(app)/scene/[slug]/*`, `src/features/scene/components/*`, `src/features/lesson/components/*`, and lesson style helpers. The page family mixes reading, audio, expression saving, practice, variants, expression map, loading, fallback, and floating entry states.

Previous style consolidation has already started with Today and Review. `scene` should not be handled as scattered polish because it contains core route, session, learning sync, audio, practice, and variant conditions. This change keeps the large style pass Spec-Driven and separates planning from implementation.

## Goals

- Standardize one page family first: `scene`.
- Audit page skeleton, section framing, action hierarchy, status feedback, loading/skeleton, mobile layout, and local style constants.
- Prefer feature-private style constants for scene-specific UI before promoting anything to shared tokens or global components.
- Preserve all scene business behavior while improving visual consistency.
- Record explicit non-goals so the style pass does not become a hidden product or state-flow refactor.

## Non-Goals

- Do not change scene learning state, completion judgment, session restore, route query behavior, practice generation/submission, audio playback, expression save, variant unlock, or expression map data semantics.
- Do not rename the global design token system.
- Do not move strong scene/lesson training components into `src/components/*` only because they share visual patterns.
- Do not include chunks detail overlay in this change.

## Decisions

### Page Family Before Global System

We will standardize `scene` as a page family before doing cross-app token work. If repeated patterns are still clearly scene-specific, they stay under the scene or lesson feature boundary.

### Feature-Private Style Entry

The first implementation batch should introduce or extend a scene-local style constants entry. This gives the page family one place to express page shells, sections, action rows, status blocks, and skeleton spacing without prematurely changing global CSS.

### Batch Order

1. Audit and document the scene page family.
2. Consolidate low-risk page skeleton and loading/skeleton styles.
3. Consolidate primary/secondary action rows and section surfaces.
4. Consolidate practice, variants, and expression map only after the base view remains stable.
5. Stop when additional changes would require behavior, data, or shared component contract changes.

### Behavior Preservation

Implementation must keep existing handlers, conditional rendering, route-state writes, session recovery, learning sync, audio actions, practice state, variants state, and expression map conditions intact. Style helpers may replace class strings, but they must not alter when components render or which callbacks fire.

## Risks

- Scene visual cleanup can accidentally affect route/session/practice behavior because UI and flow logic are close together. Mitigation: keep edits scoped to class composition and run scene route, learning sync, practice, variant, and skeleton tests where available.
- Shared extraction too early can create a misleading component API. Mitigation: keep the first pass feature-local and record any repeated pattern as a follow-up candidate.
- Mobile regressions are likely if spacing and fixed elements are changed casually. Mitigation: include mobile layout in audit and avoid changing floating entry positioning unless covered by the relevant tests.

## Migration

No data, API, cache, or database migration is required. Implementation should be staged in small commits: audit first, base view second, then deeper scene subviews if tests remain stable.

## Stability Closure

- Closure target: establish a controlled scene style consolidation path and implement only batches that preserve main learning behavior.
- Deferred items: global token redesign, shared component extraction for scene training UI, chunks overlay, and behavior changes.
- Risk record location: `docs/system-design/ui-style-audit.md` and this change's `tasks.md`.
