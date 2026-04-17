import rateLimit from "express-rate-limit";

// 1. Burst Limit: 10 per 1 second
const secondsLimiter = rateLimit({
  windowMs: 1000,
  max: 10,
  message: "Too many requests per second!",
  standardHeaders: true,
  legacyHeaders: false,
  // This stays default (per IP) to prevent one person from spamming
  // Cloudflare, the real user IP is passed in a special heade
  keyGenerator: (req) =>
    (req.headers["cf-connecting-ip"] as string) || req.ip || "unknown",
});

// 2. Daily Limit by IP: 500 per 24 hours (Per IP)
const dailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 500,
  message: "Daily limit reached. Try again tomorrow.",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,
  // This stays default (per IP) to prevent one person from spamming
  // Cloudflare, the real user IP is passed in a special heade
  keyGenerator: (req) =>
    (req.headers["cf-connecting-ip"] as string) || req.ip || "unknown",
});

// 3. Global Server Limit: 1000 per 24 hours (Total for everyone)
const globalDailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 1000,
  // This makes the limit apply to the WHOLE server, not per IP:
  keyGenerator: (req, res) => "global_limit",
  message:
    "The server has reached its daily maximum capacity of 10,000 requests.",
  standardHeaders: true,
  legacyHeaders: false,
});

export default { secondsLimiter, dailyLimiter, globalDailyLimiter };
