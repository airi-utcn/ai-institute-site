import Link from 'next/link';
import { getPreviewSession } from '@/lib/preview-session';

export default async function PreviewBanner() {
  const session = await getPreviewSession();
  if (!session) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-amber-950 shadow-md">
      <span>
        Preview mode — showing {session.status} content. Other visitors still see
        the published site.
      </span>
      <Link
        href="/api/preview/exit"
        prefetch={false}
        className="rounded border border-amber-900/40 bg-amber-100/60 px-2 py-0.5 font-semibold hover:bg-amber-100"
      >
        Exit preview
      </Link>
    </div>
  );
}
