import pg from "pg";
import { DB_CONFIG } from "./config/constants.js";

const isLocalHost =
  DB_CONFIG.HOST === "localhost" || DB_CONFIG.HOST === "127.0.0.1";

export const pool = new pg.Pool({
  user: DB_CONFIG.USER,
  host: DB_CONFIG.HOST,
  password: DB_CONFIG.PASSWORD,
  database: DB_CONFIG.DATABASE,
  port: Number(DB_CONFIG.PORT_DB),
  ssl: isLocalHost
    ? false
    : {
        rejectUnauthorized: process.env.NODE_ENV === "production",
      },
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
