import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === "production";
  return {
    server: {
      host: "localhost",
      port: 8081,
      hmr: {
        overlay: false,
      },
      proxy: {
        '/auth-api': {
          target: 'https://api.lendrixventech.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/auth-api/, '/auth'),
        },
        '/nse-api': {
          target: 'https://nse.lendrixventech.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/nse-api/, '/api/v1'),
        },
        // Public scheme catalogue — served by the Express server (no NSE token in browser)
        '/nse-api/public': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        },
        '/bse-api': {
          target: 'https://starmfv2demo.bseindia.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/bse-api/, '/api'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.removeHeader('origin');
              proxyReq.removeHeader('referer');
            });
          },
        },
        '/rkyc-api': {
          target: 'https://api.cra.in.kychub.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/rkyc-api/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.removeHeader('origin');
              proxyReq.removeHeader('referer');
            });
          },
        },
        '/api': {
          target: 'https://payment.lendrixventech.com',
          changeOrigin: true,
          secure: true,
        },
        '/client': {
          target: 'https://payment.lendrixventech.com',
          changeOrigin: true,
          secure: true,
        },
        '/iw-api': {
          target: 'https://lendrixventech.investwell.app',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/iw-api/, '/api'),
        },
      },
    },
    // In production the Vite dev-server proxy is unavailable (Cloudflare Workers
    // serves only static assets). Bake the real backend origins directly into the
    // bundle so the browser calls them without any proxy prefix.
    define: isProduction
      ? {
          'import.meta.env.VITE_NSE_API_BASE_URL': JSON.stringify('https://nse.lendrixventech.com/api/v1'),
          'import.meta.env.VITE_AUTH_API_BASE_URL': JSON.stringify('https://api.lendrixventech.com/auth'),
        }
      : {},
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
