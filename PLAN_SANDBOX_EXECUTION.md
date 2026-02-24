# Plan: Sandbox Execution for Generated Code

## Current State

Today, all generated code runs **in-browser via iframe `srcdoc`**. The backend generates single-file HTML (with inline CSS/JS and CDN dependencies like Tailwind, Bootstrap, Ionic, Vue, React via Babel) and streams it to the frontend over WebSocket. The frontend renders it in an iframe.

### Limitations of the Current Approach

1. **Single-file only** — everything must be inlined into one HTML file with CDN scripts. No `node_modules`, no build step, no multi-file projects.
2. **No real framework support** — React/Vue are loaded via CDN globals + Babel-in-browser, not how real apps work. No JSX compilation, no component files, no imports.
3. **No server-side code** — can't generate or run backends, APIs, databases, or full-stack apps.
4. **No npm packages** — limited to whatever is available via CDN `<script>` tags.
5. **Security** — generated code with `allow-same-origin` runs in the same security context; malicious generated JS could access parent page state.
6. **No persistent state** — each preview is stateless; can't demo apps that write to disk, use SQLite, etc.

---

## High-Level Architecture with Sandboxes

```
┌──────────────┐     WebSocket      ┌──────────────┐    Sandbox API    ┌──────────────┐
│   Frontend   │◄──────────────────►│   Backend    │◄────────────────►│   Sandbox    │
│              │                    │              │                   │  (per user)  │
│  Preview     │◄───── iframe ──────┤              │                   │              │
│  (iframe src │   sandbox URL      │  Code Gen    │   create/write/   │  Node/Vite   │
│   = sandbox) │                    │  Pipeline    │   exec/preview    │  Dev Server  │
└──────────────┘                    └──────────────┘                   └──────────────┘
```

Instead of setting `iframe.srcdoc = html`, the frontend points the iframe `src` at a URL served by the sandbox's dev server. The backend writes generated files into the sandbox filesystem, and the sandbox runs a dev server (Vite, Next.js, etc.) that serves the result.

---

## Sandbox API: Required Features

### 1. Filesystem Operations

| Feature | Why |
|---|---|
| **Write file** (`PUT /files/{path}`) | Write generated code files (components, pages, configs) into the sandbox filesystem |
| **Write multiple files atomically** (`POST /files/batch`) | Write an entire project scaffold at once (package.json, vite.config, src/App.tsx, etc.) without triggering intermediate rebuilds |
| **Read file** (`GET /files/{path}`) | Read current file state for the `edit_file` agent tool and for "update" generation mode |
| **List files** (`GET /files?path=/src`) | Let the agent understand project structure for multi-file edits |
| **Delete file** (`DELETE /files/{path}`) | Clean up unused files during edits |

### 2. Command Execution

| Feature | Why |
|---|---|
| **Run command** (`POST /exec`) | Run `npm install`, `npx create-vite`, build commands, linters, etc. |
| **Streaming stdout/stderr** | Stream command output back so the agent (and user) can see progress and errors in real-time |
| **Background processes** (`POST /exec?background=true`) | Start long-running dev servers (`npm run dev`) that persist |
| **Kill process** (`DELETE /exec/{pid}`) | Stop/restart dev servers when config changes |
| **Process status** (`GET /exec/{pid}`) | Check if dev server is running, get its port |

### 3. Preview / Networking

| Feature | Why |
|---|---|
| **Expose port → public URL** | Map the sandbox's internal port (e.g., `localhost:5173`) to a publicly accessible URL that the frontend iframe can load |
| **HTTPS with valid cert** | Browsers require HTTPS for many APIs; sandbox preview URLs should be HTTPS |
| **URL stability** | The preview URL should remain stable across sandbox restarts so the iframe doesn't need to be reconfigured |
| **Multiple ports** | Support exposing multiple ports (frontend on 5173, backend API on 3000) for full-stack apps |

### 4. Lifecycle Management

| Feature | Why |
|---|---|
| **Fast cold start** (<1s ideal) | Users are watching code stream in real-time; sandbox must be ready before first file write |
| **Warm/snapshot start** | Pre-warm sandboxes with common templates (Vite+React, Next.js, etc.) so `npm install` is already done |
| **Idle timeout with hibernate** | Don't burn resources on idle sandboxes, but resume quickly when user returns |
| **Session affinity** | Same user editing the same project should get the same sandbox back |
| **Cleanup/destroy** | Explicit teardown when user is done or session expires |

### 5. Templates / Snapshots

| Feature | Why |
|---|---|
| **Pre-built template images** | Sandbox images with `node_modules` pre-installed for each stack (React+Tailwind, Vue+Tailwind, Next.js, etc.) |
| **Snapshot/fork** | Save current sandbox state as a snapshot; fork from it for variants. This maps perfectly to the existing "5 variants" model — fork 5 sandboxes from the same base |
| **Template registry** | List available templates so the backend can pick the right one per stack |

---

## Desired Features Beyond the Basics

### 6. Hot Module Replacement (HMR) Awareness

The sandbox should support Vite/Webpack HMR natively. When the backend writes a file change, the dev server's HMR should push the update to the iframe without a full page reload. This gives a much smoother editing UX than reloading the entire page.

**What the API needs:** File writes should trigger the filesystem watcher that the dev server already relies on. No special API needed — just ensure the sandbox filesystem supports `inotify`/`fswatch` events.

### 7. Error Reporting

| Feature | Why |
|---|---|
| **Build error capture** | If the dev server fails to compile, return structured error info (file, line, message) that the agent can use to self-correct |
| **Runtime error capture** | Capture uncaught exceptions and console errors from the running preview, feed them back to the agent |
| **Health check endpoint** | Quick check: is the dev server up and serving? Did the last build succeed? |

This enables an **agent self-repair loop**: generate code → sandbox reports build error → agent reads error → agent fixes code → sandbox rebuilds → success.

### 8. Resource Limits & Isolation

| Feature | Why |
|---|---|
| **CPU/memory limits** | Prevent runaway generated code from consuming unbounded resources |
| **Network egress control** | Generated code shouldn't be able to make arbitrary external requests (or should be limited) |
| **Filesystem size limits** | Cap total disk usage per sandbox |
| **Process count limits** | Prevent fork bombs from generated code |

### 9. Screenshot / Visual Diff

| Feature | Why |
|---|---|
| **Server-side screenshot** (`GET /screenshot?url=...&viewport=1366x768`) | Capture a screenshot of the rendered page from inside the sandbox (headless browser). Eliminates reliance on `html2canvas` in the frontend |
| **Multiple viewports** | Take screenshots at desktop and mobile sizes for responsive comparison |

This is critical for the **eval pipeline** and for the agent to visually compare its output against the original screenshot.

### 10. Persistent Storage (Nice to Have)

| Feature | Why |
|---|---|
| **Volume mounts** | Persist project state across sandbox restarts (e.g., SQLite databases for generated full-stack apps) |
| **Shared volumes** | Share assets/data between sandboxes |

---

## Integration Plan: How the Codebase Changes

### Phase 1: Backend — New Sandbox Agent Tools

Replace the current `create_file` / `edit_file` tools (which operate on virtual in-memory files) with sandbox-backed equivalents:

| Current Tool | New Tool | Change |
|---|---|---|
| `create_file(path, content)` | `sandbox_write_file(path, content)` | Writes to sandbox filesystem instead of accumulating in memory |
| `edit_file(old_text, new_text)` | `sandbox_edit_file(path, old_text, new_text)` | Reads file from sandbox, applies edit, writes back |
| *(new)* | `sandbox_exec(command)` | Run shell commands (npm install, etc.) |
| *(new)* | `sandbox_screenshot()` | Capture current preview state |

The agent loop in `/backend/agent/engine.py` already supports tool calling and iteration. Adding sandbox-backed tools fits naturally.

### Phase 2: Backend — Sandbox Lifecycle in Pipeline

Add sandbox management to the generation pipeline middlewares:

1. **SandboxProvisionMiddleware** — Before code generation starts, provision a sandbox from the appropriate template based on the selected stack (html_tailwind → Vite+Tailwind template, react_tailwind → Vite+React+Tailwind template, etc.)
2. **SandboxTeardownMiddleware** — After generation completes (or on error/timeout), handle sandbox cleanup or hibernation

For the **variants model** (currently 5 parallel generations):
- Option A: One sandbox per variant (most isolated, enables snapshot/fork)
- Option B: Shared sandbox, each variant writes to a branch directory (cheaper but more complex)

Recommendation: **One sandbox per variant** using fork/snapshot for fast startup.

### Phase 3: Frontend — iframe Points at Sandbox URL

```typescript
// Before (current):
iframe.srcdoc = generatedHtml;

// After (sandbox):
iframe.src = sandboxPreviewUrl; // e.g., https://sandbox-abc123.example.com
```

Changes needed:
- `PreviewComponent.tsx`: Accept a `previewUrl` prop instead of (or in addition to) `code`
- WebSocket messages: Add a `"previewUrl"` message type alongside `"setCode"`
- Still support `srcdoc` as fallback for simple HTML-only generation (no sandbox needed)
- Remove `html2canvas` screenshot logic; use sandbox screenshot API instead

### Phase 4: Stack Expansion

With sandbox execution, we can support real project structures:

| Stack | Template | Dev Server |
|---|---|---|
| `html_tailwind` | Static HTML + Tailwind CLI | Simple HTTP server |
| `react_tailwind` | Vite + React + Tailwind | `vite dev` |
| `vue_tailwind` | Vite + Vue + Tailwind | `vite dev` |
| `nextjs` | Next.js + Tailwind | `next dev` |
| `svelte` | SvelteKit + Tailwind | `vite dev` |
| `fullstack` | Next.js + API routes + SQLite | `next dev` |

The agent would generate proper multi-file project code: `src/App.tsx`, `src/components/Header.tsx`, `tailwind.config.js`, etc.

---

## Summary: Sandbox API Feature Wishlist (Prioritized)

### Must Have
1. **File write (single + batch)** — write generated code into sandbox
2. **Command execution with streaming output** — run `npm install`, dev servers
3. **Background process management** — start/stop dev servers
4. **Port exposure → public HTTPS URL** — preview in iframe
5. **Fast cold start** (<2s) — don't break the real-time streaming UX
6. **Template/snapshot support** — pre-warmed environments with node_modules ready
7. **File read** — agent needs to read files for edits

### Should Have
8. **Build error capture (structured)** — enable agent self-repair loop
9. **Fork/clone sandbox** — efficient variant generation
10. **Resource limits** (CPU, memory, disk, processes) — protect infrastructure
11. **Server-side screenshot** — replace html2canvas, enable visual diff
12. **Idle hibernate + fast resume** — cost control

### Nice to Have
13. **Runtime error capture** (console errors, uncaught exceptions)
14. **Multiple port exposure** — full-stack apps
15. **Persistent volumes** — stateful apps across sessions
16. **Git integration** — export sandbox as a git repo / push to GitHub
17. **Collaborative access** — multiple users viewing same sandbox preview
