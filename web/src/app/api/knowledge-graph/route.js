import { NextResponse } from 'next/server';
import { parseGraphQuery, runKnowledgeGraphQuery } from '@/lib/knowledge-graph/query';
import { getKnowledgeGraphSnapshot } from '@/lib/knowledge-graph/snapshot';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const options = parseGraphQuery(url.searchParams);
    const { graph, preview } = await getKnowledgeGraphSnapshot();
    const result = runKnowledgeGraphQuery(graph, options);

    return NextResponse.json(result, {
      headers: {
        // A preview session can include drafts. Never let a shared cache store
        // or serve that response to the public.
        'Cache-Control': preview
          ? 'private, no-store'
          : 's-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('[knowledge-graph] query failed', error);
    return NextResponse.json(
      { error: 'Failed to query the knowledge graph.' },
      { status: 500 },
    );
  }
}
