import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import hpp from "hpp";
import { handlePostgresError } from "./middleware/error.middleware.js";
import userIdentity from ".//services/user-services/user.router.js"
// import createContactsTable from "./models/db.init.js";

dotenv.config();

const app = express();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api", limiter);


app.use(helmet());
app.use(hpp());


if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());


app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "device-remember-token",
      "Access-Control-Allow-Origin",
      "Origin",
      "Accept",
    ],
  })
);


app.get("/test", (req, res) => {
  res.send("testing");
});


app.use("/api/v1", userIdentity);


app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
  });
});



// (async () => {
//   await createContactsTable();
// })();


app.use((err, req, res, next) => {
  console.error(err);
  return res.status(err.statusCode || 500).json({
    status: "error",
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

app.use((err, req, res, next) => {
  const dbError = handlePostgresError(err);

  res.status(dbError.statusCode || 500).json({
    status: "error",
    message: dbError.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: dbError.stack }),
  });
});


export default app;