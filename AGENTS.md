# Repository instructions

## Feature planning and grilling sessions

- Keep feature planning documents in `.scratch/<feature-slug>/` at the repository root. Do not create a `features/` folder for planning.
- Record settled decisions in `.scratch/<feature-slug>/decisions.md` and domain terminology in `.scratch/<feature-slug>/glossary.md`. Use these lowercase filenames.
- Do not create ADRs for this workflow. These instructions override the default document locations and ADR guidance in `grill-with-docs` and `domain-modeling`.
- Keep candidate topics, issue drafts and issue tracking in `.scratch/<feature-slug>/issues/`. Draft issues after the grilling session has concluded and the user has confirmed shared understanding; do not publish issues without authorization.
- After writing issue drafts, iterate on UI mockups before implementing this feature. Record accepted visual changes in the decisions and affected issues; mockup variations are proposals until accepted.
- Keep mockups focused on visual design and representative interactions. Record complete functionality and edge cases in issues instead of making the mockup reproduce the whole application.
- Distinguish confirmed decisions from proposals. Update the documents as decisions and terms are settled.
- During a grilling session, inspect the existing code to establish facts and ask the user for product decisions. Do not implement the feature until the user confirms shared understanding and authorizes implementation.

## Current feature

- Feature slug: `categories-page-rework`.
- Planning folder: `.scratch/categories-page-rework/`; issue drafts: `.scratch/categories-page-rework/issues/`.
- Target: the Summary screen at `/summary`, not the separate category maintenance screen at `/categories`.
- Confirmed desktop layout: categories on the left and the selected category's transactions on the right, with independent scrolling. On wide screens, allow one pinned category beside the main selected category, for a maximum of two transaction panes.
- On mobile, category selection opens full-width transactions with a visible category name and totals; Back restores the category list position.
- Month notes remain accessible through a Notes button and a temporary drawer, hidden by default. Category notes remain associated with their category.
- Support dragging transactions between categories when the screen is large enough. Use the existing transaction editor to change category when dragging is impractical; no separate move action is needed.
- Keep Pending separately selectable, with no dragging out or dropping in, and preserve all existing budget calculation rules. Pending charges are deleted and recreated during auto-import; occasional category edits use the existing editor.
- Uncategorized is a work queue for transactions without a category, not an ordinary budget category. Opening it and assigning transactions is a common workflow that the redesign must support.
- Keep Uncategorized near the top with a count, accessible when empty and pinnable beside a destination category. Keep its queue open after moves, including after the last transaction is assigned. Dropping into Uncategorized clears the assignment; Income may also accept drops.
- Do not automatically open Uncategorized. Restore transaction scroll positions when switching views, keep the source position during moves, and reset positions and pins on month change.
- Provide Pin and Unpin controls; selecting the pinned view focuses its existing pane instead of opening a duplicate.
- Month notes use a side drawer on desktop and a full-width overlay on phones. Save on field exit or close; preserve text and report failed saves.
- Initial desktop entry shows a Select a category prompt; mobile starts at the category list. Explicit dashboard links open their requested category, Pending or Uncategorized directly.
- Pending can be pinned for comparison, while dragging out and dropping in remain disabled.
- Use compact transaction rows inspired by the supplied screenshot. Keep the explicit budgeted and left labels on category items.
- Reuse the existing global Undo/Redo engine and controls. Do not add a separate Undo button to Summary.
- Use a generic Angular Material right drawer scoped to the Summary browsing section below the overview, with projected header, content and action slots. Notes, category editing and transaction editing are distinct views; only one opens at a time. Do not combine their forms.
- Only Summary adopts the drawer editors initially. Preserve legacy modal entry points elsewhere and all editor capabilities through reusable form content.
- Category/transaction editing uses explicit Save/Cancel and a discard guard for unsaved changes. Notes retain automatic saving. Show complete split groups vertically, with totals and save controls visible while scrolling.
- Connect selected/pinned category rows to their transaction panes using matching accents and thin circuit-style paths through gaps or behind panels. Editor drawers inherit their originating pane accent. Mobile uses matching accents without connector lines.
- Planning status: behavior and refined visual design approved; all nine local issues are ready for implementation. Production implementation has not started. Issues remain local.
