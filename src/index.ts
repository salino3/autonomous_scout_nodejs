import express, { type Request, type Response } from "express";
import cookieParser from "cookie-parser";
import { pool } from "./db.js";
import searchRouter from "./routes/search-routes.js";
import authRoute from "./routes/auth-routes.js";
import { CONFIG } from "./config/constants.js";

const app = express();

app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api", searchRouter);
app.use("/api/auth", authRoute);

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
