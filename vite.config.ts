import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";


// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    mcpPlugin(),
  ].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // This application has a large module graph. esbuild's final minification
    // process was being killed after transformation, which surfaced as an EPIPE
    // with no source-file error. Skip that fragile subprocess; hosting still
    // compresses the generated assets when they are served.
    minify: false,
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-select', '@radix-ui/react-popover', '@radix-ui/react-tabs', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tooltip'],
          'vendor-charts': ['recharts'],
          'vendor-pdf': ['jspdf', 'jspdf-autotable'],
          'vendor-xlsx': ['xlsx'],
        },
      },
    },
  },
}));
