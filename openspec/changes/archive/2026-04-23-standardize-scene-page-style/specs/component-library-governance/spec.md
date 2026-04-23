## ADDED Requirements

### Requirement: Page-family UI consolidation must be audited and batched

The system MUST require maintainers to record scope, batch order, main-flow protection points, and explicit non-goals before consolidating styles for a page family such as `scene`.

#### Scenario: Maintainer prepares to standardize the scene page family

- **WHEN** a maintainer prepares to standardize the page skeleton, sections, action hierarchy, status feedback, or local style constants for the `scene` page family
- **THEN** they MUST first record the affected files, page roles, primary action hierarchy, and minimum validation scope
- **AND** they MUST preserve scene reading, audio, expression saving, practice, variants, session recovery, and learning-state writeback semantics
- **AND** they MUST NOT promote scene-private training components to global shared components or global tokens only because they look visually similar

#### Scenario: Maintainer discovers repeated scene-local styles

- **WHEN** repeated class patterns are found across `scene` page-layer components, scene feature components, or lesson reader components
- **THEN** the maintainer MUST first prefer a page-family or feature-private style entry when the pattern depends on scene learning semantics
- **AND** they MUST record any candidate for future shared extraction instead of extracting it during the same batch without a stable cross-feature contract
