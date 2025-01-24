import { defineConfig } from "vite";
import * as fs from "fs";
import * as path from "path";

export default defineConfig({
  build: {
    lib: {
      entry: "./src/worker/main.ts", // Path to your worker entry point
      formats: ["iife"], // Worker needs IIFE format
      name: "worker",
      fileName: () => `worker.js`, // Initially outputs worker.js
    },
    minify: false, // Don't minify worker.js
    outDir: "./dist", // Ensure output goes to dist/
    emptyOutDir: false, // Avoid wiping other files in dist/
  },
   plugins: [
    {
      name: "rename-worker",
      writeBundle(options, bundle) {
        const distDir = path.resolve(__dirname, "./dist");
        const workerFile = path.join(distDir, "worker.js");
        const renamedWorkerFile = path.join(distDir, "worker.js.html");

        if (fs.existsSync(workerFile)) {
          fs.renameSync(workerFile, renamedWorkerFile);
          console.log(`Renamed worker.js to worker.js.html`);
        } else {
          console.error(`worker.js not found in ${distDir}`);
        }
      },
    },
  ], 
});