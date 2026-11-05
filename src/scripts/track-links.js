// Transmet les paramètres de suivi (UTM, fbclid, gclid…) de l'adresse courante aux liens et au formulaire de recherche internes.
// La logique est dans src/lib/trackingParams.js (testée). Ici : branchement sur la page.
import { trackingFromSearch, withTrackingParams } from '../lib/trackingParams.js';

function currentTracking() {
  const fromUrl = trackingFromSearch(window.location.search);
  // Si l'adresse n'a plus d'UTM (retour arrière, page ouverte autrement), on reprend ceux mémorisés pour l'onglet (voir BaseLayout).
  let stored = {};
  try { if (typeof window.infoVaeUtm === 'function') stored = window.infoVaeUtm(); } catch {}
  const out = {};
  for (const [key, value] of Object.entries(stored || {})) if (value) out[key] = String(value);
  return { ...out, ...fromUrl };
}

function decorate(link) {
  if (!link || link.hasAttribute('data-no-track')) return;
  const href = link.getAttribute('href');
  const next = withTrackingParams(href, currentTracking(), window.location.href);
  if (next !== href) link.setAttribute('href', next);
}

// 1) Tous les liens présents au chargement de la page.
document.querySelectorAll('a[href]').forEach(decorate);

// 2) Liens créés plus tard par le site (résultats de recherche…) et clic au dernier moment.
for (const type of ['click', 'auxclick', 'contextmenu', 'focusin']) {
  document.addEventListener(type, (event) => {
    const link = event.target && event.target.closest ? event.target.closest('a[href]') : null;
    decorate(link);
  }, true);
}

// 3) Formulaire de recherche (méthode GET) : ajoute les paramètres manquants en champs cachés.
document.querySelectorAll('form[method="get" i]').forEach((form) => {
  form.addEventListener('submit', () => {
    const tracking = currentTracking();
    for (const [key, value] of Object.entries(tracking)) {
      if (form.querySelector(`[name="${key}"]`)) continue;
      const input = document.createElement('input');
      input.type = 'hidden'; input.name = key; input.value = value;
      form.appendChild(input);
    }
  });
});
