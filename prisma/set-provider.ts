import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(__dirname, "..", ".env");
const envContent = readFileSync(envPath, "utf-8");
const match = envContent.match(/^DB_PROVIDER\s*=\s*"?([^"\n]+)"?/m);
const provider = match?.[1] || "sqlite";

const schemaPath = resolve(__dirname, "schema.prisma");
const schema = readFileSync(schemaPath, "utf-8");
const updated = schema.replace(
  /provider\s*=\s*"(sqlite|postgresql)"/,
  `provider = "${provider}"`
);

writeFileSync(schemaPath, updated);
console.log(`Prisma provider set to "${provider}"`);
