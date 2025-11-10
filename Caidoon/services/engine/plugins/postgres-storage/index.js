/**
 * PostgreSQL Storage Provider
 * Internal class that implements IStorageProvider
 */
class PostgresStorage {
    name = 'postgres-storage';
    connectionString;
    pool; // Would be pg.Pool in real implementation
    logger;
    initialized = false;
    constructor(connectionString, logger) {
        this.connectionString = connectionString;
        this.logger = logger;
    }
    async initialize() {
        if (this.initialized)
            return;
        this.logger.info('Initializing PostgreSQL storage provider');
        // In real implementation:
        // const { Pool } = require('pg');
        // this.pool = new Pool({
        //   connectionString: this.connectionString,
        //   max: 10,
        //   connectionTimeoutMillis: 5000,
        // });
        this.initialized = true;
        this.logger.info('PostgreSQL storage provider initialized');
    }
    async readSession(sessionId) {
        this.ensureInitialized();
        try {
            // In real implementation:
            // const result = await this.pool.query(
            //   'SELECT * FROM sessions WHERE session_id = $1',
            //   [sessionId]
            // );
            //
            // if (result.rows.length === 0) return null;
            //
            // return this.deserializeSession(result.rows[0]);
            this.logger.info(`Reading session: ${sessionId}`);
            return null; // Placeholder
        }
        catch (error) {
            this.logger.error(`Failed to read session ${sessionId}`, error);
            throw error;
        }
    }
    async writeSession(session) {
        this.ensureInitialized();
        try {
            // In real implementation:
            // const serialized = this.serializeSession(session);
            //
            // await this.pool.query(`
            //   INSERT INTO sessions (
            //     session_id, player_id, encounter, state, started_at, completed_at
            //   ) VALUES ($1, $2, $3, $4, $5, $6)
            //   ON CONFLICT (session_id)
            //   DO UPDATE SET
            //     encounter = EXCLUDED.encounter,
            //     state = EXCLUDED.state,
            //     completed_at = EXCLUDED.completed_at
            // `, [
            //   session.sessionId,
            //   session.playerId,
            //   JSON.stringify(session.encounter),
            //   JSON.stringify(session.state),
            //   session.startedAt,
            //   session.completedAt
            // ]);
            this.logger.info(`Writing session: ${session.sessionId}`);
        }
        catch (error) {
            this.logger.error(`Failed to write session ${session.sessionId}`, error);
            throw error;
        }
    }
    async deleteSession(sessionId) {
        this.ensureInitialized();
        try {
            // In real implementation:
            // const result = await this.pool.query(
            //   'DELETE FROM sessions WHERE session_id = $1',
            //   [sessionId]
            // );
            // return result.rowCount > 0;
            this.logger.info(`Deleting session: ${sessionId}`);
            return false; // Placeholder
        }
        catch (error) {
            this.logger.error(`Failed to delete session ${sessionId}`, error);
            throw error;
        }
    }
    async querySessions(filter, options) {
        this.ensureInitialized();
        try {
            // Build SQL query from filters
            const conditions = [];
            const params = [];
            let paramIndex = 1;
            if (filter.playerId) {
                conditions.push(`player_id = $${paramIndex++}`);
                params.push(filter.playerId);
            }
            if (filter.completed !== undefined) {
                if (filter.completed) {
                    conditions.push('completed_at IS NOT NULL');
                }
                else {
                    conditions.push('completed_at IS NULL');
                }
            }
            if (filter.startedAfter) {
                conditions.push(`started_at > $${paramIndex++}`);
                params.push(filter.startedAfter);
            }
            if (filter.startedBefore) {
                conditions.push(`started_at < $${paramIndex++}`);
                params.push(filter.startedBefore);
            }
            if (filter.difficulty) {
                conditions.push(`encounter->>'difficulty' = $${paramIndex++}`);
                params.push(filter.difficulty);
            }
            const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
            // Sorting
            const sortBy = options?.sortBy || 'createdAt';
            const sortOrder = options?.sortOrder || 'desc';
            const sortColumn = sortBy === 'createdAt' ? 'started_at' : sortBy === 'completedAt' ? 'completed_at' : 'started_at';
            // Pagination
            const limit = options?.limit || 100;
            const offset = options?.offset || 0;
            // In real implementation:
            // const query = `
            //   SELECT * FROM sessions
            //   ${whereClause}
            //   ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}
            //   LIMIT ${limit} OFFSET ${offset}
            // `;
            //
            // const result = await this.pool.query(query, params);
            // return result.rows.map(row => this.deserializeSession(row));
            this.logger.info('Querying sessions');
            return []; // Placeholder
        }
        catch (error) {
            this.logger.error('Failed to query sessions', error);
            throw error;
        }
    }
    async countSessions(filter) {
        this.ensureInitialized();
        try {
            // Similar WHERE clause building as querySessions
            // In real implementation:
            // const result = await this.pool.query(
            //   'SELECT COUNT(*) FROM sessions WHERE ...',
            //   params
            // );
            // return parseInt(result.rows[0].count);
            return 0; // Placeholder
        }
        catch (error) {
            this.logger.error('Failed to count sessions', error);
            throw error;
        }
    }
    async healthCheck() {
        if (!this.initialized || !this.pool) {
            return false;
        }
        try {
            // In real implementation:
            // const client = await this.pool.connect();
            // await client.query('SELECT 1');
            // client.release();
            return true;
        }
        catch (error) {
            this.logger.error('PostgreSQL health check failed', error);
            return false;
        }
    }
    async shutdown() {
        if (this.pool) {
            // await this.pool.end();
            this.initialized = false;
        }
        this.logger.info('PostgreSQL storage provider shutdown complete');
    }
    ensureInitialized() {
        if (!this.initialized) {
            throw new Error('PostgreSQL storage provider not initialized');
        }
    }
    serializeSession(session) {
        return {
            session_id: session.sessionId,
            player_id: session.playerId,
            encounter: JSON.stringify(session.encounter),
            state: JSON.stringify(session.state),
            started_at: session.startedAt,
            completed_at: session.completedAt,
        };
    }
    deserializeSession(row) {
        return {
            sessionId: row.session_id,
            playerId: row.player_id,
            encounter: JSON.parse(row.encounter),
            state: JSON.parse(row.state),
            startedAt: row.started_at,
            completedAt: row.completed_at,
        };
    }
}
/**
 * PostgreSQL Storage Plugin
 * Provides persistent session storage using PostgreSQL
 *
 * NOTE: This is a template/skeleton implementation.
 * To use this plugin, you'll need to:
 * 1. Install pg package: npm install pg
 * 2. Set up a PostgreSQL database
 * 3. Run the schema migration (see README.md)
 * 4. Configure connection string in plugin.json
 */
export default class PostgresStoragePlugin {
    context;
    storage;
    getMetadata() {
        return {
            name: 'postgres-storage',
            version: '1.0.0',
            description: 'PostgreSQL storage provider plugin',
            author: 'AI Encounters',
        };
    }
    async initialize(context) {
        this.context = context;
        const connectionString = context.config.connectionString;
        if (!connectionString) {
            throw new Error('PostgreSQL connection string not configured');
        }
        context.logger.info('PostgreSQL Storage Plugin initialized');
        context.logger.info(`Connection string: ${this.maskConnectionString(connectionString)}`);
        // Create the storage provider
        this.storage = new PostgresStorage(connectionString, context.logger);
    }
    async activate() {
        if (!this.context || !this.storage) {
            throw new Error('Plugin not initialized');
        }
        // Initialize the storage provider
        await this.storage.initialize();
        // Test database connection
        const healthy = await this.storage.healthCheck();
        if (!healthy) {
            this.context.logger.warn('PostgreSQL health check failed - storage may not be available');
        }
        this.context.logger.info('PostgreSQL Storage Plugin activated');
    }
    async deactivate() {
        if (this.context) {
            this.context.logger.info('PostgreSQL Storage Plugin deactivated');
        }
    }
    async shutdown() {
        if (this.storage) {
            await this.storage.shutdown();
        }
        if (this.context) {
            this.context.logger.info('PostgreSQL Storage Plugin shutdown');
        }
    }
    async healthCheck() {
        return this.storage?.healthCheck() || false;
    }
    /**
     * Get the storage provider instance
     * This allows other parts of the system to use this storage provider
     */
    getStorageProvider() {
        return this.storage;
    }
    maskConnectionString(connString) {
        // Mask password in connection string for logging
        return connString.replace(/:[^:@]+@/, ':****@');
    }
}
