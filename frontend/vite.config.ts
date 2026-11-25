import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split large libraries into their own files so browsers can cache them
        // separately from the app code, which changes far more often.
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          antd: ["antd", "@ant-design/icons"],
          charts: ["recharts"],
          graph: ["cytoscape"],
          data: ["@tanstack/react-query", "axios", "dayjs"],
        },
      },
    },
    // Ant Design alone is ~1 MB minified; this keeps the warning for real regressions
    chunkSizeWarningLimit: 1200,
  },
  server: {
    port: 3001,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
