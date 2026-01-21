import { defineConfig, type Plugin } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname = fileURLToPath(new URL('.', import.meta.url))

/**
 * Plugin to inline ?raw imports in library mode.
 * Vite's built-in ?raw handling doesn't work with preserveModules.
 */
function inlineRawPlugin(): Plugin {
  return {
    name: 'inline-raw',
    enforce: 'pre',
    resolveId(source, importer) {
      if (source.endsWith('?raw') && importer) {
        const cleanPath = source.slice(0, -4) // remove ?raw
        const absolutePath = resolve(dirname(importer), cleanPath)
        return `\0raw:${absolutePath}`
      }
      return null
    },
    load(id) {
      if (id.startsWith('\0raw:')) {
        const filePath = id.slice(5)
        const content = readFileSync(filePath, 'utf-8')
        return `export default ${JSON.stringify(content)};`
      }
      return null
    },
  }
}

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    outDir: 'dist',
    rollupOptions: {
      external: ['three', 'livekit-client', 'simplex-noise'],
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
      },
    },
    sourcemap: true,
    minify: false,
  },
  plugins: [inlineRawPlugin()],
})
