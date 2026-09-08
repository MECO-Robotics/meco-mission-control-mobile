# Agent guidance

Read [CONTRIBUTING.md](CONTRIBUTING.md) for commands and the shared contribution workflow.

- Implement in a dedicated worktree on a `feature/*` or `fix/*` branch based on `origin/development`. Keep base checkouts read-only; integrate through PRs.
- This is an undeployed prototype with disposable development data. Prefer a coherent replacement over compatibility scaffolding; update affected consumers and document deliberate resets or breaking changes.
- Read only the relevant cleanup queue rows and source files. Do not preload historical audits, generated indexes or optional adapter documentation.
- Give each behavior one clear owner and each value one authoritative representation. Prefer explicit dependencies and cohesive modules; delete redundant forwarding rather than splitting to satisfy line counts.
- For API, auth or schema changes, inspect platform validation and affected web/mobile consumers together. Keep the bootstrap contract and mapping aligned.
- Preserve intended behavior with relevant checks from CONTRIBUTING. Do not duplicate validation already performed by `verify`, invent test-count targets or claim checks that did not run.
- Stage only in-scope changes. Report validation results, limitations and any development state discarded.
- Shared skills and context engines are optional. Import or run them only when they help the task; never require generated context as onboarding.
