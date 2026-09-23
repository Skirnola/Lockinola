import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const configPath = resolve("dist/server/wrangler.json");
const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID?.trim();
if (!databaseId) throw new Error("CLOUDFLARE_D1_DATABASE_ID is required before deployment.");

const config = JSON.parse(await readFile(configPath, "utf8"));
config.name = process.env.CLOUDFLARE_WORKER_NAME?.trim() || "lockinola";
config.vars = {
  ...(config.vars ?? {}),
  LOCKINOLA_HOSTED: "true",
  OLLAMA_CLOUD_MODEL: process.env.OLLAMA_CLOUD_MODEL?.trim() || "gemma4",
  LOCKINOLA_REVIEW_DAILY_LIMIT: process.env.LOCKINOLA_REVIEW_DAILY_LIMIT?.trim() || "20",
};
config.d1_databases = [{
  binding: "DB",
  database_name: process.env.CLOUDFLARE_D1_DATABASE_NAME?.trim() || "lockinola",
  database_id: databaseId,
  migrations_dir: "../../migrations",
}];

await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
console.log(`Prepared ${config.name} for Cloudflare with D1 binding DB.`);
