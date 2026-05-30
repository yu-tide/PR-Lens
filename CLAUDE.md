# PR Lens

## Project

AI PR Review Assistant.

Input:

```text
GitHub PR URL
```

Output:

```text
PR Summary
Risk Findings
Review Suggestions
Markdown Report
```

---

## MVP Scope

Implement:

* PR URL parsing
* GitHub PR fetching
* Changed files fetching
* Rule-based checks
* AI analysis
* Markdown report
* Mock mode

Do NOT implement:

* Login
* Database
* GitHub App
* Private repositories
* Auto comments
* Auto merge
* Review history
* Admin dashboard

---

## Tech Stack

* Next.js
* React
* TypeScript
* Tailwind CSS
* GitHub REST API

---

## Structure

```text
src/
  app/
  components/
  services/
    github/
    review/
    ai/
  types/
  utils/
  mocks/
```

---

## Rules

* TypeScript only
* Use camelCase
* No business logic in components
* Keep services focused
* Reuse types when possible

---

## File Limit

Single file:

```text
<= 200 lines
```

If exceeded:

* split component
* split service
* split utility

---

## Development Order

1. Mock Flow          ✅ PR1-4
2. GitHub Fetch       ✅ PR5
3. Rule Check         ✅ PR6
4. AI Analysis        ✅ PR7
5. Markdown Report    ✅ PR8
6. Error Handling     ✅ PR9

### PR10 — Polish & Refactor

- Documentation updates（README、CLAUDE.md、docs）
- Result page component extraction（~1300 lines → 10 sub-components）
- Stale change cleanup
- Final lint / build stabilization

---

## Mock Mode

Must work without:

* GitHub Token
* AI API Key

---

## Team

Use VS Code Live Share.

Both members must:

* use their own GitHub account
* submit their own commits
* participate in PR review

---

## PR Rule

One PR = One thing.

PR must include:

* Description
* Implementation
* Test Method
* Team Division

---

## Goal

Build a:

```text
Runnable
Demoable
Stable
Reviewable
```
