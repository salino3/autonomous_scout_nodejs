import express, { type Request, type Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { pool } from "./db.js";
import searchRouter from "./routes/search-routes.js";
import authRoute from "./routes/auth-routes.js";
import limiters from "./middlewares/limiters.js";
import { CONFIG } from "./config/constants.js";

const app = express();

// Trust the cloud proxy to see real individual IPs
// and not consider all IPs like the same IP
app.set("trust proxy", 1);

app.use(
  cors({
    origin: CONFIG.FRONT_END_PORT,
    credentials: true, // CRITICAL: This allows the refresh_token cookie to be sent!
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());
app.use(cookieParser());

// Apply the custom rate limiter
app.use(limiters.secondsLimiter);
app.use(limiters.dailyLimiter);
app.use(limiters.globalDailyLimiter);

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
