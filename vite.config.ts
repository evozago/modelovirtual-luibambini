import path from 'path';
// Fix: Import `process` to provide correct types for the Node.js global.
import process from 'process';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
// Fix: __dirname is not defined in ES module scope.
// We are defining it using import.meta.url.
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
    // Carrega as variáveis de ambiente do diretório raiz do projeto.
    const env = loadEnv(mode, process.cwd(), '');

    // Prioriza VITE_IA_API_KEY, mas usa IA_API_KEY como fallback para flexibilidade na Vercel.
    const iaApiKey = env.VITE_IA_API_KEY || env.IA_API_KEY;

    // Log de diagnóstico para o processo de build na Vercel.
    if (iaApiKey) {
      console.log('✅ Chave de API (IA_API_KEY) encontrada e será injetada no build.');
    } else {
      console.log('❌ ATENÇÃO: Chave de API (IA_API_KEY ou VITE_IA_API_KEY) NÃO foi encontrada nas variáveis de ambiente. O aplicativo não funcionará.');
    }

    return {
      server: {
        host: '0.0.0.0',
        proxy: {
            // Proxy API requests to the backend server
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
            '/api-proxy': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            }
        }
      },
      plugins: [react()],
      // A injeção manual de variáveis de ambiente é necessária para este ambiente de execução específico.
      // O Vite substituirá essas chaves pelos seus valores correspondentes durante o build.
      define: {
        // Define sempre VITE_IA_API_KEY para que o código do frontend possa usá-la de forma consistente.
        'import.meta.env.VITE_IA_API_KEY': JSON.stringify(iaApiKey),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});