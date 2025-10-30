import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// Fix: __dirname is not defined in ES module scope.
// We are defining it using import.meta.url.
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      // A seção 'define' foi removida.
      // O Vite expõe automaticamente variáveis de ambiente de arquivos .env
      // que começam com VITE_ para o seu código frontend via `import.meta.env`.
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
