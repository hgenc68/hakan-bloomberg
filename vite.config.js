import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import url from 'url';

function apiDevPlugin() {
  return {
    name: 'api-market-dev-server',
    configureServer(server) {
      server.middlewares.use('/api/market', async (req, res) => {
        try {
          const parsedUrl = url.parse(req.url, true);
          req.query = parsedUrl.query;
          const { default: handler } = await server.ssrLoadModule('/api/market.js');
          
          res.status = (code) => {
            res.statusCode = code;
            return res;
          };
          res.json = (data) => {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
          };
          
          await handler(req, res);
        } catch (err) {
          console.error('Vite dev api/market error:', err);
          res.statusCode = 500;
          res.end(JSON.stringify({ status: 'error', message: err.message }));
        }
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), apiDevPlugin()]
});
