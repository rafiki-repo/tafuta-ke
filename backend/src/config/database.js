import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  // TCP keepalive prevents idle connections being silently closed by PostgreSQL
  // or intermediate network equipment (which causes session pruning errors).
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

// Log idle client errors but do NOT exit — pg-pool recovers by removing the
// broken client and creating a new one. Calling process.exit() here would
// crash the server on any transient network hiccup.
pool.on('error', (err) => {
  console.error('Unexpected error on idle pg client (non-fatal):', err.message);
});

export default pool;
