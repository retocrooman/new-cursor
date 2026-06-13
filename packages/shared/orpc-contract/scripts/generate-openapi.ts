import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { OpenAPIGenerator } from "@orpc/openapi";
import { ZodToJsonSchemaConverter } from "@orpc/zod";
import { contract } from "../src/index";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const generator = new OpenAPIGenerator({
    schemaConverters: [new ZodToJsonSchemaConverter()],
  });

  const spec = await generator.generate(contract, {
    info: {
      title: "new-cursor API",
      version: "0.0.0",
      description: "oRPC contract-first API (new-cursor)",
    },
    servers: [
      { url: "http://localhost:3000/api/rpc", description: "Development" },
    ],
  });

  const outputPath = resolve(__dirname, "../spec.json");
  writeFileSync(outputPath, JSON.stringify(spec, null, 2));
  console.log(`OpenAPI spec generated: ${outputPath}`);
}

main().catch((error) => {
  console.error("Failed to generate OpenAPI spec:", error);
  process.exit(1);
});
