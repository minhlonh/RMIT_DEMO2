'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, ChevronLeft, ChevronRight, FileDown } from 'lucide-react';
import AdaptiveButton from '@/components/AdaptiveButton';
import AdaptiveCard from '@/components/AdaptiveCard';
import type { TFn } from '@/lib/i18n';
import { useT, useUIModeStore } from '@/store/useUIModeStore';
import type { Language, Memory } from '@/types';

interface MemoryBookPdfExporterProps {
  memories: Memory[];
  familyName: string;
}

type Status = 'idle' | 'exporting' | 'done';

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Builds a self-contained, print-ready HTML document (A5 pages). */
function buildBookHtml(memories: Memory[], familyName: string, t: TFn, language: Language): string {
  const cover = `
    <section class="page cover">
      <p class="eyebrow">${escapeHtml(t('vault.bookCoverSub'))}</p>
      <h1>${escapeHtml(t('vault.bookCover', { family: familyName }))}</h1>
      <p class="count">${memories.length} ✦</p>
    </section>`;

  const pages = memories
    .map((memory) => {
      const paragraphs = memory.story_text
        .split(/\n+/)
        .filter((line) => line.trim().length > 0)
        .map((line) => `<p>${escapeHtml(line)}</p>`)
        .join('');
      const year = memory.year_occurred
        ? `<p class="year">${escapeHtml(t('vault.yearLabel', { year: memory.year_occurred }))}</p>`
        : '';
      const tags =
        memory.tags && memory.tags.length > 0
          ? `<p class="tags">${memory.tags.map((tag) => `#${escapeHtml(tag)}`).join('  ')}</p>`
          : '';
      return `
      <section class="page">
        ${year}
        <h2>${escapeHtml(memory.title)}</h2>
        <div class="story">${paragraphs}</div>
        ${tags}
      </section>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(t('vault.printTitle'))}</title>
<style>
  @page { size: A5; margin: 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Georgia, 'Times New Roman', serif; color: #2b1405; background: #fffdf9; }
  .page { page-break-after: always; min-height: 170mm; display: flex; flex-direction: column; padding: 4mm 2mm; }
  .page:last-child { page-break-after: auto; }
  .cover { justify-content: center; align-items: center; text-align: center; border: 3px double #8a3b12; padding: 16mm 8mm; }
  .cover h1 { font-size: 28pt; line-height: 1.25; margin: 10mm 0 6mm; color: #8a3b12; }
  .eyebrow { letter-spacing: 0.2em; text-transform: uppercase; font-size: 9pt; color: #7a5a3a; }
  .count { font-size: 14pt; color: #8a3b12; }
  h2 { font-size: 20pt; margin: 2mm 0 6mm; color: #8a3b12; }
  .year { font-size: 11pt; color: #7a5a3a; margin: 0; }
  .story p { font-size: 13pt; line-height: 1.7; margin: 0 0 4mm; text-align: justify; }
  .tags { margin-top: auto; font-size: 10pt; color: #7a5a3a; }
</style>
</head>
<body>
${cover}
${pages}
</body>
</html>`;
}

export default function MemoryBookPdfExporter({ memories, familyName }: MemoryBookPdfExporterProps) {
  const mode = useUIModeStore((s) => s.mode);
  const language = useUIModeStore((s) => s.language);
  const t = useT();
  const senior = mode === 'senior';

  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const totalPages = memories.length + 1; // cover + one page per memory
  const safeIndex = Math.min(pageIndex, totalPages - 1);
  const current = safeIndex === 0 ? null : memories[safeIndex - 1];

  useEffect(
    () => () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    },
    []
  );

  const finishExport = (win: Window | null) => {
    const html = buildBookHtml(memories, familyName, t, language);
    if (win) {
      setPopupBlocked(false);
      win.document.open();
      win.document.write(html);
      win.document.close();
      win.focus();
      window.setTimeout(() => win.print(), 500);
    } else {
      // Pop-up blocked: fall back to downloading the printable file.
      setPopupBlocked(true);
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'gia-dinh-so-memory-book.html';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    }
    setStatus('done');
  };

  const startExport = () => {
    if (memories.length === 0 || status === 'exporting') return;
    // Must open the window synchronously inside the click to avoid pop-up blockers.
    const win = window.open('', '_blank');
    setStatus('exporting');
    setProgress(0);

    let value = 0;
    intervalRef.current = window.setInterval(() => {
      value = Math.min(100, value + 8 + Math.random() * 10);
      setProgress(Math.round(value));
      if (value >= 100) {
        if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
        intervalRef.current = null;
        finishExport(win);
      }
    }, 160);
  };

  const pageText = senior ? 'text-xl' : mode === 'junior' ? 'text-base' : 'text-sm';

  return (
    <AdaptiveCard
      id="book"
      title={t('vault.exportTitle')}
      subtitle={t('vault.exportSubtitle')}
      icon={<BookOpen className={senior ? 'h-8 w-8' : 'h-6 w-6'} aria-hidden="true" />}
      tone="warm"
    >
      {memories.length === 0 ? (
        <p className={pageText}>{t('vault.exportEmpty')}</p>
      ) : (
        <div className="space-y-4">
          {/* Book page preview */}
          <motion.div
            key={safeIndex}
            initial={{ opacity: 0, rotateY: -12 }}
            animate={{ opacity: 1, rotateY: 0 }}
            className="mx-auto flex aspect-[3/4] w-full max-w-xs flex-col overflow-hidden rounded-md border border-amber-900/30 bg-[#FFFDF9] p-5 text-[#2B1405] shadow-lg"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {current === null ? (
              <div className="m-auto text-center">
                <p className="text-[10px] uppercase tracking-[0.25em] text-amber-900/70">
                  {t('vault.bookCoverSub')}
                </p>
                <p className="mt-4 text-2xl font-bold leading-snug text-[#8A3B12]">
                  {t('vault.bookCover', { family: familyName })}
                </p>
              </div>
            ) : (
              <>
                {current.year_occurred && (
                  <p className="text-xs text-amber-900/70">
                    {t('vault.yearLabel', { year: current.year_occurred })}
                  </p>
                )}
                <p className="mt-1 text-lg font-bold text-[#8A3B12]">{current.title}</p>
                <p className="mt-3 line-clamp-[9] whitespace-pre-line text-xs leading-relaxed">
                  {current.story_text}
                </p>
              </>
            )}
          </motion.div>

          {/* Pager */}
          <div className="flex items-center justify-center gap-3">
            <AdaptiveButton
              variant="secondary"
              aria-label={t('vault.prevPage')}
              disabled={safeIndex === 0}
              onClick={() => setPageIndex(safeIndex - 1)}
              icon={<ChevronLeft className="h-5 w-5" />}
            />
            <span className={pageText} aria-live="polite">
              {t('vault.pageOf', { current: safeIndex + 1, total: totalPages })}
            </span>
            <AdaptiveButton
              variant="secondary"
              aria-label={t('vault.nextPage')}
              disabled={safeIndex >= totalPages - 1}
              onClick={() => setPageIndex(safeIndex + 1)}
              icon={<ChevronRight className="h-5 w-5" />}
            />
          </div>

          {/* Export */}
          <div className="space-y-3">
            <AdaptiveButton
              fullWidth
              icon={<FileDown className="h-5 w-5" />}
              loading={status === 'exporting'}
              onClick={startExport}
            >
              {status === 'exporting'
                ? t('vault.exporting', { percent: progress })
                : t('vault.exportButton')}
            </AdaptiveButton>

            {status === 'exporting' && (
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
                className="h-3 w-full overflow-hidden rounded-full bg-black/10"
              >
                <motion.div
                  className="h-full rounded-full bg-amber-600"
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: 'easeOut', duration: 0.15 }}
                />
              </div>
            )}

            {status === 'done' && (
              <div role="status" className={pageText}>
                <p className="font-bold">{t('vault.exportDone')}</p>
                <p>{popupBlocked ? t('vault.popupBlocked') : t('vault.exportDoneHint')}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </AdaptiveCard>
  );
}