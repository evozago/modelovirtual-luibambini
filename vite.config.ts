import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
// Fix: __dirname is not defined in ES module scope.
// We are defining it using import.meta.url.
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
    // Carrega as variáveis de ambiente do diretório raiz do projeto.
    const env = loadEnv(mode, process.cwd(), '');

    // Prioriza VITE_GEMINI_API_KEY, mas usa GEMINI_API_KEY como fallback para flexibilidade na Vercel.
    const geminiApiKey = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY;

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      // A injeção manual de variáveis de ambiente é necessária para este ambiente de execução específico.
      // O Vite substituirá essas chaves pelos seus valores correspondentes durante o build,
      // resolvendo o erro "Cannot read properties of undefined".
      define: {
        // Define sempre VITE_GEMINI_API_KEY para que o código do frontend possa usá-la de forma consistente.
        'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(geminiApiKey),
        'import.meta.env.VITE_API_BASE_URL': JSON.stringify(env.VITE_API_BASE_URL)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});