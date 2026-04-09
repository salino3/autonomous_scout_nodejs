import pg from "pg";
import { DB_CONFIG } from "./config/constants.js";

export const pool = new pg.Pool({
  user: DB_CONFIG.USER,
  host: DB_CONFIG.HOST,
  password: DB_CONFIG.PASSWORD,
  database: DB_CONFIG.DATABASE,
  port: Number(DB_CONFIG.PORT_DB),
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
