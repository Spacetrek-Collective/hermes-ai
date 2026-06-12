import { defineConfig, type Plugin } from "vite";
import { fileURLToPath, URL } from "node:url";
import { readdirSync, writeFileSync } from "node:fs";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

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
  plugins: [
    react(),
    tailwindcss(),
    bgManifest(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.svg",
        "favicon.ico",
        "apple-touch-icon-180x180.png",
        "pwa-64x64.png",
      ],
      manifest: {
        name: "Hermes AI",
        short_name: "Hermes",
        description: "AI waifu chat with Live2D character",
        theme_color: "#863bff",
        background_color: "#09090b",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Precache app shell only — model textures are too large (35MB+)
        globPatterns: ["**/*.{js,css,html,ico,svg,woff2}"],
        globIgnores: [
          "**/live2dcubismcore.min.js",
          "**/models/**",
        ],
      },
    }),
  ],
  server: {
    port: 7200,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
