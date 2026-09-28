import { NextResponse } from 'next/server';
import { getGraphPublications, transformGraphPublicationData } from '@/lib/strapi';
import { buildMesoTopics, filterPublicationsForMesoTopic } from '@/app/research/paper-graph/meso';

export async function GET() {
  try {
    const rawPubs = await getGraphPublications();
    const publications = transformGraphPublicationData(rawPubs);
    
    // Group publications by macro slug
    const pubsByMacro = {};
    for (const p of publications) {
      const macroSlug = p.graphMacroPrimary?.slug;
      if (!macroSlug) continue;
      (pubsByMacro[macroSlug] ??= []).push(p);
    }

    const index = [];
    const seen = new Set();

    for (const [macroSlug, macroPubs] of Object.entries(pubsByMacro)) {
      const topics = buildMesoTopics(macroPubs);
      for (const topic of topics) {
        const topicPubs = filterPublicationsForMesoTopic(macroPubs, topic);
        for (const p of topicPubs) {
          // Avoid duplicate entries if a paper matched multiple subkeys
          if (seen.has(p.id)) continue;
          seen.add(p.id);

          index.push({
            id: p.id,
            openAlexId: p.openAlexId,
            title: p.title || 'Untitled',
            authors: Array.isArray(p.authors) ? p.authors.filter(Boolean) : [],
            year: p.year,
            domainSlug: macroSlug,
            topicSlug: topic.slug,
            topicLabel: topic.label,
          });
        }
      }
    }

    // Add any remaining papers that didn't match a topic
    for (const p of publications) {
      if (!seen.has(p.id) && p.graphMacroPrimary?.slug) {
        index.push({
          id: p.id,
          openAlexId: p.openAlexId,
          title: p.title || 'Untitled',
          authors: Array.isArray(p.authors) ? p.authors.filter(Boolean) : [],
          year: p.year,
          domainSlug: p.graphMacroPrimary.slug,
          topicSlug: 'other-themes',
          topicLabel: 'Other Themes',
        });
      }
    }
    
    return NextResponse.json(index);
  } catch (error) {
    console.error('Failed to generate paper graph index:', error);
    return NextResponse.json({ error: 'Failed to generate index' }, { status: 500 });
  }
}
