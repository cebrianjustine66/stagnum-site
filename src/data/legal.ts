// Informations légales de l'éditeur, saisies dans l'interface d'édition (/keystatic, « Mentions légales »).
// Tant qu'un champ est vide, les pages affichent « [À compléter] » à sa place :
// ne mettez pas le site en ligne dans cet état.
import legal from '../content/legal.json';

export const LEGAL = legal.company;

const c = legal.company;
const VARS: Record<string, string> = {
  raison_sociale: c.raisonSociale,
  forme_juridique: c.formeJuridique,
  capital: c.capital,
  siege: c.siege,
  siren: c.siren,
  rcs: c.rcs,
  tva: c.tva,
  email: c.email,
  telephone: c.telephone,
  directeur: c.directeurPublication,
  hebergeur_nom: c.hebergeurNom,
  hebergeur_adresse: c.hebergeurAdresse,
  hebergeur_telephone: c.hebergeurTelephone,
};
// Remplace {raison_sociale}, {siege}… par les informations de l'éditeur.
export const legalText = (s: string) => s.replace(/\{(\w+)\}/g, (m, k) => (k in VARS ? VARS[k] || '[À compléter]' : m));
