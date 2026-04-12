import dotenv from "dotenv";
dotenv.config();

export const CONFIG = {
  PORT: process.env.PORT || 3000,
};

export const DB_CONFIG = {
  USER: process.env.DB_USER,
  HOST: process.env.DB_HOST,
  PASSWORD: process.env.DB_PASSWORD,
  DATABASE: process.env.DB_DATABASE,
  PORT_DB: process.env.DB_PORT || 5432,
};

export const API_KEYS = {
  SERPER: process.env.SERPER_API_KEY,
  GROQ: process.env.GROQ_API_KEY,
};
