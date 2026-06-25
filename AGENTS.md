# AGENTS.md

> Workspace entry point for AI coding agents.

## Rule Source Of Truth

- Read [.agents/ARCHITECTURE.md](.agents/ARCHITECTURE.md) first.
- Then read [.agents/rules/GEMINI.md](.agents/rules/GEMINI.md).
- Treat `.agents/` as the authoritative AG Kit bundle for agents, skills, workflows, and memory.

## Loading Policy

- Do not load every skill folder.
- Read a skill's `SKILL.md` only when the task matches its `when_to_use` or description.
- Prefer the smallest relevant agent/skill set for the request.

## Change Policy

- Keep `.agents/` in the workspace so the editor can index it.
- Do not add secret values or environment tokens to committed instructions.
- Use the project verification scripts in `.agents/scripts/` when a task needs final validation.

## Practical Routing

- Web UI and React work: prefer frontend-oriented skills.
- API, data, and sync work: prefer backend/database-oriented skills.
- Testing and debugging: prefer the matching testing or systematic-debugging skills.
