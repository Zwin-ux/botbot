# Project Structure & Architecture

## Directory Organization

```
src/
├── index.js              # Main entry point with Discord client setup
├── config.js            # Environment and application configuration
├── contextManager.js    # Conversation context management
├── enhancedParser.js    # Natural language parsing (base)
├── enhancedParserExtended.js # Extended NLP capabilities
├── database/            # Database layer
│   ├── index.js         # Database initialization
│   ├── *Manager.js      # Data access objects (DAOs)
│   ├── migrations/      # Database schema migrations
│   └── migrate.js       # Migration runner
├── features/            # Business logic modules
│   ├── games/           # Game implementations
│   ├── agent/           # Agent channel functionality
│   ├── standupManager.js
│   ├── retroManager.js
│   └── *.js             # Feature-specific logic
├── handlers/            # Event and message handlers
│   ├── messageHandler.js    # Main message routing
│   ├── naturalMessageHandler.js # NLP message processing
│   ├── reactionHandler.js   # Emoji reaction handling
│   └── *Handler.js          # Feature-specific handlers
├── services/            # External integrations and services
├── utils/               # Shared utilities and helpers
├── input/               # Input processing pipeline
├── output/              # Output formatting and delivery
├── nlu/                 # Natural language understanding
└── scripts/             # Maintenance and utility scripts
```

## Architecture Patterns

### Layered Architecture

- **Entry Point** (`index.js`): Discord client setup and event binding
- **Handlers**: Process Discord events and route to appropriate services
- **Features/Services**: Business logic and core functionality
- **Database**: Data persistence with manager pattern
- **Utils**: Shared utilities and helpers

### Key Design Patterns

- **Manager Pattern**: Database operations encapsulated in `*Manager.js` classes
- **Handler Pattern**: Event processing in dedicated handler classes
- **Service Pattern**: Business logic in service classes
- **Factory Pattern**: Database initialization and dependency injection

### Message Flow

1. Discord event → Handler (messageHandler.js)
2. Natural language processing (naturalMessageHandler.js)
3. Intent recognition and parsing (enhancedParser.js)
4. Business logic execution (features/)
5. Database operations (database/\*Manager.js)
6. Response formatting and delivery

## File Naming Conventions

- **Managers**: `*Manager.js` - Database access objects
- **Handlers**: `*Handler.js` - Event processors
- **Services**: `*Service.js` - Business logic services
- **Features**: Descriptive names for feature modules
- **Utils**: `*Utils.js` - Utility functions
- **Tests**: `*.test.js` - Test files

## Database Architecture

- **SQLite** with custom migration system
- **Manager classes** for each entity (Reminder, Category, Reaction, etc.)
- **Migration files** in `database/migrations/`
- **Schema upgrades** handled automatically

## Configuration Management

- Centralized in `src/config.js`
- Environment-specific overrides
- Feature flags for enabling/disabling functionality
- Database paths and logging configuration

## Testing Structure

- Unit tests in `test/` directory
- Integration tests in `tests/` directory
- Test files follow `*.test.js` pattern
- Jest configuration in `package.json`
