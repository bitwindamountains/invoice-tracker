import "dotenv/config";
import { mkdir, chmod } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const url = new URL(process.env.DATABASE_URL ?? "");
if (!/^postgres(ql)?:$/.test(url.protocol)) throw new Error("DATABASE_URL must be PostgreSQL");
const directory = resolve(process.argv[2] ?? "backups"); await mkdir(directory, { recursive: true });
const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-"); const target = resolve(directory, `invoice-tracker-${stamp}.dump`);
const env = { ...process.env, PGHOST: url.hostname, PGPORT: url.port || "5432", PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password), PGDATABASE: url.pathname.slice(1), PGSSLMODE: url.searchParams.get("sslmode") ?? process.env.PGSSLMODE };
await new Promise((ok, fail) => { const child=spawn(process.env.PG_DUMP_PATH??"pg_dump",["--format=custom","--no-owner","--no-acl","--file",target],{env,stdio:"inherit",shell:false});child.once("error",fail);child.once("exit",code=>code===0?ok():fail(new Error(`pg_dump exited ${code}`))); });
if(process.platform!=="win32")await chmod(target,0o600);console.log(`Backup created: ${target}`);
