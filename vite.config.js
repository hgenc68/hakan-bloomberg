import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import url from 'url';
import fs from 'fs';
import path from 'path';

function apiDevPlugin() {
  const rootDir = typeof import.meta.dirname !== 'undefined' ? import.meta.dirname : process.cwd();
  const sharedFilePath = path.resolve(rootDir, '../shared_portfolio.json');

  return {
    name: 'api-market-dev-server',
    configureServer(server) {
      // 1. Live Market API
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

      // 2. Real-Time Shared Portfolio Bridge (Bloomberg <-> H2B)
      server.middlewares.use('/api/sync-portfolio', (req, res) => {
        if (req.method === 'GET') {
          try {
            if (fs.existsSync(sharedFilePath)) {
              const content = fs.readFileSync(sharedFilePath, 'utf8');
              res.setHeader('Content-Type', 'application/json');
              res.end(content);
              return;
            }
          } catch (e) {}
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ holdings: [] }));
        } else if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const parsed = JSON.parse(body);
              fs.writeFileSync(sharedFilePath, JSON.stringify(parsed, null, 2), 'utf8');
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ status: 'ok', count: parsed.holdings?.length || 0 }));
            } catch (e) {
              res.statusCode = 500;
              res.end(JSON.stringify({ status: 'error', message: e.message }));
            }
          });
        }
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), apiDevPlugin()]
});
