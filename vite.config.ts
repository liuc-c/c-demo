/// <reference types="vitest" />

import path from 'node:path'
import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'
import Pages from 'vite-plugin-pages'
import UnoCSS from 'unocss/vite'
import VueMacros from 'unplugin-vue-macros/vite'

export default defineConfig({
  resolve: {
    alias: {
      '~/': `${path.resolve(__dirname, 'src')}/`,
    },
  },
  plugins: [
    VueMacros({
      defineOptions: false,
      defineModels: false,
      plugins: {
        vue: Vue({
          script: {
            propsDestructure: true,
            defineModel: true,
          },
        }),
      },
    }),

    // https://github.com/hannoeru/vite-plugin-pages
    Pages(),

    // https://github.com/antfu/unocss
    // see uno.config.ts for config
    UnoCSS(),
  ],
  server: {
    proxy: {
      // '/collectApi': {
      //   target: 'http://192.168.1.20:3501',
      //   changeOrigin: true,
      //   rewrite: path => path.replace(/^\/collectApi/, ''),
      // },
      '/api': {
        target: 'http://192.168.1.20:3501',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, ''),
      },
    },
  },
  // https://github.com/vitest-dev/vitest
  test: {
    environment: 'jsdom',
  },
  build: {
    rollupOptions: {
      input: 'src/utils/clarity.js',
      output: {
        entryFileNames: 'clarity.js',
        format: 'es',
        name: 'clarity',
      },
    },
  },
})
