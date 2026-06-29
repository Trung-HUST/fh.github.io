import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { readFileSync } from "fs";
import { VitePWA } from "vite-plugin-pwa";


const pkg = JSON.parse(readFileSync(path.resolve(__dirname, "package.json"), "utf-8"));

function liveEndpointPlugin(): Plugin {
  return {
    name: "live-endpoint",
    configureServer(server) {
      server.middlewares.use("/api/live", (_req, res) => {
        const { version } = JSON.parse(
          readFileSync(path.resolve(__dirname, "package.json"), "utf-8"),
        );
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ status: "ok", version }));
      });
    },
  };
}

export default defineConfig(() => ({
  base: '/fh.github.io/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    host: "::",
    port: 7013,
    allowedHosts: ["matrix.dev.hexly.ai"],
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    tailwindcss(),
    react(),
    liveEndpointPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon-180x180.png"],
      manifest: {
        name: "Dark Fund",
        short_name: "Dark Fund",
        description: "A Financial Health dashboard with cyberpunk aesthetics.",
        theme_color: "#0D1117",
        background_color: "#0D1117",
        display: "standalone",
        icons: [
          {
            src: "/fh.github.io/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/fh.github.io/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
