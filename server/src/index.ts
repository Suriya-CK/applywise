/** Entry point: start the HTTP server. */
import { createApp } from "./app";
import { config } from "./config";
import { pool } from "./db/pool";

const app = createApp();

const server = app.listen(config.PORT, () => {
  console.log(`ApplyWise API listening on http://localhost:${config.PORT}`);
});

// Graceful shutdown: when Docker/Kubernetes stops the container it sends SIGTERM.
// We stop accepting requests, let current ones finish, then close the DB pool.
function shutdown(signal: string) {
  console.log(`${signal} received, shutting down...`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
