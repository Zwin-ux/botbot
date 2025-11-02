# Project Structure & Organization

## Monorepo Layout

BotBot follows a Turborepo monorepo structure with clear separation between applications and shared packages:

```
botbot/
├── apps/                    # Applications
│   ├── bot/                # Discord bot application
│   └── web/                # Next.js web application
├── packages/               # Shared packages
│   ├── core/              # Business logic & agent runtime
│   ├── db/                # Database schema & client
│   ├── shared/            # Common types & utilities
│   └── ui/                # Shared React components
├── docs/                  # Documentation
├── db/                    # Database migrations
└── [config files]        # Root configuration
```

## Applications (`apps/`)

### Discord Bot (`apps/bot/`)
```
apps/bot/
├── src/
│   ├── index.ts           # Entry point & Discord client setup
│   ├── handlers/
│   │   ├── intent-parser.ts    # Natural language → Intent parsing
│   │   └── message-handler.ts  # Route intents to actions
│   └── types/             # Bot-specific types
├── package.json           # Bot dependencies
└── tsconfig.json         # TypeScript config
```

**Key Responsibilities**:
- Discord client management
- Natural language intent parsing
- Message routing and response handling
- Discord-specific error handling

### Web Application (`apps/web/`)
```
apps/web/
├── app/                   # Next.js 14 App Router
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Landing page
│   ├── garden/           # Agent garden pages
│   └── api/              # API routes
├── components/           # React components
│   ├── agent-grid.tsx    # Agent visualization
│   └── ui/               # UI components
├── public/               # Static assets
├── package.json          # Web app dependencies
├── tailwind.config.js    # Tailwind configuration
└── next.config.js        # Next.js configuration
```

**Key Responsibilities**:
- Web interface for agent management
- Agent visualization and interaction
- Authentication and user sessions
- API endpoints for web functionality

## Shared Packages (`packages/`)

### Core Package (`packages/core/`)
```
packages/core/src/
├── agent/
│   └── agent-runtime.ts      # Main orchestrator (450+ lines)
├── llm/
│   ├── client.ts            # OpenAI API wrapper
│   └── prompt-builder.ts    # Context → Prompt conversion
├── memory/
│   └── memory-manager.ts    # Memory lifecycle management
├── safety/
│   ├── rate-limiter.ts      # Redis-based rate limiting
│   └── moderator.ts         # Content moderation
├── tools/
│   └── tool-executor.ts     # Tool execution framework
└── index.ts                 # Package exports
```

**Key Responsibilities**:
- Agent runtime orchestration
- LLM interaction and prompt building
- Memory storage and retrieval
- Safety and moderation systems
- Tool execution framework

### Database Package (`packages/db/`)
```
packages/db/
├── prisma/
│   ├── schema.prisma        # Complete database schema (200+ lines)
│   └── migrations/          # Database migrations
├── src/
│   └── index.ts            # Prisma client + vector search helpers
└── package.json            # Database dependencies
```

**Key Responsibilities**:
- Database schema definition
- Prisma client configuration
- Vector search utilities
- Database migration management

### Shared Package (`packages/shared/`)
```
packages/shared/src/
├── types.ts                # TypeScript interfaces
├── schemas.ts              # Zod validation schemas
├── constants.ts            # Prompts, patterns, presets
├── utils.ts                # Helper functions
└── index.ts                # Package exports
```

**Key Responsibilities**:
- Common TypeScript types
- Runtime validation schemas
- Shared constants and configurations
- Utility functions used across packages

### UI Package (`packages/ui/`)
```
packages/ui/src/
├── components/             # Shared React components
├── hooks/                  # Custom React hooks
├── utils/                  # UI-specific utilities
└── index.ts                # Component exports
```

**Key Responsibilities**:
- Reusable React components
- Shared UI patterns and hooks
- Design system components

## Configuration Files

### Root Level
- `package.json` - Workspace configuration and scripts
- `turbo.json` - Turborepo pipeline configuration
- `tsconfig.json` - Base TypeScript configuration
- `.env` / `.env.example` - Environment variables
- `.gitignore` - Git ignore patterns
- `.eslintrc.json` - ESLint configuration
- `.prettierrc.json` - Prettier configuration

### Documentation
- `README.md` - Main project documentation
- `SETUP.md` - Detailed setup instructions
- `QUICKSTART.md` - Quick start guide
- `ARCHITECTURE.md` - System architecture deep dive
- `PROJECT_SUMMARY.md` - Project overview and status

## Database Structure

### Core Tables
- `users` - Discord users
- `agents` - AI agent definitions (persona, system prompt, traits)
- `agent_instances` - Runtime state (mood, energy, environment)
- `conversations` - Chat sessions (Discord/Web)
- `messages` - Individual messages
- `memories` - Long-term facts with vector embeddings
- `tools` - Agent capabilities
- `events` - Lifecycle events

## Package Dependencies

### Dependency Flow
```
apps/bot     ──┐
               ├──→ packages/core ──→ packages/db
apps/web     ──┘                  └──→ packages/shared
                                  └──→ packages/ui
```

### Import Patterns
- Apps import from `@botbot/core`, `@botbot/db`, `@botbot/shared`
- Core package imports from `@botbot/db`, `@botbot/shared`
- Shared package has no internal dependencies
- DB package has minimal external dependencies

## File Naming Conventions

### TypeScript Files
- `kebab-case.ts` for modules and utilities
- `PascalCase.tsx` for React components
- `camelCase.ts` for services and managers

### Directories
- `kebab-case/` for feature directories
- `camelCase/` for utility directories
- `PascalCase/` for component directories

## Code Organization Principles

### Separation of Concerns
- **Apps**: Platform-specific logic (Discord, Web)
- **Core**: Business logic and orchestration
- **DB**: Data access and schema
- **Shared**: Common utilities and types

### Dependency Direction
- Apps depend on packages, never the reverse
- Packages have minimal cross-dependencies
- Core package is the main orchestrator
- Shared package provides common foundations

### Module Boundaries
- Each package has a clear, single responsibility
- Public APIs are exported through `index.ts`
- Internal implementation details are not exposed
- Type definitions are centralized in shared package