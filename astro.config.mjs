// @ts-check
import { defineConfig } from 'astro/config';

// Site 100 % statique : `npm run build` produit des fichiers HTML/CSS
// dans le dossier `dist/`, sans serveur nécessaire.
export default defineConfig({
  output: 'static',
});
