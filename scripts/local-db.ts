import "dotenv/config";
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

if (process.env.NODE_ENV === "production")
  throw new Error("Local database helper cannot run in production");
const url = new URL(process.env.DATABASE_URL ?? "");
if (url.hostname !== "127.0.0.1" || url.pathname !== "/invoice_tracker")
  throw new Error(
    "Local helper requires 127.0.0.1 and database invoice_tracker",
  );
// Outside the project so database writes don't trigger dev-server recompiles and page reloads.
const directory = resolve(homedir(), ".invoice-tracker/postgres");
const postgres = new EmbeddedPostgres({
  databaseDir: directory,
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  port: Number(url.port),
  persistent: true,
  authMethod: "scram-sha-256",
  postgresFlags: ["-h", "127.0.0.1"],
  onLog: () => {},
  onError: () => {},
});
if (!existsSync(resolve(directory, "PG_VERSION"))) await postgres.initialise();
await postgres.start();
const client = postgres.getPgClient();
await client.connect();
const result = await client.query(
  "SELECT 1 FROM pg_database WHERE datname = $1",
  ["invoice_tracker"],
);
await client.end();
if (result.rowCount === 0) await postgres.createDatabase("invoice_tracker");
console.log(
  `Local PostgreSQL ready on 127.0.0.1:${url.port}. Press Ctrl+C to stop.`,
);
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await postgres.stop();
  process.exit(0);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
setInterval(() => {}, 60000);
