# Contributing

## Dev Environment Setup

```
nvm use
npm install
npx lefthook install
```

`lefthook install` registers the git hooks (pre-commit, commit-msg, pre-push).

## Running Tests

Single run:

```
npm test
```

Watch mode:

```
npx vitest
```

Single file:

```
npx vitest run tests/months.test.ts
```

## Running Locally

```
npm start
```

This runs `src/index.ts` via tsx and writes snapshots to `./data/`.

## Commit Conventions

This project uses [Conventional Commits](https://www.conventionalcommits.org/).

```
<type>(<optional scope>): <description>

[optional body]

Refs: #<issue-number>
```

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`,
`build`, `ci`, `chore`, `revert`.

The `Refs:` footer is required and must reference a GitHub issue number
(e.g., `Refs: #12` or `Refs: #12, #34`). The commit-msg hook enforces this.

Subject line rules:
- Imperative mood ("add", not "adds" or "added")
- Max 72 characters
- No period at the end

## Branch Naming

```
<type>/<issue-id>-<short-description>
```

Examples:
- `feat/42-add-weekly-snapshots`
- `fix/17-handle-empty-ccusage-output`
- `chore/5-update-dependencies`

Allowed types match commit types above. Description must be lowercase
kebab-case. The pre-push hook validates this format.

## Code Style

Biome enforces formatting and linting. The pre-commit hook runs
`biome check --write` on staged files automatically. To run it manually:

```
npm run check
```

To check without applying fixes (useful for CI):

```
npm run check:ci
```
