import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;
// @ts-expect-error process is a nodejs global
const isWebBuild = process.env.VITE_BUILD_TARGET === "web";

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // Define build target for conditional code
  define: {
    "import.meta.env.VITE_BUILD_TARGET": JSON.stringify(
      isWebBuild ? "web" : "tauri"
    ),
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,

  // 2. Server configuration varies by target
  server: isWebBuild
    ? {
        // Web build - standard config
        port: 3000,
        host: true,
      }
    : {
        // Tauri build - fixed port required
        port: 1420,
        strictPort: true,
        host: host || false,
        hmr: host
          ? {
              protocol: "ws",
              host,
              port: 1421,
            }
          : undefined,
        watch: {
          // tell vite to ignore watching `src-tauri`
          ignored: ["**/src-tauri/**"],
        },
      },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // Build optimizations for web
  build: isWebBuild
    ? {
        // Optimize chunk sizes for web
        rollupOptions: {
          output: {
            manualChunks: {
              vendor: ["react", "react-dom", "react-router-dom"],
              ui: ["lucide-react", "framer-motion", "daisyui"],
            },
          },
        },
      }
    : undefined,
}));
