import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { edgeTtsDev } from "./vite-plugin-edge-tts";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), edgeTtsDev()],
  server: {
    port: 7200,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
