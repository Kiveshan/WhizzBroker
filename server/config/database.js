import pkg from "pg";
import dotenv from "dotenv";
import { types } from "pg";

// Load environment variables
dotenv.config();

const { Pool } = pkg;

// Create a PostgreSQL connection pool
const pool = new Pool({
  user: process.env.RDS_USERNAME || process.env.POSTGRES_USER,
  host: process.env.RDS_HOSTNAME || process.env.POSTGRES_HOST,
  database: process.env.RDS_DB_NAME || process.env.POSTGRES_DB,
  password: process.env.RDS_PASSWORD || process.env.POSTGRES_PASSWORD,
  port: process.env.RDS_PORT || process.env.POSTGRES_PORT,
  ssl: process.env.DB_SSL ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 20,
});

types.setTypeParser(types.builtins.NUMERIC, (value) => parseFloat(value));
types.setTypeParser(types.builtins.FLOAT8, (value) => parseFloat(value));
// Return DATE columns as plain "YYYY-MM-DD" strings to avoid the local-midnight
// timezone shift that postgres-date introduces on UTC+ servers.
types.setTypeParser(1082, (value) => value);

// Log connection status
console.log("Database connection configured with:", {
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  port: process.env.POSTGRES_PORT,
});

// Add error handler for the pool
pool.on("error", (err) => {
  console.error("Unexpected database error:", err.message);
});

// Test database connection function
const testConnection = async () => {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query("SELECT NOW()");
    return {
      success: true,
      time: result.rows[0].now,
      message: "Database connected successfully",
    };
  } catch (error) {
    console.error("Database connection test failed:", error.message);
    return {
      success: false,
      error: error.message,
      message: "Database connection failed",
    };
  } finally {
    if (client) client.release();
  }
};

// Helper function to execute database queries
async function query(text, params) {
  if (!pool) {
    throw new Error("Database connection not established");
  }

  try {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    // Only surface slow queries — logging every statement drowns the logs.
    if (duration > 500) {
      console.warn("Slow query", { duration, rows: res.rowCount, text: text.slice(0, 120) });
    }
    return res;
  } catch (error) {
    console.error("Error executing query", { text, error });
    throw error;
  }
}

// Try to connect to the database once at startup
(async () => {
  try {
    const result = await testConnection();
    if (result.success) {
      console.log("Database connected successfully at:", result.time);
    } else {
      console.error("Database connection failed:", result.error);
      console.log(
        "To fix this, please check your database configuration and restart the server."
      );
    }
  } catch (error) {
    console.error("Error during initial database connection test:", error);
  }
})();

export { pool, testConnection, query };
