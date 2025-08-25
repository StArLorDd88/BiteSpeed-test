import dotenv from "dotenv"
import "dotenv/config";
import pool from "./config/db.config.js";
import httpServer from "./app.js";

dotenv.config();

const PORT = process.env.PORT || 3000;

// Start server
pool.connect()
  .then((client) => {
    console.log("✅ Connected to PostgreSQL");
    client.release(); // release connection back to pool

    httpServer.listen(PORT, () => {
      console.log(`⚙️ Server is running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ PostgreSQL connection failed!!!", err);
  });
