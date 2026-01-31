import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                viewer: resolve(__dirname, 'viewer.html'),
                portal: resolve(__dirname, 'portal.html'),
                debug: resolve(__dirname, 'debug-portal.html'),
                diagnostic: resolve(__dirname, 'diagnostic.html'),
            },
        },
    },
});
