// app.config.ts
import { defineConfig } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
var app_config_default = defineConfig({
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@sharellama/database": path.resolve(__dirname, "../database/dist/index.js"),
        "@sharellama/model": path.resolve(__dirname, "../model/dist/index.js")
      }
    }
  }
});
export {
  app_config_default as default
};
