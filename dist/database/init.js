"use strict";
/**
 * Database Initialization
 *
 * Creates necessary database tables and schema.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = initializeDatabase;
const postgres_service_1 = require("../services/postgres.service");
/**
 * Initialize database schema
 */
async function initializeDatabase() {
    const pool = (0, postgres_service_1.getPostgresPool)();
    try {
        // Create orders table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(255) UNIQUE NOT NULL,
        token_in VARCHAR(50) NOT NULL,
        token_out VARCHAR(50) NOT NULL,
        amount NUMERIC(20, 8) NOT NULL,
        order_type VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL,
        submitted_at TIMESTAMP NOT NULL,
        executed_at TIMESTAMP,
        failed_at TIMESTAMP,
        failure_reason TEXT,
        exchange_id VARCHAR(50),
        execution_price NUMERIC(20, 8),
        execution_amount NUMERIC(20, 8),
        routing_decision JSONB,
        tx_hash VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        // Create indexes
        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_orders_submitted_at ON orders(submitted_at);
      CREATE INDEX IF NOT EXISTS idx_orders_tx_hash ON orders(tx_hash);
    `);
        // Create function to update updated_at timestamp
        await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
        // Create trigger
        await pool.query(`
      DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
      CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
        console.log('[Database] Schema initialized successfully');
    }
    catch (error) {
        // If schema already exists, that's okay
        if (error instanceof Error && (error.message.includes('already exists') || error.message.includes('duplicate'))) {
            console.log('[Database] Schema already exists, skipping initialization');
        }
        else {
            console.error('[Database] Failed to initialize schema:', error);
            throw error;
        }
    }
}
//# sourceMappingURL=init.js.map