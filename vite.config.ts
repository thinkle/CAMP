import { defineConfig } from "vite";
import { execSync } from "child_process";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { viteSingleFile } from "vite-plugin-singlefile";

const buildTime = new Date().toISOString();
let buildCommit = "local-dev";
try {
  buildCommit = execSync("git rev-parse --short HEAD").toString().trim();
} catch (error) {
  console.warn("Could not determine git commit for build metadata", error);
}

export default defineConfig({
  define: {
    __BUILD_TIME__: JSON.stringify(buildTime),
    __BUILD_COMMIT__: JSON.stringify(buildCommit),
  },
  plugins: [svelte(), viteSingleFile()],
  root: "./src/svelte/",
  resolve: {
    dedupe: ["contain-css-svelte"],
  },
  build: {
    outDir: "../../dist",
    emptyOutDir: false, // Ensure the output directory is empty
    // Inline HTML and CSS
    rollupOptions: {},
  },
});
