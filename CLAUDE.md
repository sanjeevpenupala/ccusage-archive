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
