---
description: Browser-backed frontend quality review for hierarchy, responsiveness, and polish
action: browser-backed UI review
---

You are performing a frontend quality review for completed UI-affecting changes.

Goal:
Catch user-facing design and responsiveness issues that functional tests or diff review miss.

Preflight (required):

- Read `agent-docs/exec-plans/active/COORDINATION_LEDGER.md` before review.
- Honor any explicit exclusive/refactor notes from the ledger; otherwise work carefully on top of active rows without reverting adjacent edits.

Execution requirements:

- Use browser inspection, not diff-only inference.
- Inspect the changed route(s) at at least one desktop width and one mobile width.
- Prefer `chrome-devtools take-snapshot` first, then inspect any relevant interaction states.
- If screenshots, mocks, or a mood board were provided in the task, compare the rendered result against them.

Review for:

- weak visual hierarchy or unclear first impression
- marketing pages that feel generic, overbuilt, or card-heavy
- product pages that read like marketing instead of utility UI
- weak brand presence on branded surfaces
- clutter in the first viewport or too many competing ideas in a section
- missing visual anchor where the page needs one
- overflow, overlap, clipped content, or broken spacing at mobile/desktop widths
- fixed/floating UI that collides with content or CTAs
- motion that is distracting, ornamental-only, or inconsistent with the page

Surface-specific checks:

- For marketing/branded routes: check for one clear composition, brand-first hierarchy, restrained hero content, and a dominant visual idea.
- For product/app routes: check for utility-first copy, immediate scanability, calm surface hierarchy, and cards only where interaction requires them.

Output requirements:

- Return findings ordered by severity (`high`, `medium`, `low`).
- For each finding include: `severity`, `file:line`, `issue`, `impact`, `recommended fix`.
- Include an `Open questions / assumptions` section when uncertainty remains.
- If no findings exist, state that explicitly and list any residual risk areas.

Parallel-agent output:

- Please return your final response as a set of copy/paste-ready prompts for parallel agents rather than as a normal prose review.
- Create one prompt per distinct issue or tightly related issue cluster.
- In each prompt, describe the issue in detail, explain why it matters, point to the relevant files, routes, or interaction states, and include your best guess at a concrete fix.
- Make each prompt self-contained and specific enough that we can hand it directly to an agent with minimal extra context.
- If you find no actionable issues, say so explicitly instead of inventing prompts.
