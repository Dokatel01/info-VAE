// @ts-check
import { defineConfig } from 'astro/config';

import vercel from '@astrojs/vercel';

// Site 100 % statique : `npm run build` produit des fichiers HTML/CSS
// dans le dossier `dist/`, sans serveur nécessaire.
export default defineConfig({
  output: 'static',
  adapter: vercel(),
});