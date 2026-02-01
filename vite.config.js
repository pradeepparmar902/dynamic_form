import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    base: './', // CRITICAL for GitHub Pages (relative paths)
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                viewer: resolve(__dirname, 'viewer.html'),
                portal: resolve(__dirname, 'portal.html'),
                dashboard: resolve(__dirname, 'dashboard.html'),
                workspace: resolve(__dirname, 'workspace.html'),
                portalDesigner: resolve(__dirname, 'portal-designer.html'),
                debug: resolve(__dirname, 'debug-portal.html'),
                diagnostic: resolve(__dirname, 'diagnostic.html'),
            },
        },
    },
});
