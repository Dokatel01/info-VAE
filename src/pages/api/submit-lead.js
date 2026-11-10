import { google } from 'googleapis';

export const prerender = false;

// 1. Dictionnaires de traduction pour un rendu clair et lisible
const LABELS = {
  statut: {
    salarie_prive: 'Salarié(e) du privé',
    agent_public: 'Agent public',
    demandeur_emploi: 'Demandeur(se) d’emploi',
    independant: 'Indépendant(e) ou chef d’entreprise',
    autre: 'Autre (bénévole, étudiant...)'
  },
  activite: {
    commerce_services: 'Commerçant / Micro-entrepreneur',
    liberal: 'Profession libérale',
    medical: 'Profession médicale',
    artiste_auteur: 'Artiste-auteur',
    autre: 'Autre / Inconnu'
  },
  experience: {
    moins_1an: 'Moins d’un an',
    '1_3ans': '1 à 3 ans',
    plus_3ans: 'Plus de 3 ans'
  },
  domaine: {
    sante_social: 'Santé et social',
    education_petite_enfance: 'Éducation et petite enfance',
    commerce_vente: 'Commerce et vente',
    gestion_compta: 'Gestion, administration, compta',
    numerique: 'Informatique et numérique',
    batiment_industrie: 'Bâtiment et industrie',
    hotellerie_tourisme: 'Hôtellerie, restauration, tourisme',
    transport_logistique: 'Transport et logistique',
    autre: 'Autre domaine',
    inconnu: 'Ne sait pas encore'
  },
  niveau: {
    cap_bep: 'CAP / BEP',
    bac: 'Bac / Bac pro',
    bac2: 'Bac+2 (BTS, DUT)',
    bac3_plus: 'Bac+3 et plus',
    inconnu: 'Ne sait pas encore'
  },
  financement: {
    cpf: 'Mon CPF',
    employeur_opco: 'Employeur / OPCO',
    administration: 'Administration',
    france_travail_region: 'France Travail / Région',
    fonds_formation: 'Fonds de formation (Agefice, FIF PL…)',
    personnel: 'Fonds personnels',
    inconnu: 'Ne sait pas encore'
  },
  delai: {
    moins_3_mois: 'Dans les 3 mois',
    '3_6_mois': 'Dans 3 à 6 mois',
    plus_tard: 'Plus tard'
  },
  mode: {
    visio: 'À distance (visio)',
    presentiel: 'En présentiel',
    indifferent: 'Peu importe'
  },
  eligibilite: {
    eligible: 'Éligible',
    non_eligible: 'Non éligible'
  },
  score: {
    chaud: 'Chaud',
    tiede: 'Tiède',
    froid: 'Froid',
    non_eligible: 'Non éligible',
    non_vendable: 'Non vendable'
  }
};

function formatLabel(category, val) {
  if (!val) return '-';
  return LABELS[category]?.[val] || val;
}

export async function POST({ request, redirect }) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let data = {};

    if (contentType.includes('application/json')) {
      data = await request.json();
    } else {
      const formData = await request.formData();
      data = Object.fromEntries(formData.entries());
    }

    // Protection anti-bot
    if (data['bot-field']) {
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    const credentials = JSON.parse(import.meta.env.GOOGLE_CREDS);

    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Formatage propre et lisible pour les humains
    const row = [
      new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }), // Date & Heure
      data.prenom || '',
      data.telephone ? `'${data.telephone}` : '', // Conserve le 0 initial
      data.email || '',
      data.code_postal ? `'${data.code_postal}` : '', // Conserve le code postal (ex: 06000)
      formatLabel('statut', data.statut),
      data.statut === 'independant' ? formatLabel('activite', data.activite) : '-',
      formatLabel('experience', data.experience),
      formatLabel('domaine', data.domaine),
      data.diplome_vise || '-',
      formatLabel('niveau', data.niveau),
      formatLabel('financement', data.financement),
      formatLabel('delai', data.delai),
      formatLabel('mode', data.mode),
      data.consent_traitement === 'oui' ? 'Oui' : 'Non',
      data.consent_contact === 'oui' ? 'Oui' : 'Non',
      data.consent_conseils === 'oui' ? 'Oui' : '-',
      formatLabel('eligibilite', data.eligibilite),
      formatLabel('score', data.score),
      data.vendable === 'oui' ? 'Oui' : 'Non',
      data.source || 'quiz-vae',
      data.utm_source || '-',
      data.utm_medium || '-',
      data.utm_campaign || '-',
      data.utm_content || '-',
      data.fbclid || '-',
      data.page_url || '',
      data.referrer || ''
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: import.meta.env.GOOGLE_SHEET_ID,
      range: 'A:AB',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row],
      },
    });

    if (!contentType.includes('application/json')) {
      return redirect('/merci', 303);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Erreur API Google Sheets :', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}