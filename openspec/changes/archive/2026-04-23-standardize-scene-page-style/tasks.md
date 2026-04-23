## 1. Audit And Boundary

- [x] 1.1 Audit `src/app/(app)/scene/[slug]/*`, `src/features/scene/components/*`, and `src/features/lesson/components/*` for page skeleton, section, action, status feedback, loading, and local style drift.
- [x] 1.2 Update `docs/system-design/ui-style-audit.md` with a scene page-family section that records scope, batch order, main-flow protection points, and explicit non-goals.
- [x] 1.3 Record repeated style candidates that should remain scene-local for now versus candidates that may later become shared components or global tokens.

## 2. First Low-Risk Style Batch

- [x] 2.1 Add or extend a scene page-family private style entry for page shell, section, action row, status, and skeleton classes without adding new global tokens.
- [x] 2.2 Consolidate `scene-detail-page`, `scene-base-view`, `loading`, and `scene-detail-skeleton` page skeleton and section classes.
- [x] 2.3 Preserve all learning state, session recovery, route state, audio action, practice, variants, and expression map conditional rendering.

## 3. Second Style Batch

- [x] 3.1 Consolidate primary and secondary action hierarchy in scene page-layer components.
- [x] 3.2 Consolidate practice, variants, and expression map visual patterns only after the base view batch remains stable.
- [x] 3.3 Leave TODO records for patterns that look reusable but still lack a stable cross-feature contract.

## 4. Validation

- [x] 4.1 Run scene-related eslint for touched files.
- [x] 4.2 Run the minimum relevant scene tests for route state, learning sync, page regression, practice, variants, loading/skeleton, and floating entry where touched.
- [x] 4.3 Run `git diff --check`.
- [x] 4.4 Run `openspec validate standardize-scene-page-style --strict`.

## Stability Closure

- Closure target: standardize the `scene` page family in controlled batches while keeping the learning main flow unchanged.
- Explicit non-goals: global token redesign, shared extraction of scene-private training components, chunks detail overlay, state-flow changes, data model changes, API changes, cache changes, and audio/practice behavior changes.
- Remaining risk location: record deferred style candidates and validation gaps in `docs/system-design/ui-style-audit.md`.

## Validation Notes

- `pnpm exec eslint 'src/app/(app)/scene/[slug]/scene-base-view.tsx' src/features/scene/components/scene-detail-skeleton.tsx src/features/scene/components/scene-page-styles.ts` passed.
- `pnpm exec eslint 'src/app/(app)/scene/[slug]/scene-detail-page.tsx'` is blocked by pre-existing `react-hooks/refs` render-time ref assignments and existing exhaustive-deps warnings; this style pass did not change those refs.
- `pnpm exec eslint src/features/scene/components/scene-page-styles.ts src/features/scene/components/scene-practice-view.tsx src/features/scene/components/scene-practice-question-card.tsx src/features/scene/components/scene-variants-view.tsx src/features/scene/components/scene-expression-map-view.tsx` passed.
- `pnpm exec node --import tsx --import ./src/test/setup-dom.ts --test 'src/app/(app)/scene/[[]slug[]]/loading.test.tsx' 'src/app/(app)/scene/[[]slug[]]/page.test.tsx'` passed.
- `pnpm exec node --import tsx --import ./src/test/setup-dom.ts --test 'src/app/(app)/scene/[[]slug[]]/page.regression.test.tsx'` passed.
- `pnpm exec node --import tsx --import ./src/test/setup-dom.ts --test src/features/scene/components/scene-practice-view.interaction.test.tsx src/features/scene/components/scene-variants-view.interaction.test.tsx src/features/scene/components/scene-expression-map-view.interaction.test.tsx` passed.
- `pnpm exec node --import tsx --test src/features/scene/components/scene-practice-selectors.test.ts src/features/scene/components/scene-view-labels.test.ts` passed.
- `node_modules\.bin\openspec.CMD validate standardize-scene-page-style --strict` passed.
