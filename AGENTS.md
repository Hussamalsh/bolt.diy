# AGENTS.md — bolt.diy

This file provides context and guidelines for AI coding agents (Claude, Copilot, Cursor, etc.) working on the bolt.diy codebase.

## Quick Reference

| Item               | Value                                         |
| ------------------ | --------------------------------------------- |
| Package name       | `adara-app-builder`                           |
| Framework          | Remix v2 + Vite                               |
| Language           | TypeScript (strict)                           |
| Runtime            | Cloudflare Workers (server), Browser (client) |
| Desktop            | Electron                                      |
| Package manager    | pnpm 9.14.4                                   |
| Node version       | >=20.0.0                                      |
| Path alias         | `~/` → `./app/`                               |
| State management   | Nanostores, Zustand                           |
| UI library         | React 18 + Radix UI + UnoCSS                  |
| AI SDK             | Vercel AI SDK v4                              |
| In-browser runtime | WebContainer API                              |

## Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Dev server (Remix + Vite on port 5173)
pnpm build            # Production build
pnpm test             # Run Vitest tests
pnpm lint             # Lint (ESLint)
pnpm lint:fix         # Lint fix + Prettier format
pnpm typecheck        # TypeScript type-check
pnpm electron:dev     # Electron dev mode
```

## Architecture Overview

bolt.diy is an AI-powered full-stack web development tool that runs entirely in the browser using WebContainers. Users interact through a chat interface to generate, edit, and preview code in real-time.

### Core Flow

1. User sends a prompt via the chat UI (`app/components/chat/`)
2. Prompt goes to `app/routes/api.chat.ts` → server-side LLM call via Vercel AI SDK
3. AI response is streamed back, parsed for file changes and shell commands
4. File changes are applied to the WebContainer (`app/lib/webcontainer/`)
5. The workbench (`app/components/workbench/`) shows the editor, terminal, and preview

### Key Directories

```
app/
├── components/           # React UI components by domain
│   ├── @settings/        # Settings panel
│   ├── chat/             # Chat interface (BaseChat, Messages, Prompt)
│   ├── editor/           # CodeMirror editor
│   ├── workbench/        # Main workbench (editor + terminal + preview)
│   └── ui/               # Shared primitives (Button, Dialog, etc.)
├── lib/
│   ├── .server/          # Server-only code (Remix convention, never bundled to client)
│   ├── stores/           # Nanostores atoms/maps (chat, files, editor, settings, etc.)
│   ├── hooks/            # React hooks
│   ├── services/         # Business logic services
│   ├── modules/          # Feature modules
│   ├── persistence/      # IndexedDB / storage abstractions
│   ├── webcontainer/     # WebContainer API integration
│   └── utils/            # Shared utilities
├── routes/               # Remix file-based routes (api.*.ts for API, _index.tsx for pages)
└── types/                # TypeScript type definitions
electron/                 # Electron main + preload scripts
functions/                # Cloudflare Pages Functions
```

### State Management

State lives in `app/lib/stores/` using nanostores (one file per domain):

- `chat.ts` — Chat messages, conversation state
- `files.ts` — File tree, file contents
- `editor.ts` — Editor state, open tabs
- `workbench.ts` — Workbench layout, panels
- `settings.ts` — User preferences
- `streaming.ts` — AI streaming state
- `terminal.ts` — Terminal instances
- `theme.ts` — Theme/appearance
- `auth.ts`, `profile.ts` — Authentication state

Subscribe with `useStore()` from `@nanostores/react`.

## Coding Rules

### Mandatory

1. **Path aliases only** — Use `~/` for all imports in `app/` code. Relative imports (`../`) are ESLint errors.

   ```ts
   // ✅ Correct
   import { workbenchStore } from '~/lib/stores/workbench';
   // ❌ Wrong
   import { workbenchStore } from '../../lib/stores/workbench';
   ```

2. **Strict TypeScript** — No `any` unless unavoidable. Use `import type` for type-only imports (`verbatimModuleSyntax` is on).

   ```ts
   import type { Message } from '~/types/chat';
   ```

3. **Semicolons required** — ESLint enforces `semi: always`.

4. **Curly braces required** — All `if/else/for/while` blocks need braces.

5. **Consistent return** — ESLint enforces `consistent-return`.

6. **Unix line endings** — LF only, no CRLF.

7. **No eval()** — Strictly forbidden.

8. **No inline styles** — Use UnoCSS utility classes instead.

### Patterns

- **Functional React components** with hooks only.
- **Radix UI** for accessible primitives (Dialog, Dropdown, Tooltip, etc.).
- **Nanostores** for shared state; **Zustand** for complex local state.
- **New API routes**: Create `app/routes/api.<name>.ts`, use `loader` (GET) / `action` (POST).
- **Server-only code**: Place in `app/lib/.server/` — Remix ensures it's never bundled to the client.
- **New AI providers**: Follow existing `@ai-sdk/*` integration patterns; keep provider-specific logic isolated.

### Platform Constraints

- **Server code runs on Cloudflare Workers** — avoid Node.js-only APIs (e.g., `fs`, `path`, `child_process`) in server code unless polyfilled.
- **Client file operations use WebContainer API** — never access the real filesystem from client code.
- **AI responses are streamed** — use the Vercel AI SDK streaming utilities; don't buffer full responses.
- **File locking** — the app has a lock system during AI code generation. Always respect lock states when modifying files.

## Testing

- Test framework: **Vitest** + **Testing Library**
- Run tests: `pnpm test` (single run) or `pnpm test:watch` (watch mode)
- E2E: Playwright (preview config at `playwright.config.preview.ts`)
- Write tests colocated with source or in a `__tests__/` directory

## Common Tasks

### Adding a new LLM provider

1. Install the `@ai-sdk/<provider>` package
2. Add provider config following existing patterns in `app/lib/.server/`
3. Register it in the provider list
4. Test with `pnpm dev`

### Adding a new settings panel

1. Create component in `app/components/@settings/`
2. Wire it into the settings navigation
3. Add any new state atoms in `app/lib/stores/settings.ts`

### Adding a new API endpoint

1. Create `app/routes/api.<name>.ts`
2. Export `loader` (GET) and/or `action` (POST/PUT/DELETE)
3. Keep business logic in `app/lib/services/` or `app/lib/.server/`

### Adding a new UI component

1. Create in `app/components/ui/` for shared primitives, or in the relevant domain folder
2. Use Radix UI for accessible patterns
3. Style with UnoCSS utility classes

## Don'ts

- Don't use relative imports (`../`) in `app/` code
- Don't use Node.js built-ins in client code without polyfills
- Don't add inline styles — use UnoCSS
- Don't create global mutable state outside nanostores/Zustand
- Don't commit `.env` files or API keys
- Don't use `any` type without justification
- Don't buffer full AI responses — always stream
