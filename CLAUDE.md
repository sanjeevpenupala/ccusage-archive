# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

### Formatting (Biome-enforced)

Single quotes, 2-space indent, 100-character line width, semicolons always, auto-organized imports.

## Commit and Branch Conventions

Branches: `<type>/<issue-id>-<short-description>` (e.g., `feat/123-add-weekly-snapshots`). Allowed branch types: `feat`, `fix`, `perf`, `refactor`, `test`, `chore`. Description must be lowercase kebab-case.

Commits follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <description>

[optional body]

Refs: #x
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

**Subject line:** imperative mood, max 72 characters. Must complete: "If applied, this commit will **\<your subject\>**." Be specific ("Fix EXIF rotation causing landscape misclassification", not "Fix bug").

**Body:** the diff shows how; the body explains what and why. Wrap at 72 characters. Use bullet points for multiple distinct changes, prose paragraph for single-concern commits. Omit when the subject is sufficient.

## Development Workflow

Work on feature branches directly. Do not use git worktrees. Create the branch, switch to it, and work in place. One feature branch at a time.

## Design Context

### Users

Developers who use Claude Code and want lifetime visibility into their usage and spending. They open this locally — clone the repo, run a command, open an HTML file. Technical audience comfortable with the terminal, but they appreciate craft when they see it.

### Brand Personality

Refined, precise, delightful.

### Aesthetic Direction

- **Sexy but minimal.** Every element earns its place. Generous whitespace, tight typography, purposeful color.
- **Dark mode default**, light mode via `prefers-color-scheme`. No manual toggle — respect the system setting.
- **Monospace for data**, system sans-serif for labels and prose. Numbers are the star — give them room to breathe.
- **Accent palette:** muted blues as the primary data color, with secondary hues for model/token breakdowns. Avoid neon, avoid grey-on-grey.
- **Charts:** clean, no gridline clutter, smooth transitions on hover. Tooltips over labels where possible.
- **Self-contained HTML** — Chart.js inlined, no CDN, works offline and via `file://`.

### Anti-references

- Generic Bootstrap/corporate dashboards
- Over-designed SaaS marketing pages
- Raw terminal dump aesthetics
- Neon/cyberpunk busy visuals

### Design Principles

1. **Data is the interface.** Strip away everything that isn't helping the user read a number, spot a trend, or compare a cost. If a UI element doesn't serve the data, remove it.
2. **Surprisingly polished.** This is a local dev tool — people expect spartan. Exceed that expectation with considered typography, smooth interactions, and a cohesive color system.
3. **Quiet confidence.** No flashy animations, no gratuitous gradients. Subtle transitions, precise alignment, restrained color. The design should feel inevitable, not decorated.
4. **Progressive density.** Start with the big picture (summary stats, cost trend), let users drill into detail (model breakdowns, daily granularity) on demand. Don't overwhelm on first load.
