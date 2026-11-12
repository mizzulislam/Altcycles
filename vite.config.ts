import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/pdf-lib")) return "vendor-pdf";
          if (id.includes("node_modules/docx")) return "vendor-docx";
          if (id.includes("node_modules/write-excel-file")) return "vendor-excel";
          if (id.includes("node_modules/@supabase")) return "vendor-supabase";
          if (id.includes("node_modules/lucide-react")) return "vendor-icons";
          if (id.includes("node_modules/@radix-ui")) return "vendor-radix";
          if (id.includes("node_modules/react")) return "vendor-react";
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "node",
    fileParallelism: false,
    include: ["tests/**/*.test.{ts,tsx}"],
    testTimeout: 30000,
  },
});

