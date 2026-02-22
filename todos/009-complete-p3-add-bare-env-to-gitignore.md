---
status: pending
priority: p3
issue_id: "009"
tags: [code-review, security]
dependencies: []
---

# Add bare .env to .gitignore

## Problem Statement

`.gitignore` has `.env.*` which covers `.env.local`, `.env.production`, etc. But a bare `.env` file (no suffix) would not be matched and could be accidentally committed with secrets.

**Reported by:** security-sentinel

## Proposed Solutions

Add `.env` entry to `.gitignore` alongside `.env.*`.

- **Effort:** 1 line change
