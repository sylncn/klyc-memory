// 构建 klyc-memory 插件：index.ts → dist/index.js（官方推荐：runtime 指向构建后的 JS）
// 用宿主同款 esbuild，确保与 OpenClaw 加载器一致
import { build } from "esbuild";
import { mkdirSync } from "node:fs";

mkdirSync("dist", { recursive: true });

await build({
  entryPoints: ["index.ts"],
  outfile: "dist/index.js",
  bundle: false,
  format: "esm",
  platform: "node",
  target: "node24",
  sourcemap: false,
  external: ["openclaw", "openclaw/plugin-sdk/*"],
});

console.log("✅ dist/index.js 构建完成");
