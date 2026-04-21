## 1. Rule Entry Updates

- [x] 1.1 Update `AGENTS.md` with a concise context budget rule and task-size reading boundaries.
- [x] 1.2 Update `docs/README.md` to clarify that document reading is index-first and budgeted by task type.

## 2. Maintenance Contract Updates

- [x] 2.1 Update `openspec/specs/project-maintenance/spec.md` with the stable context budget requirements.
- [x] 2.2 Update `docs/dev/project-maintenance-playbook.md` with an execution checklist for context budget and context pollution review.
- [x] 2.3 Update `docs/dev/change-intake-template.md` so new requests capture what to read, what not to read, and when to escalate.

## 3. Verification

- [x] 3.1 Run keyword checks for context budget coverage across AGENTS, docs, and stable spec.
- [x] 3.2 Run `git diff --check`.
- [x] 3.3 Record that no business tests are required because this change only updates maintenance rules.

## 4. Stability Closure

- [x] 4.1 Confirm the rule relationship is clear: AGENTS as entry guardrail, docs README as locator, stable spec as contract, playbook as checklist, intake template as prompt skeleton.
- [x] 4.2 Confirm deferred items are explicit: no archive cleanup, no token automation tool, no docs tree rewrite.
