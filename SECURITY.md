# Security Policy

## Supported versions

Only the latest release receives security fixes.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Email **will.j.baldwin@gmail.com** with:

- A description of the vulnerability
- Steps to reproduce
- Potential impact

You will receive a response within 72 hours. If the vulnerability is confirmed, a patch will be released as soon as possible and you will be credited in the release notes (unless you prefer to remain anonymous).

## Threat model

Gomaae is a local-first desktop application. Data is stored in SQLite at
`<workspace>/Tickets/project.db` and is not transmitted to any server other than:

- **Anthropic API** — AI scoring and content generation (controlled by your API key)
- **Linear API** — ticket sync (controlled by your Linear OAuth token)
- **GitHub API** — branch activity and release checks (unauthenticated for public repos)

API keys are stored in `config.yaml` on disk (not in the OS keychain). Treat this file
as sensitive.
