// Articles du blog : un fichier Markdown par article dans src/content/blog/.
// Ils se modifient depuis l'interface d'édition (/keystatic).
const files = import.meta.glob('../content/blog/*.md', { eager: true }) as Record<string, any>;

// Selon la façon dont elle est écrite dans le fichier, la date arrive avec ou sans heure : on garde AAAA-MM-JJ.
const isoDate = (d: string | Date) => (d instanceof Date ? d.toISOString() : String(d)).slice(0, 10);

export const POSTS = Object.entries(files).map(([path, file]) => {
  const slug = path.split('/').pop()!.replace(/\.md$/, '');
  const fm = file.frontmatter;
  return {
    slug,
    url: `/blog/${slug}/`,
    frontmatter: { ...fm, date: isoDate(fm.date), updated: fm.updated ? isoDate(fm.updated) : undefined },
    Content: file.Content,
    headings: file.getHeadings(),
  };
});
