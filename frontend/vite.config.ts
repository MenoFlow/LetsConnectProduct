import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import tsconfigPaths from 'vite-tsconfig-paths';
export default defineConfig({ plugins: [tanstackRouter({target:'react',autoCodeSplitting:true}), react(), tailwindcss(), tsconfigPaths()], server: {port:3000, proxy:{'/api':{target:process.env['API_PROXY_TARGET'] || 'http://localhost:4000',changeOrigin:false,ws:true}}} });
