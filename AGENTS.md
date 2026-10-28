# Repository instructions

- Keep this file light and limited to general repository guidance. Store feature context, requirements, decisions, progress, and implementation notes in `.scratch/<feature-slug>/`, never in `AGENTS.md`.

## Feature planning and grilling sessions

- Keep feature planning documents in `.scratch/<feature-slug>/` at the repository root. Do not create a `features/` folder for planning.
- Record settled decisions in `.scratch/<feature-slug>/decisions.md` and domain terminology in `.scratch/<feature-slug>/glossary.md`. Use these lowercase filenames.
- Do not create ADRs for this workflow. These instructions override the default document locations and ADR guidance in `grill-with-docs` and `domain-modeling`.
- Keep candidate topics, issue drafts and issue tracking in `.scratch/<feature-slug>/issues/`. Draft issues after the grilling session has concluded and the user has confirmed shared understanding; do not publish issues without authorization.
- After writing issue drafts, iterate on UI mockups before implementing this feature. Record accepted visual changes in the decisions and affected issues; mockup variations are proposals until accepted.
- Keep mockups focused on visual design and representative interactions. Record complete functionality and edge cases in issues instead of making the mockup reproduce the whole application.
- Distinguish confirmed decisions from proposals. Update the documents as decisions and terms are settled.
- During a grilling session, inspect the existing code to establish facts and ask the user for product decisions. Do not implement the feature until the user confirms shared understanding and authorizes implementation.
