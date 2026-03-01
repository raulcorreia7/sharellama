import { defineConfig } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@sharellama/database": path.resolve(__dirname, "../database/dist/index.js"),
        "@sharellama/model": path.resolve(__dirname, "../model/dist/index.js"),
      },
    },
  },
});
