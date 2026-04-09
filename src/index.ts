import express, { type Request, type Response } from "express";
import { pool } from "./db.js"; // Ensure the path matches your structure
import { CONFIG } from "./config/constants.js";

const app = express();

app.use(express.json());

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "OK", message: "Scout Agent is active" });
});

async function startServer() {
  try {
    const client = await pool.connect();
    console.log("✅ Database connected successfully");
    client.release();

    const PORT = CONFIG.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
      console.log(`📂 Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:");
    console.error(error);
    process.exit(1);
  }
}

startServer();
