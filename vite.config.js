import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import http from 'http'
import { spawn } from 'child_process'

function autoBackendPlugin() {
  return {
    name: 'auto-backend',
    configureServer() {
      const checkReq = http.get('http://localhost:5000/api/health', () => {
        // Backend is already up and listening
      });
      checkReq.on('error', () => {
        console.log('\n🚀 [TimeBank] Starting Express backend server on port 5000...');
        const child = spawn('node', ['server/index.js'], {
          stdio: 'inherit',
          shell: true,
        });
        child.on('error', (err) => console.error('Failed to spawn backend server:', err.message));
        process.on('exit', () => child.kill());
        process.on('SIGINT', () => { child.kill(); process.exit(); });
        process.on('SIGTERM', () => { child.kill(); process.exit(); });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), autoBackendPlugin()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res) => {
            if (res && !res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Backend server is starting up or temporarily unavailable. Please retry in a moment.' }));
            }
          });
        },
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})

