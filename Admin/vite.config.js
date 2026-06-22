import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => ({
    base: mode === 'production' ? '/admin/' : '/',
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 3000,
        open: true,
    },
    build: {
        outDir: 'build',
        sourcemap: false,
    },
    esbuild: {
        jsx: 'automatic',
    },
    optimizeDeps: {
        esbuildOptions: {
            loader: {
                '.js': 'jsx',
            },
        },
    },
    define: {
        'process.env': {
            'VITE_API_URL_DEV': JSON.stringify(process.env.VITE_API_URL_DEV),
            'VITE_API_URL_PROD': JSON.stringify(process.env.VITE_API_URL_PROD),
        },
    },
    css: {
        preprocessorOptions: {
            scss: {
                // Silence all deprecation warnings for Bootstrap and other dependencies
                // that still use legacy @import syntax and other deprecated features
                silenceDeprecations: [
                    'import',               // @import rule deprecation
                    'global-builtin',       // Global built-in functions
                    'legacy-js-api',        // Legacy JS API
                    'color-functions',      // lighten(), darken(), etc.
                    'slash-div',            // Using / for division
                    'mixed-decls',          // Mixed declarations
                    'if-function',          // @if function deprecation
                ],
                quietDeps: true,            // Suppress warnings from dependencies
            },
        },
    },
}));
