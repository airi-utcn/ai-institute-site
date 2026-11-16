'use client';

import { useEffect, useState } from 'react';

async function loadCitation(url, signal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('Failed to load citation');
  const citation = (await response.text()).trim();
  if (!citation || /^\s*</.test(citation)) throw new Error('Invalid citation');
  return citation;
}

export default function PublicationCitation({ bibtex = '', bibFile }) {
  const [text, setText] = useState(bibtex.trim());
  const [status, setStatus] = useState(!bibtex.trim() && bibFile?.url ? 'fetching' : 'idle');
  const [error, setError] = useState('');
  const [showSource, setShowSource] = useState(false);

  useEffect(() => {
    if (bibtex.trim() || !bibFile?.url) return;
    const controller = new AbortController();
    loadCitation(bibFile.url, controller.signal)
      .then((citation) => {
        if (controller.signal.aborted) return;
        setText(citation);
        setStatus('idle');
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setStatus('idle');
        setError('Could not load the BibTeX citation. You can still download the file below.');
      });
    return () => controller.abort();
  }, [bibtex, bibFile?.url]);

  async function copyCitation() {
    setStatus('loading');
    setError('');
    let citation = text;
    if (!citation) {
      try {
        citation = await loadCitation(bibFile.url);
        setText(citation);
      } catch {
        setStatus('idle');
        setError('Could not load the BibTeX citation. You can still download the file below.');
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(citation);
      setStatus('copied');
    } catch {
      setStatus('idle');
      setShowSource(true);
      setError('Copy failed. Select and copy the citation below.');
    }
  }

  if (!bibtex.trim() && !bibFile?.url) return null;

  return (
    <div className="mt-3" role="group" aria-label="BibTeX citation">
      <div className="flex flex-wrap items-center gap-2">
        {bibFile?.url && (
          <a href={bibFile.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 transition">
            Download BibTeX
          </a>
        )}
        <button type="button" onClick={copyCitation} disabled={status === 'loading' || status === 'fetching'} className="rounded-lg border border-purple-200 dark:border-purple-800 px-4 py-2 text-sm font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition disabled:opacity-60">
          {status === 'fetching' ? 'Loading…' : status === 'loading' ? 'Copying…' : status === 'copied' ? 'Copied!' : 'Copy BibTeX'}
        </button>
      </div>
      <details className="mt-3" open={showSource} onToggle={(event) => setShowSource(event.currentTarget.open)}>
          <summary className="cursor-pointer text-xs font-medium text-gray-500 dark:text-gray-400">Show BibTeX</summary>
          {text ? (
            <textarea readOnly aria-label="BibTeX source" value={text} rows={8} className="mt-2 block w-full rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-xs text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100" />
          ) : status === 'fetching' ? (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Loading citation…</p>
          ) : null}
      </details>
      <p role="status" className="mt-2 text-xs text-gray-600 dark:text-gray-400">
        {error || (status === 'copied' ? 'Citation copied to clipboard.' : '')}
      </p>
    </div>
  );
}
