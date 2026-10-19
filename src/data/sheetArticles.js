// ============================================================================
// ARTICLES ISSUS DU GOOGLE SHEETS « Suivi article site info VAE » (état « à intégrer »)
//
// Chaque article ci-dessous correspond à UNE ligne du Sheet et à UN Google Doc :
//   - title      = titre du Sheet (seuls les espaces / sauts de ligne superflus ont été retirés)
//   - categories = colonne « Catégorie » du Sheet, découpée sur la virgule, libellés INCHANGÉS
//   - content    = texte du Google Doc, transcrit tel quel (titre du Doc exclu : il est dans `title`)
//   - source     = traçabilité (ligne du Sheet, identifiant du Doc, état du Sheet à la date de relevé)
//
// Aucun texte n'a été inventé. Le Sheet ne contient ni résumé, ni extrait, ni image :
//   - summary / excerpt = premier paragraphe du Doc (repris mot pour mot)
//   - image             = image par défaut (à remplacer)
//
// Articles NON intégrés car le Doc source est incomplet (fin de texte coupée), voir le bilan :
//   ligne 13 « Peut-on faire une VAE à distance », ligne 14 « Une assistante maternelle… ».
// ============================================================================

const AUTHOR = 'La Rédaction de Info-VAE';
const DEFAULT_IMAGE = '/images/article-default.jpg';
const DATE_INTEGRATION = '2026-10-19';

export const sheetArticles = [
  // --------------------------------------------------------------------------
  // Ligne 8 — Pour qui, Auxiliaire Puériculture
  // --------------------------------------------------------------------------
  {
    slug: 'obtenir-le-diplome-d-etat-d-auxiliaire-de-puericulture-par-la-vae-qui-peut-en-faire-la-demande',
    title: 'Obtenir le Diplôme d’État d’Auxiliaire de Puériculture par la VAE : Qui peut en faire la demande ?',
    breadcrumbTitle: 'Diplôme d’État d’Auxiliaire de Puériculture par la VAE',
    categories: ['Pour qui', 'Auxiliaire Puériculture'],
    excerpt:
      'Le Diplôme d’État d’Auxiliaire de Puériculture (DEAP) est un diplôme de niveau 3 (anciennement niveau V, équivalent au CAP), qui permet de travailler auprès des jeunes enfants, en crèche, à l’hôpital, en maternité, ou encore en école maternelle.',
    summary:
      'Le Diplôme d’État d’Auxiliaire de Puériculture (DEAP) est un diplôme de niveau 3 (anciennement niveau V, équivalent au CAP), qui permet de travailler auprès des jeunes enfants, en crèche, à l’hôpital, en maternité, ou encore en école maternelle.',
    updatedAt: DATE_INTEGRATION,
    author: AUTHOR,
    image: DEFAULT_IMAGE,
    imageAlt: '',
    provisional: false,
    source: { sheetRow: 8, docId: '1S4hYAQEQ1Niw4yuVFqR0sckrtURyPdUY4aByAfV_eCU', sheetStatus: 'à intégrer' },
    content: [
      {
        type: 'p',
        text: 'Le **Diplôme d’État d’Auxiliaire de Puériculture (DEAP)** est un diplôme de niveau 3 (anciennement niveau V, équivalent au CAP), qui permet de travailler auprès des jeunes enfants, en crèche, à l’hôpital, en maternité, ou encore en école maternelle.',
      },
      {
        type: 'p',
        text: 'Bonne nouvelle : il est possible de l’obtenir **par la VAE (Validation des Acquis de l’Expérience)**. Autrement dit, vous pouvez décrocher ce diplôme sans suivre de formation classique, à condition d’avoir déjà une expérience professionnelle en lien avec ce métier. Voici les principales conditions à remplir.',
      },
      { type: 'hr' },
      { type: 'h2', text: '1. Justifier d’au moins 1 an d’expérience dans le domaine' },
      {
        type: 'p',
        text: 'Pour être éligible à la VAE, vous devez avoir exercé pendant **au moins 1 an à temps plein (soit 1607 heures)** dans des activités en lien direct avec le métier d’auxiliaire de puériculture.',
      },
      { type: 'p', text: 'Cela peut inclure :' },
      {
        type: 'ul',
        items: [
          '**Un emploi salarié** : en crèche, en maternité, à l’hôpital, ou dans une structure d’accueil d’enfants.',
          '**Du bénévolat ou du volontariat** : par exemple dans une association, en animant ou en encadrant des enfants.',
          '**Des stages ou une alternance** : s’ils ont permis d’acquérir des compétences concrètes dans les soins ou l’accompagnement des enfants.',
          '**Une expérience familiale ou personnelle** : comme assistante maternelle ou proche aidant, si les missions sont en lien avec celles du métier.',
        ],
      },
      { type: 'hr' },
      { type: 'h2', text: '2. Avoir acquis les compétences attendues' },
      { type: 'p', text: 'Votre expérience doit vous avoir permis de développer les **compétences clés du métier**, telles que :' },
      {
        type: 'ul',
        items: [
          'Accompagner l’enfant dans les gestes du quotidien (repas, toilette, sommeil).',
          'Veiller à son bien-être, sa sécurité et son éveil.',
          'Identifier ses besoins et participer au suivi de sa santé.',
          'Travailler en équipe au sein d’une structure de soins ou d’accueil.',
        ],
      },
      { type: 'hr' },
      { type: 'h2', text: '3. Comprendre les exigences du diplôme' },
      {
        type: 'p',
        text: 'La démarche VAE repose sur la **rédaction d’un dossier détaillé (le livret 2)**, dans lequel vous devrez décrire vos activités, vos missions et les compétences acquises. Ce document est essentiel : il sera lu par un jury qui évaluera si votre expérience justifie l’attribution du diplôme.',
      },
      { type: 'hr' },
      { type: 'h2', text: '4. Se faire accompagner (optionnel mais utile)' },
      { type: 'p', text: 'Même si l’accompagnement n’est pas obligatoire, il est vivement recommandé. Un professionnel de la VAE peut vous aider à :' },
      {
        type: 'ul',
        items: ['Identifier les expériences pertinentes.', 'Structurer votre dossier.', 'Préparer l’entretien avec le jury.'],
      },
      { type: 'hr' },
      { type: 'h2', text: 'En résumé' },
      {
        type: 'p',
        text: 'Si vous avez **au moins 1 an d’expérience** dans la prise en charge d’enfants, vous pouvez entamer une **VAE pour devenir auxiliaire de puériculture**. Peu importe que cette expérience soit issue d’un emploi, du bénévolat ou d’un contexte personnel, tant qu’elle vous a permis de développer les compétences du métier.',
      },
      {
        type: 'conclusion',
        text: 'Besoin d’aide pour démarrer ? Un **conseiller VAE** peut vous orienter et vous accompagner tout au long du parcours.',
      },
    ],
  },

  // --------------------------------------------------------------------------
  // Ligne 9 — Financement, Tarif
  // --------------------------------------------------------------------------
  {
    slug: 'est-ce-que-pole-emploi-finance-la-vae-ce-qu-il-faut-savoir',
    title: 'Est-ce que Pôle Emploi finance la VAE : Ce qu\'il faut savoir',
    categories: ['Financement', 'Tarif'],
    excerpt:
      'Pôle Emploi peut, dans certaines situations, financer une partie des coûts liés à la Validation des Acquis de l\'Expérience (VAE).',
    summary:
      'Pôle Emploi peut, dans certaines situations, financer une partie des coûts liés à la Validation des Acquis de l\'Expérience (VAE). Cependant, il est important de noter que, ces dernières années, les modalités de financement ont évolué, et Pôle Emploi finance de moins en moins directement la VAE.',
    updatedAt: DATE_INTEGRATION,
    author: AUTHOR,
    image: DEFAULT_IMAGE,
    imageAlt: '',
    provisional: false,
    source: { sheetRow: 9, docId: '1CiZOCPOHrLtCoL3nurPje6cQoBBqfk9618ZShFDlAFA', sheetStatus: 'à intégrer' },
    content: [
      {
        type: 'p',
        text: 'Pôle Emploi peut, dans certaines situations, financer une partie des coûts liés à la Validation des Acquis de l\'Expérience (VAE). Cependant, il est important de noter que, ces dernières années, les modalités de financement ont évolué, et Pôle Emploi finance de moins en moins directement la VAE. Le financement est souvent **partiel** et dépend de plusieurs facteurs, comme **la région** et les **fonds disponibles**. Voici ce que vous devez savoir pour mieux comprendre comment accéder à un financement pour votre VAE si vous êtes demandeur d\'emploi.',
      },
      { type: 'h2', text: '1. Financement partiel de la VAE par Pôle Emploi :' },
      {
        type: 'p',
        text: 'Pôle Emploi ne prend généralement pas en charge la totalité des coûts liés à la VAE, mais peut apporter un soutien **partiel**. Ce soutien se fait surtout via l\'**Aide Individuelle à la Formation (AIF)**, qui couvre principalement les frais **annexes** à la VAE, tels que :',
      },
      {
        type: 'ul',
        items: [
          '**Les frais de déplacement** : Si vous devez vous rendre dans un autre endroit pour passer des entretiens avec le jury ou pour des formations spécifiques, une aide pour le transport peut être envisagée.',
          '**Les frais de préparation** : Bien que Pôle Emploi finance de moins en moins les coûts directs du dossier de VAE (comme la rédaction du livret 2 ou l\'accompagnement), dans certains cas spécifiques, des aides peuvent être allouées pour des actions de préparation (par exemple, des formations complémentaires ou un accompagnement). Cependant, cela reste **variable** et dépend des budgets régionaux et des priorités locales.',
        ],
      },
      { type: 'h2', text: '2. La situation varie selon les régions et les fonds disponibles :' },
      {
        type: 'p',
        text: 'Le financement de la VAE par Pôle Emploi n’est pas uniforme à travers toute la France. **Tout dépend des fonds disponibles dans chaque région** et des priorités de financement déterminées localement. Certaines régions peuvent offrir une aide plus généreuse pour le financement de la VAE, tandis que d\'autres ne financeront qu\'une partie du projet, ou se concentreront davantage sur des aides périphériques comme les frais de transport ou d’hébergement.',
      },
      {
        type: 'p',
        text: 'Cela signifie que, dans certaines régions, vous pourrez peut-être obtenir une aide **partielle pour l’accompagnement** ou pour les **frais de dossier**, mais ce n\'est pas systématique.',
      },
      { type: 'h2', text: '3. Un financement de plus en plus restreint :' },
      {
        type: 'p',
        text: 'Dans le passé, Pôle Emploi pouvait couvrir une plus grande partie des coûts liés à la VAE, mais ces financements ont été de plus en plus **restreints** au fil des années. Aujourd\'hui, **les aides sont souvent limitées aux dépenses périphériques** (déplacements, hébergement, etc.), et les demandeurs d\'emploi doivent parfois prendre en charge une partie des coûts liés à la procédure de VAE, comme l\'accompagnement ou la préparation du dossier.',
      },
      {
        type: 'p',
        text: 'Il est également possible que Pôle Emploi refuse de financer certaines démarches si le projet de VAE ne semble pas être directement lié à une perspective d\'emploi claire et immédiate.',
      },
      { type: 'h2', text: '4. La démarche pour obtenir un financement :' },
      { type: 'p', text: 'Si vous souhaitez obtenir un financement de la VAE par Pôle Emploi, voici les étapes à suivre :' },
      {
        type: 'ul',
        items: [
          '**Prendre rendez-vous avec votre conseiller Pôle Emploi** : Lors de l\'entretien, vous devrez expliquer en détail votre projet de VAE et démontrer que celui-ci est pertinent par rapport à votre projet professionnel. Il est crucial de montrer en quoi la VAE pourra réellement **améliorer votre employabilité**.',
          '**Demander l\'Aide Individuelle à la Formation (AIF)** : Si votre conseiller valide votre projet, il pourra vous orienter vers l\'AIF pour financer certaines parties de la VAE. Cela peut inclure les **frais de transport** ou **d’hébergement**, ou des frais indirects liés à la démarche.',
          '**Vérifier les possibilités de financement selon la région** : Selon où vous résidez, les modalités de financement peuvent varier. N\'hésitez pas à vous renseigner sur les **options locales** et à consulter les **aides disponibles** dans votre région.',
        ],
      },
      { type: 'h2', text: '5. Cas spécifiques et exceptions :' },
      {
        type: 'p',
        text: 'Il existe des exceptions à cette règle générale de financement partiel. Dans certains cas, Pôle Emploi pourrait prendre en charge une partie des **frais de préparation** à la VAE, ou bien financer des **formations préalables** nécessaires à la validation du diplôme. Toutefois, ces aides sont accordées de manière plus ponctuelle et dépendent largement des **disponibilités budgétaires** et des critères de sélection définis par votre conseiller et la région.',
      },
      { type: 'h2', text: '6. Que faire si Pôle Emploi ne finance pas la VAE ?' },
      {
        type: 'p',
        text: 'Si vous ne pouvez pas obtenir un financement complet ou même partiel par Pôle Emploi, il existe d’autres options pour financer votre VAE :',
      },
      {
        type: 'ul',
        items: [
          '**Le Compte Personnel de Formation (CPF)** : Si vous avez accumulé des droits sur votre CPF, vous pouvez l\'utiliser pour financer la VAE, y compris les frais d’accompagnement.',
          '**Des financements externes** : Certaines **organisations professionnelles**, des **OPCO** (Opérateurs de Compétences) ou des **collectivités locales** peuvent également offrir des financements pour la VAE dans des secteurs spécifiques.',
          '**Le financement personnel** : Si aucune aide n\'est disponible, il peut être nécessaire de prendre en charge une partie des frais vous-même.',
        ],
      },
      { type: 'h2', text: 'Conclusion :' },
      {
        type: 'conclusion',
        text: 'Pôle Emploi peut financer une **partie** des frais liés à la VAE, mais cela reste soumis à des conditions variables, selon la région et les fonds disponibles. En règle générale, le financement des frais directs de la VAE (comme l’accompagnement ou la rédaction des livrets) est de moins en moins courant. Cependant, Pôle Emploi peut intervenir pour financer les **frais annexes**, comme les déplacements ou l\'hébergement. N’hésitez pas à consulter votre conseiller pour examiner les possibilités qui s’offrent à vous et à explorer d\'autres sources de financement pour votre VAE.',
      },
    ],
  },

  // --------------------------------------------------------------------------
  // Ligne 10 — Financement, Tarif
  // --------------------------------------------------------------------------
  {
    slug: 'le-cpf-pour-financer-la-vae-ce-qu-il-faut-savoir',
    title: 'Le CPF pour financer la VAE : Ce qu\'il faut savoir',
    categories: ['Financement', 'Tarif'],
    excerpt:
      'Le Compte Personnel de Formation (CPF) est une excellente option pour financer la Validation des Acquis de l\'Expérience (VAE).',
    summary:
      'Le Compte Personnel de Formation (CPF) est une excellente option pour financer la Validation des Acquis de l\'Expérience (VAE). Grâce à ce dispositif, vous pouvez utiliser vos droits à la formation accumulés pour couvrir tout ou une partie des frais liés à la VAE, tels que l’accompagnement, les frais administratifs, et la préparation du dossier.',
    updatedAt: DATE_INTEGRATION,
    author: AUTHOR,
    image: DEFAULT_IMAGE,
    imageAlt: '',
    provisional: false,
    source: { sheetRow: 10, docId: '1bQS4Jds-SdEBlUTQa861hnBBIZAQjaD8hquDSD2Q5rs', sheetStatus: 'à intégrer' },
    content: [
      {
        type: 'p',
        text: 'Le **Compte Personnel de Formation (CPF)** est une excellente option pour financer la **Validation des Acquis de l\'Expérience (VAE)**. Grâce à ce dispositif, vous pouvez utiliser vos droits à la formation accumulés pour couvrir tout ou une partie des frais liés à la VAE, tels que l’accompagnement, les frais administratifs, et la préparation du dossier. Voici ce que vous devez savoir pour utiliser votre CPF dans le cadre de la VAE.',
      },
      { type: 'h2', text: '1. Qu\'est-ce que le CPF ?' },
      {
        type: 'p',
        text: 'Le **Compte Personnel de Formation** est un compte individuel, qui permet à chaque actif, qu’il soit salarié, demandeur d\'emploi, ou indépendant, d’accumuler des **droits à la formation**. Ces droits peuvent être utilisés pour financer des actions de formation professionnelles, y compris la VAE, afin de développer les compétences et obtenir des qualifications reconnues.',
      },
      { type: 'h2', text: '2. Le CPF et la VAE : Quelles dépenses peuvent être financées ?' },
      { type: 'p', text: 'Le CPF peut financer **divers aspects** de la procédure de VAE, notamment :' },
      {
        type: 'ul',
        items: [
          '**Les frais d’accompagnement** : L’aide d’un conseiller spécialisé ou d’un organisme d’accompagnement agréé pour rédiger le dossier de VAE (Livret 2) et vous aider à structurer votre parcours professionnel en fonction du diplôme visé.',
          '**Les frais de validation** : Si des frais sont liés à la soumission de votre dossier ou à la présentation devant le jury, ils peuvent être couverts par votre CPF.',
          '**Les formations préalables** : Si des formations sont nécessaires pour compléter votre expérience ou pour acquérir des connaissances manquantes avant de passer la VAE, elles peuvent être financées par votre CPF.',
        ],
      },
      { type: 'h2', text: '3. Comment utiliser le CPF pour financer la VAE ?' },
      { type: 'p', text: 'L’utilisation de votre CPF pour financer la VAE est relativement simple, mais nécessite de suivre certaines étapes :' },
      { type: 'h3', text: 'Étape 1 : Vérifier le solde de votre CPF' },
      {
        type: 'p',
        text: 'Avant de commencer votre démarche de VAE, il est important de vérifier votre solde de CPF sur le site **MonCompteFormation.gouv.fr** ou l’application mobile associée. Cela vous permet de savoir si vous avez suffisamment de droits pour financer tout ou une partie de la procédure de VAE.',
      },
      { type: 'h3', text: 'Étape 2 : Choisir un organisme agréé pour la VAE' },
      {
        type: 'p',
        text: 'Il est important de vous inscrire auprès d’un organisme **habilité à délivrer la certification** que vous souhaitez valider. L’organisme doit être enregistré dans le répertoire spécifique des formations financées par le CPF. Vous pouvez consulter cette liste sur le site officiel de MonCompteFormation.',
      },
      { type: 'h3', text: 'Étape 3 : Faire une demande de financement via MonCompteFormation' },
      {
        type: 'p',
        text: 'Une fois que vous avez sélectionné l’organisme et vérifié que la VAE est éligible au financement, vous pouvez faire votre demande de financement via le site **MonCompteFormation**. Si votre solde est suffisant, vous pourrez directement valider le financement de votre projet. En cas de solde insuffisant, il vous sera possible de compléter le financement par d’autres moyens (par exemple, un financement personnel ou par Pôle Emploi).',
      },
      { type: 'h3', text: 'Étape 4 : Valider la prise en charge des frais' },
      {
        type: 'p',
        text: 'Si votre demande est acceptée, vous recevrez une notification confirmant la prise en charge des frais par votre CPF. Ce financement sera directement versé à l’organisme de formation ou d’accompagnement en charge de votre VAE.',
      },
      { type: 'h3', text: 'Étape 5 : Suivre le processus de la VAE' },
      {
        type: 'p',
        text: 'Une fois le financement accordé, vous pouvez entamer la procédure de VAE, en suivant les différentes étapes, comme la constitution des livrets, la présentation devant le jury, etc. Vous devez vous assurer que les frais sont couverts tout au long du processus.',
      },
      { type: 'h2', text: '4. Quelles conditions pour utiliser le CPF pour la VAE ?' },
      { type: 'p', text: 'Bien que le CPF soit un moyen pratique pour financer la VAE, il y a certaines conditions à respecter :' },
      {
        type: 'ul',
        items: [
          '**Le diplôme visé doit être inscrit au répertoire spécifique** : Le diplôme ou la certification que vous souhaitez valider doit être enregistré dans le **Répertoire National des Certifications Professionnelles (RNCP)** ou le **Répertoire spécifique**.',
          '**L’expérience doit être en lien avec le diplôme** : Vous devez avoir une expérience professionnelle suffisante (généralement un an minimum) dans le domaine correspondant au diplôme visé.',
          '**Le financement est plafonné** : Le montant alloué par votre CPF dépend de votre solde de droits à la formation. Si votre solde est insuffisant pour couvrir l’ensemble des frais, vous devrez compléter le financement avec d’autres aides ou financements.',
        ],
      },
      { type: 'h2', text: '5. Quand utiliser le CPF pour la VAE ?' },
      {
        type: 'p',
        text: 'Il est préférable de débuter la demande de financement dès que vous avez validé votre projet de VAE, et avant de commencer la procédure. Cela vous permettra de savoir précisément combien vous devrez investir et de planifier la démarche en toute sérénité. En cas de financement partiel, cela vous permettra aussi de compléter le reste par d’autres sources, comme le financement de Pôle Emploi ou des aides régionales.',
      },
      { type: 'h2', text: '6. Autres sources de financement pour la VAE' },
      { type: 'p', text: 'Si vous ne pouvez pas financer la totalité de la VAE avec votre CPF, vous pouvez explorer d’autres sources de financement :' },
      {
        type: 'ul',
        items: [
          '**Pôle Emploi** : Pôle Emploi peut parfois financer des frais annexes liés à la VAE (comme les frais de déplacement) dans le cadre de l’Aide Individuelle à la Formation (AIF), bien que cette aide soit de moins en moins courante.',
          '**L’employeur** : Si vous êtes salarié, votre employeur peut financer tout ou partie de votre VAE dans le cadre du plan de développement des compétences de l\'entreprise.',
        ],
      },
      { type: 'h2', text: 'Conclusion :' },
      {
        type: 'p',
        text: 'Le **CPF** est un moyen **pratique et accessible** pour financer une **VAE**, qu\'il s\'agisse de l’accompagnement, des frais administratifs ou des formations préalables. Cependant, il est essentiel de vérifier votre solde de CPF et de vous assurer que le diplôme visé est bien éligible au financement. N’oubliez pas que dans certains cas, un financement complémentaire par d’autres dispositifs (Pôle Emploi, employeur, etc.) peut être nécessaire pour couvrir l\'intégralité des coûts. Pour bien structurer votre projet et profiter de ces financements, il peut être utile de consulter un conseiller spécialisé.',
      },
      {
        type: 'conclusion',
        text: 'NB : Depuis le 2 mai 2024, toute personne utilisant son **Compte Personnel de Formation (CPF)** pour financer une formation doit s\'acquitter d’un **reste à charge obligatoire de 100 €**, appelé **"forfait de participation"**. Ce montant est dû même si le CPF couvre l\'intégralité du coût de la formation. Il ne peut pas être financé par le CPF lui-même, mais peut être pris en charge par l’employeur, un OPCO (organisme financeur), ou une autre aide externe. Certaines exceptions existent, notamment pour les demandeurs d’emploi ou les salariés dont la formation est imposée par l’employeur. Ce reste à charge vise à responsabiliser les bénéficiaires et à limiter les abus.',
      },
    ],
  },

  // --------------------------------------------------------------------------
  // Ligne 11 — Aide soignant
  // --------------------------------------------------------------------------
  {
    slug: 'comment-obtenir-le-diplome-d-etat-d-aide-soignant-deas-par-la-vae',
    title: 'Comment obtenir le Diplôme d\'État d\'Aide-Soignant (DEAS) par la VAE',
    breadcrumbTitle: 'Diplôme d\'État d\'Aide-Soignant (DEAS) par la VAE',
    categories: ['Aide soignant'],
    excerpt:
      'La Validation des Acquis de l\'Expérience (VAE) est une voie alternative pour obtenir le Diplôme d\'État d\'Aide-Soignant (DEAS) sans suivre la formation classique en institut.',
    summary:
      'La Validation des Acquis de l\'Expérience (VAE) est une voie alternative pour obtenir le Diplôme d\'État d\'Aide-Soignant (DEAS) sans suivre la formation classique en institut. Destinée aux professionnels ayant déjà une expérience significative dans le domaine des soins, cette procédure permet de faire reconnaître officiellement ses compétences.',
    updatedAt: DATE_INTEGRATION,
    author: AUTHOR,
    image: DEFAULT_IMAGE,
    imageAlt: '',
    provisional: false,
    source: { sheetRow: 11, docId: '1g93sBAvHAO3bvt35AFTivQJLQMkExtVX5eBVmJ6bw3U', sheetStatus: 'à intégrer' },
    content: [
      {
        type: 'p',
        text: 'La Validation des Acquis de l\'Expérience (VAE) est une voie alternative pour obtenir le Diplôme d\'État d\'Aide-Soignant (DEAS) sans suivre la formation classique en institut. Destinée aux professionnels ayant déjà une expérience significative dans le domaine des soins, cette procédure permet de faire reconnaître officiellement ses compétences.',
      },
      { type: 'h2', text: '1. Vérifier son éligibilité à la VAE aide-soignant' },
      {
        type: 'p',
        text: 'Avant d\'entamer la démarche, il est important de s\'assurer que l\'on répond aux critères d\'éligibilité. Pour cela, il faut justifier **d\'au moins un an d\'expérience à temps plein (soit 1 607 heures)** en lien direct avec les missions d\'un aide-soignant. Cette expérience peut avoir été acquise dans différents contextes :',
      },
      {
        type: 'ul',
        items: [
          'Salarié(e) en établissement de santé (hôpital, clinique, EHPAD, etc.).',
          'Auxiliaire de vie ou aide à domicile.',
          'Travailleur indépendant dans le secteur de l\'aide aux personnes.',
          'Expérience bénévole dans une structure de soins.',
        ],
      },
      {
        type: 'p',
        text: 'L\'expérience doit couvrir plusieurs compétences du métier, telles que l\'accompagnement des patients, la réalisation des soins d\'hygiène et de confort, ou encore la transmission d\'informations à l\'équipe soignante.',
      },
      { type: 'h2', text: '2. Choisir le diplôme et l\'organisme certificateur' },
      {
        type: 'p',
        text: 'Le Diplôme d\'État d\'Aide-Soignant (DEAS) est inscrit au Répertoire National des Certifications Professionnelles (RNCP). Pour entamer la démarche, il faut contacter un **organisme certificateur** (généralement un IFAS - Institut de Formation d\'Aides-Soignants ou une Agence Régionale de Santé) qui examinera le dossier.',
      },
      { type: 'h2', text: '3. Déposer le dossier de recevabilité (Livret 1)' },
      {
        type: 'p',
        text: 'Le **Livret 1** est le premier document à soumettre. Il permet de vérifier si le candidat remplit les conditions nécessaires pour prétendre à la VAE. Ce dossier inclut :',
      },
      {
        type: 'ul',
        items: [
          'Les informations personnelles et administratives.',
          'Un récapitulatif des expériences professionnelles et bénévoles en lien avec le métier.',
          'Les justificatifs d\'expérience (bulletins de salaire, attestations d\'employeur, certificats de travail, etc.).',
        ],
      },
      {
        type: 'p',
        text: 'L\'organisme certificateur analyse le dossier et rend une **décision de recevabilité**. En cas d\'accord, le candidat peut passer à l\'étape suivante.',
      },
      { type: 'h2', text: '4. Rédiger le dossier de validation (Livret 2)' },
      {
        type: 'p',
        text: 'Le **Livret 2** est une étape cruciale. Il s\'agit de décrire de manière détaillée comment les compétences exigées pour le diplôme ont été acquises sur le terrain. Ce dossier doit démontrer la maîtrise des **11 compétences du référentiel aide-soignant**, notamment :',
      },
      {
        type: 'ul',
        items: [
          'Accompagner une personne dans les gestes de la vie quotidienne.',
          'Réaliser des soins d\'hygiène et de confort.',
          'Observer l\'état de santé et transmettre les informations à l\'équipe médicale.',
        ],
      },
      {
        type: 'p',
        text: '**Conseil :** Utiliser des exemples concrets de situations rencontrées et les illustrer avec des preuves (protocoles suivis, interactions avec les patients, améliorations apportées, etc.).',
      },
      {
        type: 'p',
        text: 'Un accompagnement VAE (facultatif mais recommandé) peut aider à structurer et rédiger le dossier de manière optimale.',
      },
      { type: 'h2', text: '5. Passer devant le jury' },
      {
        type: 'p',
        text: 'Une fois le **Livret 2** accepté, le candidat est convoqué à un **entretien avec un jury professionnel**. Cette étape vise à compléter l\'évaluation des compétences par un échange oral.',
      },
      {
        type: 'ul',
        items: [
          '**Objectif :** Apprécier l\'adéquation entre l\'expérience et les exigences du diplôme.',
          '**Déroulement :** Présentation du parcours et réponses aux questions du jury sur des situations concrètes de soins.',
        ],
      },
      {
        type: 'p',
        text: 'Une bonne préparation est essentielle pour mettre en avant son expérience et démontrer ses compétences.',
      },
      { type: 'h2', text: '6. Résultat et validation du diplôme' },
      { type: 'p', text: 'Le jury rend sa **décision finale** après l\'entretien :' },
      {
        type: 'ul',
        items: [
          '**Validation totale** : Le candidat obtient le Diplôme d\'État d\'Aide-Soignant (DEAS).',
          '**Validation partielle** : Certaines compétences sont acquises, mais d\'autres doivent être complétées par une formation.',
          '**Refus** : La demande est rejetée, mais il est possible de retravailler le dossier et de recommencer la procédure.',
        ],
      },
      {
        type: 'p',
        text: 'En cas de validation partielle, le candidat a **5 ans pour compléter sa certification**.',
      },
      { type: 'h2', text: '7. Comment financer sa VAE aide-soignant ?' },
      {
        type: 'p',
        text: 'Le coût de la VAE peut inclure les frais de dossier, l\'accompagnement et les déplacements pour l\'entretien. Plusieurs aides sont disponibles :',
      },
      {
        type: 'ul',
        items: [
          '**Le CPF (Compte Personnel de Formation)** : Principal mode de financement.',
          '**Pôle emploi** : Participation possible, mais de plus en plus limitée. Les aides couvrent parfois des frais annexes comme les déplacements.',
          '**Employeur ou OPCO** : Si la VAE est réalisée dans un cadre professionnel.',
          '**Aides régionales** : Variable selon les politiques locales.',
        ],
      },
      { type: 'h2', text: 'Conclusion' },
      {
        type: 'conclusion',
        text: 'La VAE pour devenir aide-soignant est une opportunité de faire reconnaître son expérience et d\'obtenir un diplôme sans suivre un cursus classique. Bien que le processus demande du temps et de la rigueur, il ouvre de nombreuses perspectives professionnelles dans le secteur de la santé. Avec une bonne préparation et, si besoin, un accompagnement adapté, la validation du DEAS est une étape accessible aux professionnels du soin souhaitant évoluer.',
      },
    ],
  },

  // --------------------------------------------------------------------------
  // Ligne 12 — Etapes VAE
  // --------------------------------------------------------------------------
  {
    slug: 'comment-choisir-son-organisme-accompagnateur-vae',
    title: 'Comment choisir son organisme accompagnateur VAE',
    categories: ['Etapes VAE'],
    excerpt:
      'La Validation des Acquis de l\'Expérience (VAE) est un processus exigeant qui demande rigueur et méthodologie. Pour maximiser vos chances de validation, il est souvent recommandé de faire appel à un organisme accompagnateur.',
    summary:
      'La Validation des Acquis de l\'Expérience (VAE) est un processus exigeant qui demande rigueur et méthodologie. Pour maximiser vos chances de validation, il est souvent recommandé de faire appel à un organisme accompagnateur. Mais comment bien le choisir ? Voici les critères essentiels à prendre en compte.',
    updatedAt: DATE_INTEGRATION,
    author: AUTHOR,
    image: DEFAULT_IMAGE,
    imageAlt: '',
    provisional: false,
    source: { sheetRow: 12, docId: '1jChE3n8rr1680yIMDn3zwmAv4l9JhCO_to5bcTZ4_6g', sheetStatus: 'à intégrer' },
    content: [
      {
        type: 'p',
        text: 'La Validation des Acquis de l\'Expérience (VAE) est un processus exigeant qui demande rigueur et méthodologie. Pour maximiser vos chances de validation, il est souvent recommandé de faire appel à un organisme accompagnateur. Mais comment bien le choisir ? Voici les critères essentiels à prendre en compte.',
      },
      { type: 'hr' },
      { type: 'h2', text: '1. Comprendre le rôle de l’accompagnateur VAE' },
      {
        type: 'p',
        text: 'Un accompagnateur VAE n\'est pas un simple conseiller. Son rôle est de vous aider à structurer votre dossier, à valoriser vos compétences et à vous préparer à l’oral devant le jury. Il peut intervenir à différentes étapes :',
      },
      {
        type: 'ul',
        items: [
          'Aide à la rédaction du livret 2 (dossier de validation),',
          'Préparation à l’entretien avec le jury,',
          'Conseil sur le choix du diplôme et l’orientation du dossier,',
          'Soutien méthodologique pour argumenter et illustrer vos expériences.',
        ],
      },
      { type: 'p', text: 'L’accompagnement peut être individuel ou collectif, en présentiel ou à distance selon l’organisme.' },
      { type: 'hr' },
      { type: 'h2', text: '2. Vérifier la reconnaissance et la spécialisation de l’organisme' },
      {
        type: 'p',
        text: 'Tous les organismes d’accompagnement ne se valent pas. Il est important de choisir un acteur reconnu, spécialisé dans la VAE et ayant une expertise dans votre secteur d’activité. Pour cela :',
      },
      {
        type: 'ul',
        items: [
          'Vérifiez s’il est référencé sur le site de France Compétences ou dans les dispositifs régionaux,',
          'Consultez les avis et témoignages d’anciens candidats,',
          'Assurez-vous qu’il connaît bien le diplôme visé et les attentes du jury.',
        ],
      },
      {
        type: 'p',
        text: 'Certains centres de formation, universités et chambres consulaires (CMA, CCI) proposent également des accompagnements VAE de qualité.',
      },
      { type: 'hr' },
      { type: 'h2', text: '3. Comparer les méthodes et le niveau de suivi' },
      { type: 'p', text: 'L’accompagnement peut varier d’un organisme à l’autre :' },
      {
        type: 'ul',
        items: [
          '**Méthodologie** : certains proposent des sessions en groupe, d’autres un suivi individuel plus personnalisé.',
          '**Fréquence des échanges** : certaines structures offrent un suivi intensif avec des entretiens réguliers, tandis que d’autres proposent un accompagnement plus ponctuel.',
          '**Ressources mises à disposition** : accès à des guides, des exemples de dossiers, des formations complémentaires, etc.',
        ],
      },
      { type: 'p', text: 'Pensez à poser ces questions avant de vous engager pour trouver la formule qui vous convient le mieux.' },
      { type: 'hr' },
      { type: 'h2', text: '4. Étudier le coût et les possibilités de financement' },
      {
        type: 'p',
        text: 'L’accompagnement VAE est un service payant, et les tarifs peuvent varier de quelques centaines à plusieurs milliers d’euros selon la durée et le niveau de personnalisation. Voici quelques pistes pour financer votre accompagnement :',
      },
      {
        type: 'ul',
        items: [
          '**Le Compte Personnel de Formation (CPF)** : De nombreux accompagnements sont éligibles et peuvent être financés totalement ou partiellement via votre CPF.',
          '**Les aides régionales** : Certaines régions proposent des dispositifs de soutien à la VAE.',
          '**Pôle emploi** : Bien que le financement de la VAE par Pôle emploi soit plus limité aujourd’hui, des aides ponctuelles peuvent être accordées pour les demandeurs d’emploi.',
          '**L’entreprise** : Si vous êtes salarié, votre employeur peut prendre en charge tout ou partie des frais via son plan de développement des compétences.',
        ],
      },
      {
        type: 'p',
        text: 'Avant de choisir un organisme, demandez un devis détaillé et vérifiez les financements disponibles pour éviter toute mauvaise surprise.',
      },
      { type: 'hr' },
      { type: 'h2', text: '5. Se méfier des promesses trop alléchantes' },
      {
        type: 'p',
        text: 'Attention aux organismes qui garantissent un succès à 100 % ou promettent un accompagnement express sans réel travail personnel. La VAE repose sur l’analyse approfondie de votre parcours, et un bon accompagnateur vous guidera sans rédiger votre dossier à votre place.',
      },
      {
        type: 'p',
        text: 'Privilégiez un organisme qui mise sur la qualité plutôt que sur la rapidité, et qui vous aide réellement à valoriser vos compétences avec un regard objectif et bienveillant.',
      },
      { type: 'hr' },
      { type: 'h2', text: 'En résumé : les bonnes questions à poser avant de choisir' },
      {
        type: 'ul',
        items: [
          'L’organisme est-il reconnu et spécialisé dans mon secteur ?',
          'Quelle est la méthodologie d’accompagnement proposée ?',
          'Quelle est la durée et la fréquence des échanges ?',
          'Quels sont les témoignages d’anciens candidats ?',
          'Quelles sont les possibilités de financement ?',
          'L’accompagnement est-il personnalisé ou en groupe ?',
        ],
      },
      {
        type: 'conclusion',
        text: 'En prenant le temps de bien choisir votre organisme accompagnateur VAE, vous mettrez toutes les chances de votre côté pour réussir votre validation et obtenir votre diplôme sereinement.',
      },
    ],
  },
];
