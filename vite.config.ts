import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about.html'),
        careers: resolve(__dirname, 'careers.html'),
        blog: resolve(__dirname, 'blog.html'),
        invicta: resolve(__dirname, 'invicta.html'),
        iris: resolve(__dirname, 'iris.html'),
        iqra: resolve(__dirname, 'iqra.html'),
        paradizia: resolve(__dirname, 'paradizia.html'),
        inayaResidency: resolve(__dirname, 'inaya-residency.html'),
        inaraMetro: resolve(__dirname, 'inara-metro.html'),
        iraResidency: resolve(__dirname, 'ira-residency.html'),
      },
    },
  },
});
