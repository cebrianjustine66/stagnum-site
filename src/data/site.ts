import site from '../content/site.json';

// La description et l'adresse de réception du formulaire se modifient depuis l'interface
// d'édition (/keystatic, « Réglages généraux »).
export const SITE = {
  name: 'Stagnum',
  url: 'https://stagnum.fr',
  description: site.description,
};

// Adresse qui reçoit les demandes de devis (POST du formulaire). À renseigner selon l'hébergement retenu.
export const FORM_ENDPOINT = site.formEndpoint;
