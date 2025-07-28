# Technology Stack & Build System

## Core Technologies

- **Runtime**: Node.js (>=16.17.0)
- **Language**: JavaScript (ES Modules)
- **Discord Library**: discord.js v14+
- **Database**: SQLite3 with migrations
- **Scheduler**: node-cron for recurring tasks
- **Logging**: Pino with pretty printing

## Key Dependencies

- **Discord**: @discordjs/builders, @discordjs/rest, discord-api-types
- **Database**: sqlite3 with custom managers and migrations
- **Utilities**: date-fns, uuid, dotenv, debug
- **Language**: franc for language detection

## Development Tools

- **Testing**: Jest with coverage, supertest for API testing
- **Linting**: ESLint with Prettier integration
- **Build**: Babel for ES module transformation
- **Process Management**: nodemon for development
- **Git Hooks**: Husky with lint-staged

## Common Commands

### Development

```bash
npm run dev          # Start with nodemon (auto-restart)
npm start           # Production start
npm test            # Run tests with coverage
npm run lint        # Run ESLint
npm run format      # Format code with Prettier
```

### Database

```bash
npm run db:migrate   # Run database migrations
npm run db:rollback  # Rollback migrations
```

## Code Style Rules

- ES Modules (`import/export`) syntax
- Single quotes for strings
- Trailing commas in multiline objects/arrays
- 2-space indentation
- Semicolons required
- Object curly spacing: `{ key: value }`
- Array bracket spacing: `[item1, item2]`

## Environment Configuration

- Uses `.env` file for configuration
- Required: `DISCORD_TOKEN`
- Optional: `CLIENT_ID`, `GUILD_ID`, `NODE_ENV`
- Environment-specific config in `src/config.js`

## Testing Setup

- Jest with Node environment
- Babel transformation for ES modules
- Coverage reporting enabled
- Test files in `test/` and `tests/` directories
- Pattern: `**/*.test.js`
