import { defineConfig, type Plugin } from "vite";
import { fileURLToPath, URL } from "node:url";
import { readdirSync, writeFileSync } from "node:fs";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Auto-generate public/bg/manifest.json from the images in public/bg so newly
// dropped backgrounds appear in Settings without editing JSON by hand.
function bgManifest(): Plugin {
  const dir = fileURLToPath(new URL("./public/bg", import.meta.url));
  const write = () => {
    try {
      const files = readdirSync(dir)
        .filter((f) => /\.(jpe?g|png|webp|gif|avif)$/i.test(f))
        .sort();
      writeFileSync(`${dir}/manifest.json`, JSON.stringify(files, null, 2));
    } catch {
      /* no bg dir — ignore */
    }
  };
  return {
    name: "bg-manifest",
    buildStart: write,
    configureServer: write,
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), bgManifest()],
  server: {
    port: 7200,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
