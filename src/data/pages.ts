// Contenu des pages de fonctionnalités et des pages par profil.
// Une entrée = une page, servie à la racine du site (/<slug>/).

export type Landing = {
  slug: string;
  kind: 'brique' | 'atout';
  nav: string;
  brick?: string; // id dans pricing.ts
  included?: string; // pour les atouts : avec quelles briques ils viennent
  parent?: string; // slug de la brique dont l'atout fait partie
  withBricks?: string; // version courte pour le menu
  title: string;
  description: string;
  h1: string;
  lead: string;
  voice?: { said: string; done: string[] };
  sections: { h2: string; text: string }[];
  points: string[];
  faq: { q: string; a: string }[];
  related: string[];
};

export const LANDINGS: Landing[] = [
  {
    slug: 'logiciel-devis-piscine',
    kind: 'brique',
    nav: 'Devis',
    brick: 'devis',
    title: 'Logiciel de devis piscine pour piscinistes | Stagnum',
    description:
      'Faites vos devis de piscine en quelques secondes, au clavier ou à la voix. Un logiciel de devis pensé pour les piscinistes, avec ou sans magasin.',
    h1: 'Le logiciel de devis piscine qui écrit à votre place',
    lead: 'Vous décrivez le besoin du client en une phrase, tapée ou dictée. Stagnum prépare le devis avec les bons articles, les quantités et les prix. Vous relisez, vous envoyez.',
    voice: {
      said: '« Devis pour Madame Martin : remplacement du liner, bassin 8 par 4, et une pompe à chaleur. »',
      done: ['Cliente retrouvée dans votre fichier', 'Articles et main-d’œuvre ajoutés', 'Devis prêt à relire et à envoyer'],
    },
    sections: [
      {
        h2: 'Un devis fait sur place, pas le soir au bureau',
        text: 'Le devis le plus rentable est celui que le client reçoit pendant qu’il a encore son projet en tête. Avec Stagnum, vous le préparez chez lui, au bord du bassin, sans rien ressaisir en rentrant. Les soirées passées à recopier des notes de chantier disparaissent.',
      },
      {
        h2: 'Vos articles, vos prix, vos habitudes',
        text: 'Stagnum travaille avec votre catalogue et vos tarifs. Il apprend les prestations que vous vendez le plus souvent et vous les propose au bon moment. Vous gardez la main sur chaque ligne avant l’envoi.',
      },
      {
        h2: 'Du devis à la facture sans ressaisie',
        text: 'Un devis accepté devient une facture ou un chantier en un geste, si vous avez pris ces briques. Les informations du client suivent toutes seules, parce que la base clients est commune à tout Stagnum.',
      },
    ],
    points: [
      'Devis préparés à partir d’une simple phrase, tapée ou dictée',
      'Catalogue d’articles et de prestations à vos prix',
      'Fiche client créée ou retrouvée automatiquement',
      'Transformation en facture ou en chantier sans ressaisie',
    ],
    faq: [
      {
        q: 'Peut-on faire un devis de piscine sans ordinateur ?',
        a: 'Oui. Vous pouvez préparer un devis depuis votre téléphone, en le dictant. Vous le relisez avant de l’envoyer au client.',
      },
      {
        q: 'Faut-il prendre toutes les briques pour utiliser les devis ?',
        a: 'Non. La brique Devis fonctionne seule. La base clients est incluse, et vous ajoutez les factures ou les chantiers quand vous en avez besoin.',
      },
      {
        q: 'L’intelligence artificielle peut-elle envoyer un devis sans moi ?',
        a: 'Non. Stagnum prépare le devis, et c’est vous qui le validez et qui l’envoyez.',
      },
    ],
    related: ['logiciel-facturation-pisciniste', 'suivi-chantier-piscine', 'pilotage-vocal'],
  },
  {
    slug: 'logiciel-facturation-pisciniste',
    kind: 'brique',
    nav: 'Factures et relances',
    brick: 'factures',
    title: 'Logiciel de facturation pour pisciniste | Stagnum',
    description:
      'Facturez vos clients et relancez les impayés sans y penser. Le logiciel de facturation des piscinistes, avec relances de paiement incluses.',
    h1: 'Le logiciel de facturation des piscinistes, relances comprises',
    lead: 'Vos factures partent le jour où le travail est fini. Les retards de paiement sont relancés automatiquement, après le nombre de jours que vous avez choisi. Les relances font partie de la brique Factures.',
    voice: {
      said: '« Facture le chantier Durand. »',
      done: ['Facture créée à partir du chantier', 'Envoyée au client', 'Relance programmée selon votre réglage'],
    },
    sections: [
      {
        h2: 'Facturer le jour même',
        text: 'Une facture envoyée tard est une facture payée tard. Stagnum reprend le devis ou le chantier et prépare la facture : vous n’avez qu’à la relire. Vous facturez en fin d’intervention, pas en fin de mois.',
      },
      {
        h2: 'Des relances qui partent toutes seules',
        text: 'Relancer un client est la tâche que tout le monde repousse. Dans Stagnum, vous réglez une fois le délai : sept jours après l’échéance, quinze, trente. Passé ce délai, la relance part automatiquement, et vous savez à tout moment qui vous doit combien.',
      },
      {
        h2: 'Une vue claire de ce qu’on vous doit',
        text: 'Un seul écran montre les factures payées, celles qui arrivent à échéance et celles qui sont en retard. Vous n’avez plus besoin d’un tableur à côté pour suivre votre trésorerie.',
      },
    ],
    points: [
      'Factures créées à partir d’un devis ou d’un chantier',
      'Relances envoyées automatiquement, au délai que vous réglez',
      'Conforme à la facturation électronique obligatoire',
      'Suivi des factures payées, à venir et en retard',
      'Utilisable au clavier ou à la voix, au magasin comme sur le terrain',
    ],
    faq: [
      {
        q: 'Les relances de paiement sont-elles payantes en plus ?',
        a: 'Non. Les relances font partie de la brique Factures. Il n’y a pas d’option à ajouter.',
      },
      {
        q: 'Stagnum est-il conforme à la facturation électronique ?',
        a: 'Oui. Stagnum reçoit et émet des factures électroniques conformes à la réforme. Vous n’avez pas d’autre logiciel à ajouter.',
      },
      {
        q: 'Les relances partent-elles automatiquement ?',
        a: 'Oui. Vous choisissez dans les paramètres le nombre de jours après l’échéance, et la relance part toute seule passé ce délai.',
      },
      {
        q: 'Puis-je utiliser la facturation sans la brique Devis ?',
        a: 'Oui. Chaque brique fonctionne seule. Si vous prenez aussi les devis, un devis accepté se transforme en facture sans ressaisie.',
      },
    ],
    related: ['facturation-electronique-pisciniste', 'logiciel-devis-piscine', 'suivi-chantier-piscine'],
  },
  {
    slug: 'suivi-chantier-piscine',
    kind: 'brique',
    nav: 'Chantiers et rentabilité',
    brick: 'chantiers',
    title: 'Logiciel de suivi de chantier piscine | Stagnum',
    description:
      'Suivez vos chantiers de piscine et voyez la rentabilité de chacun. Un logiciel de gestion de chantier pour piscinistes, utilisable sur le terrain.',
    h1: 'Le suivi de chantier piscine qui vous dit ce que vous gagnez',
    lead: 'Chaque chantier a sa fiche, son avancement et sa rentabilité. Vous savez, chantier par chantier, si vous avez gagné de l’argent, et pourquoi. L’application mobile est incluse.',
    voice: {
      said: '« Chantier Bernard : terrassement terminé, deux heures de plus que prévu, ajoute un sac de ciment. »',
      done: ['Avancement mis à jour', 'Heures et matériaux ajoutés au chantier', 'Rentabilité recalculée'],
    },
    sections: [
      {
        h2: 'La rentabilité de chaque chantier, sans tableur',
        text: 'Stagnum compare ce que vous avez vendu à ce que le chantier vous a réellement coûté : matériaux, heures passées, déplacements. Vous voyez la marge de chaque chantier pendant qu’il avance, pas trois mois après.',
      },
      {
        h2: 'Fait pour des mains occupées',
        text: 'Sur un chantier, personne n’a envie de sortir un ordinateur. Vous parlez à votre téléphone : une étape terminée, des heures en plus, une pièce à commander. Stagnum range l’information au bon endroit.',
      },
      {
        h2: 'Toute l’équipe voit la même chose',
        text: 'Le bureau sait où en est le chantier sans appeler le technicien. Le technicien a l’adresse, le détail du devis et l’historique du client dans sa poche.',
      },
    ],
    points: [
      'Une fiche par chantier, avec son avancement',
      'Rentabilité calculée chantier par chantier',
      'Application mobile incluse dans la brique',
      'Saisie à la voix, sans quitter le chantier',
    ],
    faq: [
      {
        q: 'Comment Stagnum calcule-t-il la rentabilité d’un chantier ?',
        a: 'Il compare le montant vendu aux coûts enregistrés sur le chantier : matériaux, temps passé et frais. Plus vous notez ce qui se passe sur le terrain, plus le calcul est juste.',
      },
      {
        q: 'L’application mobile est-elle payante en plus ?',
        a: 'Non. L’application mobile fait partie de la brique Chantiers.',
      },
      {
        q: 'Le suivi de chantier fonctionne-t-il pour la rénovation et l’entretien ?',
        a: 'Oui. Une construction, une rénovation de liner ou une intervention d’entretien se suivent de la même façon : une fiche, des coûts, une marge.',
      },
    ],
    related: ['logiciel-devis-piscine', 'logiciel-facturation-pisciniste', 'pilotage-vocal'],
  },
  {
    slug: 'logiciel-achats-pisciniste',
    kind: 'brique',
    nav: 'Achats',
    brick: 'achats',
    title: 'Logiciel de gestion des achats pour pisciniste | Stagnum',
    description:
      'Déposez le bon de livraison de votre fournisseur : Stagnum saisit vos achats à votre place. Fini les références retapées ligne par ligne.',
    h1: 'Vos achats saisis tout seuls, à partir du bon de livraison',
    lead: 'Une commande arrive. Vous déposez le bon de livraison dans Stagnum, qui en lit les lignes et remplit l’achat. Vous n’avez plus à retaper les références une par une.',
    sections: [
      {
        h2: 'Un bon de livraison, zéro ressaisie',
        text: 'Saisir une livraison de quarante lignes prend une demi-heure, et une erreur de référence se paie plus tard. Stagnum lit le bon de livraison et crée l’achat avec les articles, les quantités et les prix. Il vous reste à vérifier et à valider.',
      },
      {
        h2: 'Vous gardez le dernier mot',
        text: 'Avant de valider, vous voyez chaque ligne lue par Stagnum. Vous corrigez une quantité ou un article en un geste si la livraison ne correspond pas à la commande.',
      },
      {
        h2: 'Des achats qui servent au reste',
        text: 'Un achat bien saisi ne dort pas dans un classeur. Avec la brique Inventaire, les quantités reçues entrent en stock ; avec les Chantiers, vos coûts de matériaux sont justes.',
      },
    ],
    points: [
      'Achats créés à partir du bon de livraison',
      'Aucune référence à retaper ligne par ligne',
      'Chaque ligne vérifiable avant validation',
      'Stock mis à jour avec la brique Inventaire',
    ],
    faq: [
      {
        q: 'Comment Stagnum saisit-il un bon de livraison ?',
        a: 'Vous déposez le bon de livraison dans Stagnum. Le logiciel en lit les lignes et prépare l’achat ; vous le relisez avant de le valider.',
      },
      {
        q: 'Que se passe-t-il si une ligne est mal lue ?',
        a: 'Rien n’est enregistré sans vous. Vous voyez toutes les lignes avant de valider et vous pouvez corriger chacune.',
      },
      {
        q: 'Faut-il la brique Inventaire pour utiliser les achats ?',
        a: 'Non. La brique Achats fonctionne seule. Avec l’Inventaire, les quantités reçues mettent votre stock à jour.',
      },
    ],
    related: ['gestion-stock-magasin-piscine', 'suivi-chantier-piscine', 'logiciel-facturation-pisciniste'],
  },
  {
    slug: 'logiciel-caisse-magasin-piscine',
    kind: 'brique',
    nav: 'Caisse',
    brick: 'caisse',
    title: 'Logiciel de caisse pour magasin de piscine | Stagnum',
    description:
      'Une caisse simple pour votre magasin de piscine, reliée à votre fichier client et à votre stock. Encaissez vite, même en pleine saison.',
    h1: 'Le logiciel de caisse pensé pour un magasin de piscine',
    lead: 'Vous encaissez en quelques gestes, et chaque vente rejoint la fiche du client. En pleine saison, quand la file s’allonge au comptoir, la caisse ne doit pas vous ralentir.',
    sections: [
      {
        h2: 'Une caisse que tout le monde sait utiliser',
        text: 'Un saisonnier doit pouvoir encaisser dès son premier jour. L’écran de caisse de Stagnum va à l’essentiel : le produit, le client, le paiement.',
      },
      {
        h2: 'Chaque vente raconte l’histoire du client',
        text: 'Quand un client revient, vous voyez ce qu’il a acheté et le bassin qu’il possède. Vous conseillez le bon produit au lieu de reposer les mêmes questions.',
      },
      {
        h2: 'Une caisse certifiée',
        text: 'La loi impose aux commerçants un logiciel de caisse qui garantit l’inaltérabilité, la sécurisation, la conservation et l’archivage des données. La caisse de Stagnum est certifiée conforme à ces quatre exigences, et vous recevez le justificatif à présenter en cas de contrôle.',
      },
      {
        h2: 'Reliée à votre stock, si vous le voulez',
        text: 'Avec la brique Inventaire, chaque vente met votre stock à jour. Sans elle, la caisse fonctionne quand même : chaque brique est indépendante.',
      },
    ],
    points: [
      'Encaissement rapide au comptoir',
      'Ventes rattachées à la fiche client',
      'Logiciel de caisse certifié conforme à la loi française',
      'Mise à jour du stock avec la brique Inventaire',
      'Un prix par magasin, quel que soit le nombre de vendeurs',
    ],
    faq: [
      {
        q: 'La caisse de Stagnum est-elle conforme à la loi anti-fraude à la TVA ?',
        a: 'Oui. La caisse est certifiée conforme aux exigences d’inaltérabilité, de sécurisation, de conservation et d’archivage. Le justificatif vous est remis pour vos contrôles.',
      },
      {
        q: 'La caisse fonctionne-t-elle sans la brique Inventaire ?',
        a: 'Oui. Les deux briques sont indépendantes. Ensemble, chaque vente décompte le stock automatiquement.',
      },
      {
        q: 'Combien de vendeurs peuvent utiliser la caisse ?',
        a: 'Autant que vous voulez. Le prix de Stagnum est fixé par magasin, pas par utilisateur.',
      },
      {
        q: 'J’ai plusieurs magasins : puis-je les relier ?',
        a: 'Oui. Chaque magasin a son abonnement, et vous pouvez les relier entre eux pour partager vos clients et suivre l’ensemble.',
      },
    ],
    related: ['gestion-stock-magasin-piscine', 'logiciel-analyse-eau-piscine', 'logiciel-facturation-pisciniste'],
  },
  {
    slug: 'gestion-stock-magasin-piscine',
    kind: 'brique',
    nav: 'Inventaire',
    brick: 'inventaire',
    title: 'Gestion de stock pour magasin de piscine | Stagnum',
    description:
      'Suivez le stock de votre magasin de piscine sans tableur et faites votre inventaire sans ressaisie. Un logiciel de gestion de stock pour piscinistes.',
    h1: 'La gestion de stock d’un magasin de piscine, sans tableur ni ressaisie',
    lead: 'Votre stock se met à jour à chaque vente et à chaque livraison. Pour l’inventaire, vous comptez et Stagnum enregistre : plus de feuille à recopier le soir.',
    voice: {
      said: '« Chlore choc cinq kilos : douze seaux. Galets : huit. Il reste deux robots en exposition. »',
      done: ['Trois références mises à jour', 'Écart signalé sur les galets', 'Stock à jour sans ressaisie'],
    },
    sections: [
      {
        h2: 'Un inventaire fait en marchant',
        text: 'L’inventaire est long parce qu’on compte, on note, puis on ressaisit. Avec Stagnum, il ne reste que la première étape : vous annoncez ou saisissez ce que vous comptez, directement dans la réserve.',
      },
      {
        h2: 'Savoir quoi commander avant la saison',
        text: 'Une rupture de chlore en juillet coûte des ventes. Stagnum vous montre les produits qui baissent et ceux qui dorment en réserve, pour commander au bon moment.',
      },
      {
        h2: 'Le camion compte aussi',
        text: 'Un indépendant a son stock dans son véhicule ou son dépôt. La brique Inventaire fonctionne de la même façon, sans magasin.',
      },
    ],
    points: [
      'Inventaire sans feuille de comptage ni ressaisie',
      'Suivi des produits qui baissent et de ceux qui dorment',
      'Stock mis à jour par la Caisse et les Achats, si vous les prenez',
      'Utilisable en magasin, au dépôt ou dans le véhicule',
    ],
    faq: [
      {
        q: 'Comment se passe un inventaire dans Stagnum ?',
        a: 'Vous comptez dans la réserve et vous indiquez la référence et la quantité, au clavier ou à la voix. Stagnum met la fiche à jour et vous signale les écarts à vérifier.',
      },
      {
        q: 'Dois-je prendre la caisse pour gérer mon stock ?',
        a: 'Non. L’inventaire fonctionne seul. Avec la caisse, le stock se met à jour à chaque vente.',
      },
      {
        q: 'Le stock est-il limité en nombre de références ?',
        a: 'Non. Le stockage est inclus dans Stagnum, sans supplément.',
      },
    ],
    related: ['logiciel-achats-pisciniste', 'logiciel-caisse-magasin-piscine', 'logiciel-analyse-eau-piscine'],
  },
  {
    slug: 'logiciel-analyse-eau-piscine',
    kind: 'brique',
    nav: 'Analyse d’eau',
    brick: 'eau',
    title: 'Logiciel d’analyse d’eau de piscine | Stagnum',
    description:
      'Enregistrez vos analyses d’eau de piscine, obtenez un diagnostic clair et gardez l’historique de chaque bassin. Pour magasins et piscinistes.',
    h1: 'Le logiciel d’analyse d’eau de piscine pour les professionnels',
    lead: 'Vous relevez les mesures, Stagnum les range dans la fiche du bassin et vous aide à expliquer le traitement au client, avec des mots simples.',
    voice: {
      said: '« Analyse pour Monsieur Petit : pH 7,8, chlore libre 0,5, TAC 60, stabilisant 80. »',
      done: ['Mesures enregistrées sur le bassin', 'Valeurs hors plage repérées', 'Conseil de traitement à valider'],
    },
    sections: [
      {
        h2: 'L’historique de chaque bassin',
        text: 'Une eau qui tourne tous les étés a une cause. Avec l’historique des analyses, vous voyez ce qui revient d’une saison à l’autre et vous traitez le problème de fond.',
      },
      {
        h2: 'Un conseil que le client comprend',
        text: 'Le client veut savoir quoi mettre dans son bassin, et combien. Stagnum part du volume du bassin et des mesures pour vous proposer un traitement, que vous validez avec votre expérience.',
      },
      {
        h2: 'Au comptoir comme au bord du bassin',
        text: 'L’analyse se fait au magasin, quand le client apporte son échantillon, ou chez lui pendant une visite d’entretien. Dans les deux cas, elle rejoint la même fiche.',
      },
    ],
    points: [
      'Mesures saisies ou dictées : pH, chlore, TAC, stabilisant',
      'Historique des analyses par bassin',
      'Proposition de traitement à valider par vos soins',
      'Analyse rattachée à la fiche du client',
    ],
    faq: [
      {
        q: 'Stagnum remplace-t-il mon photomètre ?',
        a: 'Non. Vous mesurez avec votre matériel habituel. Stagnum enregistre les résultats, garde l’historique et vous aide à formuler le conseil.',
      },
      {
        q: 'Le traitement proposé est-il automatique ?',
        a: 'C’est une proposition. Vous restez le professionnel : vous la validez ou vous l’ajustez avant de la donner au client.',
      },
      {
        q: 'Un indépendant sans magasin peut-il utiliser l’analyse d’eau ?',
        a: 'Oui. La brique sert aussi pendant les visites d’entretien, depuis un téléphone.',
      },
    ],
    related: ['logiciel-caisse-magasin-piscine', 'fichier-client-pisciniste', 'gestion-stock-magasin-piscine'],
  },
  {
    slug: 'fichier-client-pisciniste',
    kind: 'atout',
    nav: 'Base clients',
    included: 'Incluse avec Devis, Factures, Chantiers, Caisse et Analyse d’eau',
    withBricks: 'Avec Devis, Factures, Chantiers, Caisse et Analyse d’eau',
    title: 'Fichier client et CRM pour pisciniste | Stagnum',
    description:
      'Un fichier client pour pisciniste, inclus avec vos briques : le client, son bassin, ses devis, ses achats et ses analyses au même endroit.',
    h1: 'Le fichier client du pisciniste, inclus avec vos briques',
    lead: 'Un client, un bassin, une seule fiche. Devis, factures, chantiers, ventes et analyses d’eau s’y rangent tout seuls. Elle vient avec les briques qui en ont besoin, sans ligne en plus.',
    sections: [
      {
        h2: 'Le client et son bassin, ensemble',
        text: 'Un pisciniste ne vend pas à un contact, il s’occupe d’un bassin. La fiche réunit le propriétaire et sa piscine : dimensions, équipements, historique des interventions.',
      },
      {
        h2: 'Rien à payer en plus',
        text: 'La base clients n’est pas une brique à part. Dès que vous prenez une brique qui en a besoin, elle est là, et toutes vos briques partagent la même.',
      },
      {
        h2: 'Retrouver un client en le nommant',
        text: 'Vous dites « ouvre la fiche de Madame Martin » et vous y êtes. Au comptoir ou sur un chantier, vous avez l’historique complet sous les yeux.',
      },
    ],
    points: [
      'Incluse avec Devis, Factures, Chantiers, Caisse et Analyse d’eau',
      'Une fiche par client, avec son bassin',
      'Historique des devis, factures, chantiers et analyses',
      'Commune à tous vos magasins reliés',
    ],
    faq: [
      {
        q: 'La base clients est-elle une brique payante ?',
        a: 'Non. Elle est incluse à partir du moment où vous prenez une brique qui en a besoin.',
      },
      {
        q: 'Puis-je reprendre mon fichier client actuel ?',
        a: 'Parlez-nous de votre situation dans votre demande de devis : nous regardons avec vous comment reprendre vos données.',
      },
      {
        q: 'Le nombre de clients est-il limité ?',
        a: 'Non. Le stockage est inclus dans Stagnum, sans supplément.',
      },
    ],
    related: ['logiciel-devis-piscine', 'logiciel-analyse-eau-piscine', 'pilotage-vocal'],
  },
  {
    slug: 'facturation-electronique-pisciniste',
    kind: 'atout',
    nav: 'Facturation électronique',
    included: 'Incluse avec la brique Factures',
    withBricks: 'Avec la brique Factures',
    parent: 'logiciel-facturation-pisciniste',
    title: 'Facturation électronique pour pisciniste | Stagnum',
    description:
      'La facturation électronique devient obligatoire pour les piscinistes. Dates, obligations, et comment Stagnum vous met en conformité sans changer vos habitudes.',
    h1: 'La facturation électronique du pisciniste, sans y penser',
    lead: 'La réforme de la facturation électronique concerne toutes les entreprises, y compris les piscinistes indépendants. Stagnum est conforme : vous continuez à faire vos factures comme d’habitude.',
    sections: [
      {
        h2: 'Ce que la réforme vous demande',
        text: 'Depuis le 1er septembre 2026, toutes les entreprises doivent pouvoir recevoir des factures électroniques de leurs fournisseurs. À partir du 1er septembre 2027, les TPE, les PME et les micro-entreprises devront aussi émettre leurs factures entre professionnels dans ce format. Une facture envoyée en PDF par e-mail ne suffira plus.',
      },
      {
        h2: 'Ce qui change pour un pisciniste',
        text: 'Vos factures à des professionnels (syndics, campings, hôtels, collectivités, autres entreprises) devront passer par le circuit électronique. Les ventes aux particuliers ne sont pas des factures électroniques, mais leurs données doivent être transmises à l’administration. Stagnum s’en occupe dans les deux cas.',
      },
      {
        h2: 'Rien à ajouter à votre logiciel',
        text: 'Vous dictez ou vous saisissez votre facture comme avant. Stagnum la met au bon format et la transmet. Vous n’avez ni second outil à acheter, ni double saisie.',
      },
    ],
    points: [
      'Réception des factures électroniques de vos fournisseurs',
      'Émission de vos factures au format exigé',
      'Incluse dans la brique Factures, sans supplément',
      'Aucun changement dans votre façon de facturer',
    ],
    faq: [
      {
        q: 'Un pisciniste auto-entrepreneur est-il concerné par la facturation électronique ?',
        a: 'Oui. L’obligation de recevoir des factures électroniques s’applique à toutes les entreprises depuis le 1er septembre 2026, y compris les micro-entreprises. L’obligation d’en émettre s’applique à elles à partir du 1er septembre 2027.',
      },
      {
        q: 'La facturation électronique est-elle payante en plus dans Stagnum ?',
        a: 'Non. Elle fait partie de la brique Factures.',
      },
      {
        q: 'Mes factures aux particuliers sont-elles concernées ?',
        a: 'Elles ne passent pas par le circuit de la facture électronique, mais leurs données doivent être transmises à l’administration. Stagnum gère cette transmission.',
      },
    ],
    related: ['logiciel-facturation-pisciniste', 'logiciel-caisse-magasin-piscine', 'logiciel-devis-piscine'],
  },
  {
    slug: 'logiciel-pisciniste-personnalisable',
    kind: 'atout',
    nav: 'Personnalisation',
    included: 'Présente dans chaque brique',
    withBricks: 'Dans toutes les briques',
    title: 'Logiciel pisciniste personnalisable | Stagnum',
    description:
      'Stagnum se règle à votre façon : paramètres de vos analyses d’eau, contenu de vos devis, délai de relance des factures. Un logiciel qui s’adapte à votre métier.',
    h1: 'Un logiciel qui se règle à votre façon de travailler',
    lead: 'Deux piscinistes ne travaillent jamais pareil. Dans Stagnum, chaque brique se règle : ce que vous mesurez, ce que vous écrivez sur un devis, le moment où une relance part. Vous décidez une fois, le logiciel suit.',
    sections: [
      {
        h2: 'Vos analyses d’eau, avec vos mesures',
        text: 'Vous choisissez les paramètres qui apparaissent dans vos analyses. Si vous ne suivez pas une mesure, elle n’encombre ni votre écran ni la fiche remise au client.',
      },
      {
        h2: 'Vos devis, avec ce que vous voulez y voir',
        text: 'Vous décidez de ce qui figure ou non sur vos devis. Une fois réglés, tous vos devis sortent à votre façon, sans retouche à chaque fois.',
      },
      {
        h2: 'Vos relances, à votre rythme',
        text: 'Vous fixez le nombre de jours après l’échéance d’une facture. Passé ce délai, la relance part automatiquement. Vous pouvez changer ce réglage quand vous voulez.',
      },
    ],
    points: [
      'Chaque brique a ses réglages',
      'Paramètres des analyses d’eau au choix',
      'Contenu des devis au choix',
      'Délai de relance des factures au choix',
    ],
    faq: [
      {
        q: 'Faut-il tout régler avant de commencer ?',
        a: 'Non. Stagnum fonctionne dès le premier jour avec des réglages par défaut. Vous les ajustez quand vous en ressentez le besoin.',
      },
      {
        q: 'Qui peut modifier les réglages ?',
        a: 'Parlez-nous de votre organisation dans votre demande de devis : nous vous montrons les réglages pendant l’essai gratuit.',
      },
      {
        q: 'La personnalisation est-elle payante ?',
        a: 'Non. Les réglages font partie de chaque brique.',
      },
    ],
    related: ['logiciel-analyse-eau-piscine', 'logiciel-devis-piscine', 'logiciel-facturation-pisciniste'],
  },
  {
    slug: 'pilotage-vocal',
    kind: 'atout',
    nav: 'Pilotage à la voix',
    included: 'Présent dans chaque brique',
    withBricks: 'Dans toutes les briques',
    title: 'Logiciel pisciniste à commande vocale | Stagnum',
    description:
      'Stagnum s’utilise aussi à la voix : devis, chantier, inventaire, analyse d’eau. Pratique quand vous avez les mains occupées, jamais obligatoire.',
    h1: 'Un logiciel que vous pouvez aussi piloter à la voix',
    lead: 'Sur un chantier ou dans la réserve, vous avez rarement les mains libres. Dans ces moments-là, vous dites ce que vous voulez faire, et c’est fait. Le reste du temps, tout se fait à l’écran.',
    voice: {
      said: '« Qu’est-ce que j’ai à faire demain matin ? »',
      done: ['Deux chantiers à visiter', 'Un devis en attente de réponse', 'Une facture à relancer'],
    },
    sections: [
      {
        h2: 'Parlez comme à un collègue',
        text: 'Il n’y a pas de commandes à apprendre par cœur. Vous parlez normalement, avec vos mots de métier, et Stagnum comprend qu’un « huit par quatre » est un bassin.',
      },
      {
        h2: 'L’intelligence artificielle, sans le mode d’emploi',
        text: 'L’IA travaille derrière chaque brique, mais vous ne la voyez pas. Pas de réglages, pas de jargon : vous voyez un devis prêt, un stock à jour, une relance partie à temps.',
      },
      {
        h2: 'Vous gardez toujours la main',
        text: 'Stagnum prépare, vous validez. Vous décidez dans les paramètres de ce qui part automatiquement, et tout ce qui se fait à la voix peut aussi se faire au clavier.',
      },
    ],
    points: [
      'Voix incluse dans chaque brique',
      'Aucune commande à apprendre',
      'Utilisable sur téléphone, en magasin et sur le terrain',
      'Tout reste faisable au clavier',
    ],
    faq: [
      {
        q: 'Le pilotage à la voix est-il une option payante ?',
        a: 'Non. La voix fait partie de chaque brique.',
      },
      {
        q: 'Suis-je obligé d’utiliser la voix ?',
        a: 'Non. Tout ce que vous faites à la voix peut aussi se faire à l’écran. Vous choisissez selon le moment.',
      },
      {
        q: 'La voix fonctionne-t-elle sur un chantier bruyant ?',
        a: 'Stagnum est conçu pour le terrain. Le plus simple est de l’essayer dans vos conditions pendant les deux semaines d’essai gratuit.',
      },
    ],
    related: ['suivi-chantier-piscine', 'gestion-stock-magasin-piscine', 'logiciel-devis-piscine'],
  },
];

export const bySlug = (slug: string) => LANDINGS.find((l) => l.slug === slug)!;
export const BRIQUE_PAGES = LANDINGS.filter((l) => l.kind === 'brique');
