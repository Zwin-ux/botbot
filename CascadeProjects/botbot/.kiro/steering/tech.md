# Technology Stack & Build System

## Architecture

**Monorepo Structure**: Turborepo-based monorepo with TypeScript throughout

```
├── apps/
│   ├── bot/          # Discord bot (discord.js v14)
│   └── web/          # Next.js 14 web app
├── packages/
│   ├── core/         # AgentRuntime, LLM, Memory, Safety
│   ├── db/           # Prisma + pgvector
│   ├── shared/       # Types, utils, constants
│   └── ui/           # Shared React components
```

## Core Technologies

### Frontend
- **Next.js 14** with App Router
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Lucide React** for icons

### Backend
- **Node.js 20+** runtime
- **TypeScript 5.3** throughout
- **discord.js v14** for Discord integration
- **Prisma 5.7** as ORM

### Database & Storage
- **PostgreSQL** with **pgvector** extension for embeddings
- **Redis** for caching and rate limiting
- **Supabase** recommended for managed PostgreSQL

### AI & ML
- **OpenAI GPT-4-turbo** for conversations
- **text-embedding-3-large** for memory embeddings
- **OpenAI Moderation API** for content safety

### Development Tools
- **Turborepo** for monorepo management
- **ESLint** for linting
- **Prettier** for code formatting
- **tsx** for TypeScript execution in development

## Common Commands

### Development
```bash
# Start all services in development
npm run dev

# Start specific service
npm run dev --filter=@botbot/bot    # Discord bot only
npm run dev --filter=@botbot/web    # Web app only

# Install dependencies
npm install
```

### Database Operations
```bash
# Generate Prisma client
npm run db:generate

# Push schema changes (development)
npm run db:push

# Create migration (production)
npm run db:migrate

# Open Prisma Studio
npm run db:studio
```

### Build & Production
```bash
# Build all packages
npm run build

# Build specific package
npm run build --filter=@botbot/bot

# Start production server
npm run start --filter=@botbot/bot
```

### Code Quality
```bash
# Lint all packages
npm run lint

# Format code
npm run format

# Clean build artifacts
npm run clean
```

## Environment Requirements

### Required Services
- **Node.js 20+** and **npm 10+**
- **PostgreSQL** with pgvector extension
- **Redis** instance
- **OpenAI API** access
- **Discord Developer Application**

### Environment Variables
```bash
# Discord Configuration
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_PUBLIC_KEY=

# OpenAI Configuration
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_EMBEDDING_MODEL=text-embedding-3-large

# Database
DATABASE_URL=          # Connection pooling URL
DIRECT_URL=           # Direct connection URL

# Redis
REDIS_URL=

# Next.js
NEXT_PUBLIC_APP_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
```

## Package Dependencies

### Core Dependencies
- **@prisma/client** - Database access
- **openai** - OpenAI API client
- **discord.js** - Discord bot framework
- **ioredis** - Redis client
- **zod** - Runtime type validation
- **next-auth** - Authentication

### Development Dependencies
- **typescript** - Type checking
- **tsx** - TypeScript execution
- **turbo** - Monorepo build system
- **eslint** - Code linting
- **prettier** - Code formatting

## Build Configuration

### Turbo Pipeline
- **build**: Builds packages with dependency ordering
- **dev**: Runs development servers (no cache, persistent)
- **lint**: Lints code with dependency ordering
- **db:generate**: Generates Prisma client (no cache)

### TypeScript Configuration
- **Target**: ES2022
- **Module**: CommonJS with ESM interop
- **Strict mode**: Enabled
- **Composite**: Enabled for monorepo
- **Source maps**: Enabled for debugging