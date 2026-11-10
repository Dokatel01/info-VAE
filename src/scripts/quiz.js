// Questionnaire « Suis-je éligible ? » : logique fournie par Info VAE, reprise telle quelle (étapes, conditions, champs).
(function () {
  var form = document.getElementById('vq-form');
  var steps = Array.prototype.slice.call(form.querySelectorAll('.vq-step'));
  var main = document.getElementById('vq-main');
  var bar = document.getElementById('vq-bar');
  var count = document.getElementById('vq-count');
  var backRow = document.getElementById('vq-backrow');
  var current = 0;

  function val(name) {
    var el = form.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : '';
  }

  // Une étape avec data-only ne s'affiche que pour le statut indiqué.
  function applies(step) {
    var only = step.getAttribute('data-only');
    return !only || only === val('statut');
  }

  function nextIdx(from) {
    for (var k = from + 1; k < steps.length; k++) if (applies(steps[k])) return k;
    return from;
  }

  function prevIdx(from) {
    for (var k = from - 1; k >= 0; k--) if (applies(steps[k])) return k;
    return from;
  }

  // Affiche le groupe d'options de financement correspondant au statut.
  function prepareFinancement(step) {
    var statut = val('statut') || 'autre';
    var groups = step.querySelectorAll('[data-for]');
    Array.prototype.forEach.call(groups, function (g) {
      var match = g.getAttribute('data-for') === statut;
      g.hidden = !match;
      Array.prototype.forEach.call(g.querySelectorAll('input'), function (inp) {
        inp.disabled = !match;
        if (!match) inp.checked = false;
      });
    });
  }

  // Étape coordonnées : case « partenaires » si éligible, case « conseils par email » sinon.
  function prepareCoordonnees() {
    var eligible = val('experience') !== 'moins_1an';
    var boxContact = document.getElementById('vq-box-contact');
    var boxConseils = document.getElementById('vq-box-conseils');
    boxContact.hidden = !eligible;
    boxConseils.hidden = eligible;
    form.elements['consent_contact'].disabled = !eligible;
    form.elements['consent_conseils'].disabled = eligible;
    if (!eligible) form.elements['consent_contact'].checked = false;
    if (eligible) form.elements['consent_conseils'].checked = false;
  }

  function show(n) {
    current = n;
    var step = steps[n];
    if (step.getAttribute('data-step') === 'financement') prepareFinancement(step);
    if (step.getAttribute('data-step') === 'coordonnees') prepareCoordonnees();
    steps.forEach(function (s, k) { s.hidden = (k !== n); });

    var visible = steps.filter(applies);
    var pos = visible.indexOf(step) + 1;
    var total = visible.length;
    bar.style.width = (pos / total * 100) + '%';
    count.textContent = pos < total ? 'Question ' + pos + ' sur ' + (total - 1) : 'Dernière étape';
    backRow.hidden = (n === 0);

    var lg = step.querySelector('legend');
    lg.setAttribute('tabindex', '-1');
    lg.focus();
  }

  function showError(step, msg) {
    var p = step.querySelector('.vq-err');
    if (p) { p.textContent = msg; p.hidden = false; }
  }

  form.addEventListener('change', function (e) {
    var t = e.target;
    if (t.type !== 'radio') return;
    var step = t.closest('.vq-step');
    var err = step.querySelector('.vq-err');
    if (err) err.hidden = true;
    if (t.name === 'experience') {
      var soft = step.querySelector('.vq-soft');
      if (t.value === 'moins_1an') {
        soft.hidden = false;
        return;
      }
      soft.hidden = true;
    }
    if (step.hasAttribute('data-auto')) {
      setTimeout(function () { show(nextIdx(current)); }, 150);
    }
  });

  Array.prototype.forEach.call(form.querySelectorAll('.vq-next'), function (btn) {
    btn.addEventListener('click', function () {
      var step = steps[current];
      if (!step.querySelector('input[type="radio"]:checked')) {
        showError(step, 'Choisissez une réponse pour continuer.');
        return;
      }
      show(nextIdx(current));
    });
  });

  form.querySelector('.vq-back').addEventListener('click', function () {
    if (current > 0) show(prevIdx(current));
  });

  form.querySelector('.vq-soft-next').addEventListener('click', function () {
    show(nextIdx(current));
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault(); // Empêche le POST natif vers /merci

    var tel = form.elements['telephone'];
    var digits = tel.value.replace(/[\s.\-]/g, '');
    var okTel = /^(?:\+33|0033|0)[1-9]\d{8}$/.test(digits);
    if (!okTel) {
      tel.setCustomValidity('Entrez un numéro français valide, par exemple 06 12 34 56 78.');
      tel.reportValidity();
      tel.addEventListener('input', function () { tel.setCustomValidity(''); }, { once: true });
      return;
    }

    // Si l'utilisateur est revenu en arrière et a changé de statut, on retire l'activité orpheline.
    if (val('statut') !== 'independant') {
      Array.prototype.forEach.call(form.querySelectorAll('input[name="activite"]'), function (r) { r.checked = false; });
    }

    var eligible = val('experience') !== 'moins_1an';
    var contact = eligible && form.elements['consent_contact'].checked;
    var ok = 0;
    if (val('domaine') && val('domaine') !== 'inconnu') ok++;
    if (val('financement') && val('financement') !== 'inconnu') ok++;
    if (val('delai') === 'moins_3_mois') ok++;

    var vendable = contact ? 'oui' : 'non';
    form.elements['vendable'].value = vendable;
    form.elements['eligibilite'].value = eligible ? 'eligible' : 'non_eligible';
    form.elements['score'].value = !eligible ? 'non_eligible' : (!contact ? 'non_vendable' : (ok === 3 ? 'chaud' : (ok === 2 ? 'tiede' : 'froid')));
    form.elements['consent_timestamp'].value = new Date().toISOString();
    form.elements['consent_traitement_texte'].value = document.getElementById('vq-txt-traitement').textContent.trim();
    form.elements['consent_contact_texte'].value = eligible ? document.getElementById('vq-txt-contact').textContent.trim() : '';
    form.elements['consent_conseils_texte'].value = (!eligible && form.elements['consent_conseils'].checked)
      ? document.getElementById('vq-txt-conseils').textContent.trim() : '';
    form.elements['page_url'].value = location.href;
    form.elements['referrer'].value = document.referrer;

    var q = new URLSearchParams(location.search);
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'fbclid'].forEach(function (k) {
      form.elements[k].value = q.get(k) || '';
    });

    // Désactiver le bouton submit pendant l'envoi
    var submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Envoi en cours...';
    }

    // URL de redirection finale avec les paramètres
    var merciUrl = '/merci?statut=' + encodeURIComponent(val('statut')) +
      '&a=' + encodeURIComponent(val('activite')) + '&v=' + vendable + '&e=' + (eligible ? 'oui' : 'non');

    // Envoi des données vers le backend Google Sheets
    var formData = new FormData(form);

    fetch('/api/submit-lead', {
      method: 'POST',
      body: formData
    })
    .then(function (res) {
      // Qu'il réussisse ou non, on redirige l'utilisateur vers sa page de confirmation
      window.location.href = merciUrl;
    })
    .catch(function (err) {
      console.error('Erreur lors de l’envoi :', err);
      // Fallback redirection
      window.location.href = merciUrl;
    });
  });

  show(0);
})();