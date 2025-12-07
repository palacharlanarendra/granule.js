import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["core/index.ts"],
  sourcemap: true,
  clean: true,
  dts: true,
  format: ["esm", "cjs"],
  target: "es2020",
  external: ["react"],
});