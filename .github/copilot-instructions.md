# Copilot Instructions for bolt.diy

## Project Overview

bolt.diy (package name: `adara-app-builder`) is an AI-powered full-stack web development tool that runs in the browser. It is the open-source version of Bolt.new and supports multiple LLM providers via the Vercel AI SDK. It also ships as an Electron desktop app.

## Tech Stack

- **Framework**: Remix (v2) on Vite, deployed to Cloudflare Pages
- **Language**: TypeScript (strict mode, ESNext target)
- **UI**: React 18, UnoCSS, Radix UI primitives, Framer Motion, Lucide/Phosphor icons
- **State Management**: Nanostores (`nanostores` + `@nanostores/react`), Zustand
- **Editor**: CodeMirror 6 with VSCode theme
- **Terminal**: xterm.js
- **Runtime**: WebContainer API (`@webcontainer/api`) for in-browser Node.js
- **AI SDK**: Vercel AI SDK v4 (`ai`, `@ai-sdk/*` providers)
- **Auth**: Firebase Authentication
- **Desktop**: Electron with electron-builder
- **Testing**: Vitest, Testing Library, Playwright (preview config)
- **Package Manager**: pnpm (v9.14.4)
- **Node**: >=20.0.0

## Project Structure

```
app/
  entry.client.tsx          # Client entry point
  entry.server.tsx          # Server entry point (Cloudflare)
  root.tsx                  # Root layout
  components/               # React components organized by domain
    @settings/              # Settings panel components
    auth/                   # Authentication UI
    chat/                   # Chat interface (prompt, messages, etc.)
    deploy/                 # Deployment UI (Netlify, Vercel, etc.)
    editor/                 # CodeMirror editor components
    git/                    # Git integration UI
    header/                 # App header/toolbar
    sidebar/                # Sidebar navigation
    ui/                     # Shared/base UI components (buttons, dialogs, etc.)
    workbench/              # Workbench layout (editor + terminal + preview)
  lib/
    .server/                # Server-only code (Remix convention)
    api/                    # API client helpers
    common/                 # Shared utilities
    hooks/                  # React hooks
    modules/                # Feature modules
    persistence/            # Storage/DB abstractions
    runtime/                # Runtime utilities
    services/               # Service layer
    stores/                 # Nanostores state (chat, editor, files, settings, etc.)
    utils/                  # General utilities
    webcontainer/           # WebContainer integration
  routes/                   # Remix file-based routing (API + pages)
  styles/                   # Global styles
  types/                    # TypeScript type definitions
  utils/                    # Route-level utilities
electron/                   # Electron main + preload processes
functions/                  # Cloudflare Pages Functions
scripts/                    # Build/dev scripts
public/                     # Static assets
docs/                       # MkDocs documentation site
```

## Coding Conventions

### Imports

- **Always use path aliases**: `~/` maps to `./app/`. Never use relative imports (`../`) in `app/` code — the ESLint config enforces this.
- Example: `import { workbenchStore } from '~/lib/stores/workbench';`

### TypeScript

- Strict mode is enabled. Do not use `any` unless absolutely necessary.
- Use `verbatimModuleSyntax` — use `import type` for type-only imports.
- Prefer explicit return types on exported functions.

### Code Style (ESLint enforced)

- Semicolons required (`semi: always`).
- Unix line endings (`linebreak-style: unix`).
- No `eval()`.
- `curly` braces required for all control flow.
- `consistent-return` enforced.
- Array brackets: no spacing. Object curlies: consistent newlines.
- Arrow functions: spaces around `=>`.

### React & Components

- Use functional components with hooks.
- Colocate component files with their domain folder under `app/components/`.
- Use Radix UI primitives for accessible UI patterns (dialogs, dropdowns, tooltips, etc.).
- Use `nanostores` for cross-component shared state; Zustand for complex local state.
- Prefer `@nanostores/react` hooks (`useStore`) for subscribing to stores.

### State Stores

- Store files live in `app/lib/stores/` — one file per domain (e.g., `chat.ts`, `editor.ts`, `files.ts`).
- Export atom/map stores from nanostores.
- Keep store logic side-effect free where possible; side effects go in services or hooks.

### API Routes

- Remix resource routes in `app/routes/` with `api.` prefix (e.g., `api.chat.ts`).
- Use `loader` for GET, `action` for POST/PUT/DELETE.
- Server-only code goes in `app/lib/.server/`.

### AI Provider Integration

- All LLM providers use the Vercel AI SDK pattern (`@ai-sdk/*`).
- Provider configs are modular — each provider is a separate integration.
- When adding a new provider, follow existing patterns in the codebase.

## Repository & Fork Setup

This is a **fork** of the upstream bolt.diy repo. Both remotes are configured:

| Remote     | URL                                                          |
| ---------- | ------------------------------------------------------------ |
| `origin`   | `https://github.com/Hussamalsh/bolt.diy.git` (our fork)      |
| `upstream` | `https://github.com/stackblitz-labs/bolt.diy.git` (original) |

### Pulling Upstream Updates

When syncing with the upstream repo, **always merge — never rebase or force-push** — to preserve our custom changes:

```bash
git fetch upstream
git merge upstream/main      # merge, do NOT rebase
# resolve any conflicts, keeping our customizations
git push origin main
```

**Critical**: During conflict resolution, always keep our custom code (branding, auth, provider configs, agent files, etc.) over upstream defaults. If upstream changes a file we've customized, merge carefully — don't blindly accept theirs.

Files that are **ours and should never be overwritten by upstream**:

- `.github/copilot-instructions.md`
- `AGENTS.md`
- `info.md`
- Any custom branding, auth, or deployment configs

## Environment & Running

```bash
pnpm install          # Install dependencies
pnpm dev              # Start dev server (Remix + Vite)
pnpm build            # Production build
pnpm test             # Run tests (Vitest)
pnpm lint             # Lint with ESLint
pnpm lint:fix         # Auto-fix lint + format with Prettier
pnpm typecheck        # TypeScript type checking
pnpm electron:dev     # Electron dev mode
```

## Key Patterns to Follow

1. **WebContainer**: The app runs user code in a WebContainer (in-browser Node.js). File operations go through the WebContainer API, not the real filesystem.
2. **Streaming**: AI responses are streamed. Use the AI SDK's streaming utilities.
3. **Multi-provider**: Code must be provider-agnostic where possible. Provider-specific logic is isolated.
4. **Cloudflare compatibility**: Server code runs on Cloudflare Workers. Avoid Node.js-only APIs in server code unless polyfilled.
5. **No relative imports**: Always use `~/` path alias in `app/` code.
6. **File locking**: The app has a file locking system for AI code generation — respect lock states.
7. **Diff view**: Changes from AI are shown in a diff view — ensure generated code produces clean diffs.

## Don'ts

- Don't import from `../` in app code — use `~/`.
- Don't use Node.js built-in modules in client code without polyfills.
- Don't add inline styles — use UnoCSS utility classes.
- Don't create global mutable state outside of nanostores/Zustand.
- Don't commit `.env` files or API keys.
