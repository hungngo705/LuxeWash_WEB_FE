import { rolldown } from 'rolldown'

const bundle = await rolldown({
  input: 'tests/public-catalog.regression.mjs',
  platform: 'node',
  transform: {
    jsx: { runtime: 'automatic' },
    define: {
      'import.meta.env': JSON.stringify({ VITE_API_BASE_URL: 'http://localhost:5030/api/v1', VITE_AI_API_BASE_URL: 'http://localhost:5030/api/v1', VITE_CAMERA_AI_BASE_URL: 'http://localhost:5030' }),
    },
  },
})
try {
  await bundle.write({ file: 'node_modules/.cache/public-catalog.regression.mjs', format: 'esm' })
  await import('../node_modules/.cache/public-catalog.regression.mjs')
} finally {
  await bundle.close()
}
