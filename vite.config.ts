import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";


// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    // The tagger is only needed by the interactive preview. Running it during
    // `vite build --mode development` adds a second esbuild worker and has been
    // causing intermittent EPIPE crashes after the module transform completes.
    command === "serve" && mode === "development" && componentTagger(),
    // MCP generation has its own esbuild process. Keep it in the live editor,
    // where source changes need regeneration, instead of starting that worker
    // alongside the already large frontend build.
    command === "serve" && mcpPlugin(),
  ].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Minification is back on: the earlier EPIPE crashes came from a forced
    // esbuild override that has since been removed from package.json.
    minify: "esbuild",
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
