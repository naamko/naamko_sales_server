import { Pool, PoolClient } from "pg";
import fs from "fs";
import path from "path";

class Database {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      user: process.env.DB_USER,
      host: "postgres", // Docker service name
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: 5432,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
    });

    // Handle pool errors
    this.pool.on("error", (err) => {
      console.error("Unexpected error on idle client", err);
      process.exit(-1);
    });
  }

  async connect(): Promise<void> {
    try {
      const client = await this.pool.connect();
      console.log("✅ Database connected successfully");
      client.release();
    } catch (error) {
      console.error("❌ Database connection failed:", error);
      throw error;
    }
  }

  async query(text: string, params?: any[]): Promise<any> {
    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log("Executed query", {
        text: text.substring(0, 50) + "...",
        duration,
        rows: res.rowCount,
      });
      return res;
    } catch (error) {
      console.error("Database query error:", error);
      throw error;
    }
  }

  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  async initializeSchema(): Promise<void> {
    try {
      console.log("🔄 Initializing database schema...");

      const schemaPath = path.join(__dirname, "schema.sql");

      if (fs.existsSync(schemaPath)) {
        const schemaSQL = fs.readFileSync(schemaPath, "utf8");
        console.log("📁 Using schema.sql file");
        await this.query(schemaSQL);
        console.log("✅ Database schema initialized successfully");
      } else {
        console.error("❌ schema.sql file not found at:", schemaPath);
        throw new Error(
          "Schema file not found. Please create express-api/database/schema.sql"
        );
      }
    } catch (error) {
      console.error("❌ Failed to initialize database schema:", error);
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
    console.log("🔌 Database connection closed");
  }
}

export const db = new Database();
