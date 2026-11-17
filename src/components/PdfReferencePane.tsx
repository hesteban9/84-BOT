import { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ZoomIn,
  ZoomOut,
  AlertCircle,
  X,
} from 'lucide-react';
import { DOCUMENTS, PDF_QUICK_JUMPS } from '../data/agreementIndex';
import { DocumentId } from '../types/chat';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const pdfDocumentCache = new Map<string, Promise<PDFDocumentProxy>>();

function loadPdfDocument(url: string): Promise<PDFDocumentProxy> {
  const existing = pdfDocumentCache.get(url);
  if (existing) {
    return existing;
  }
  const loadingTask = pdfjsLib.getDocument({ url });
  const promise = loadingTask.promise.catch((err) => {
    pdfDocumentCache.delete(url);
    throw err;
  });
  pdfDocumentCache.set(url, promise);
  return promise;
}

interface PdfReferencePaneProps {
  activeDocument: DocumentId;
  activePage: number;
  onSelectDocument: (docId: DocumentId) => void;
  onPageChange: (page: number) => void;
  onClose?: () => void;
}

export function PdfReferencePane({
  activeDocument,
  activePage,
  onSelectDocument,
  onPageChange,
  onClose,
}: PdfReferencePaneProps) {
  const safeDocId: DocumentId =
    activeDocument === 'wages' ? 'wages' : 'agreement';
  const currentDoc = DOCUMENTS[safeDocId];
  const quickJumps = PDF_QUICK_JUMPS[safeDocId];

  const [numPages, setNumPages] = useState(currentDoc.totalPages);
  const safePage = Math.max(1, Math.min(numPages, Math.round(activePage || 1)));

  const [pageInput, setPageInput] = useState(String(safePage));
  const [zoomScale, setZoomScale] = useState(1);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isRendering, setIsRendering] = useState(true);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const renderSeqRef = useRef(0);
  const renderLockRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    setPageInput(String(safePage));
  }, [safePage, safeDocId]);

  useEffect(() => {
    setNumPages(currentDoc.totalPages);
  }, [currentDoc.totalPages]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const updateWidth = () => {
      const width = Math.floor(el.clientWidth);
      if (width > 0) {
        setContainerWidth((prev) => (Math.abs(prev - width) >= 2 ? width : prev));
      }
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const renderPage = useCallback(
    (renderSeq: number) => {
      const canvas = canvasRef.current;
      if (!canvas || containerWidth <= 0) return;

      setIsRendering(true);
      setRenderError(null);

      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // Ignore cancel errors
        }
      }

      renderLockRef.current = renderLockRef.current
        .catch(() => undefined)
        .then(async () => {
          if (renderSeqRef.current !== renderSeq) return;

          const activeTask = renderTaskRef.current;
          if (activeTask) {
            try {
              activeTask.cancel();
              await activeTask.promise.catch(() => undefined);
            } catch {
              // Ignore cancellation errors
            }
            renderTaskRef.current = null;
          }

          if (renderSeqRef.current !== renderSeq) return;
          const targetCanvas = canvasRef.current;
          if (!targetCanvas) return;

          try {
            const pdfDoc = await loadPdfDocument(currentDoc.url);
            if (renderSeqRef.current !== renderSeq) return;

            const total = pdfDoc.numPages || currentDoc.totalPages;
            setNumPages(total);

            const targetPage = Math.max(1, Math.min(total, safePage));
            const page = await pdfDoc.getPage(targetPage);
            if (renderSeqRef.current !== renderSeq) return;

            const unscaledViewport = page.getViewport({ scale: 1 });
            const horizontalPad = containerWidth < 500 ? 16 : 32;
            const availableWidth = Math.max(240, containerWidth - horizontalPad);
            const fitScale = (availableWidth / unscaledViewport.width) * zoomScale;
            const viewport = page.getViewport({ scale: fitScale });

            const outputScale = Math.min(window.devicePixelRatio || 1, 2);
            const context = targetCanvas.getContext('2d');
            if (!context) {
              throw new Error('Canvas 2D context is unavailable.');
            }

            targetCanvas.width = Math.floor(viewport.width * outputScale);
            targetCanvas.height = Math.floor(viewport.height * outputScale);
            targetCanvas.style.width = `${Math.floor(viewport.width)}px`;
            targetCanvas.style.height = `${Math.floor(viewport.height)}px`;

            const transform =
              outputScale !== 1
                ? [outputScale, 0, 0, outputScale, 0, 0]
                : undefined;

            const task = page.render({
              canvas: targetCanvas,
              canvasContext: context,
              transform,
              viewport,
            });
            renderTaskRef.current = task;
            await task.promise;
            if (renderTaskRef.current === task) {
              renderTaskRef.current = null;
            }
            if (renderSeqRef.current === renderSeq) {
              setIsRendering(false);
            }
          } catch (err) {
            if (
              err instanceof Error &&
              (err.name === 'RenderingCancelledException' ||
                err.message.includes('Rendering cancelled'))
            ) {
              return;
            }
            if (renderSeqRef.current !== renderSeq) return;
            console.error('PDF render error:', err);
            setRenderError(
              'Could not render this PDF page in the viewer. You can retry or download the file directly.'
            );
            setIsRendering(false);
          }
        });
    },
    [currentDoc.url, currentDoc.totalPages, safePage, zoomScale, containerWidth]
  );

  useEffect(() => {
    const seq = ++renderSeqRef.current;
    renderPage(seq);
    return () => {
      renderSeqRef.current++;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // Ignore cancel errors
        }
      }
    };
  }, [renderPage, reloadToken]);

  const handlePageJump = () => {
    const parsed = Number.parseInt(pageInput, 10);
    if (!Number.isNaN(parsed)) {
      const clamped = Math.max(1, Math.min(numPages, parsed));
      onPageChange(clamped);
    } else {
      setPageInput(String(safePage));
    }
  };

  return (
    <aside className="w-full lg:w-[42%] lg:min-w-[340px] xl:min-w-[400px] lg:max-w-[660px] shrink-0 lg:border-l border-slate-200 bg-white flex flex-col h-full">
      <div className="px-3 sm:px-4 py-2 sm:py-2.5 border-b border-slate-200 flex items-center justify-between gap-2 flex-wrap">
        <div
          className="inline-flex items-center p-0.5 bg-slate-100 rounded-md"
          role="tablist"
          aria-label="Source PDF selector"
        >
          {(['wages', 'agreement'] as const).map((docId) => {
            const doc = DOCUMENTS[docId];
            const isSelected = safeDocId === docId;
            return (
              <button
                key={docId}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => onSelectDocument(docId)}
                className={`px-2 sm:px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  isSelected
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {docId === 'wages' ? (
                  <>
                    <span className="sm:hidden">Wages</span>
                    <span className="hidden sm:inline">{doc.shortTitle}</span>
                  </>
                ) : (
                  <>
                    <span className="sm:hidden">Agreement</span>
                    <span className="hidden sm:inline">{doc.shortTitle}</span>
                  </>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => onPageChange(Math.max(1, safePage - 1))}
            aria-label="Previous page"
            className="p-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
          </button>

          <div className="flex items-center gap-1 text-xs font-mono tabular-nums text-slate-600">
            <span>p.</span>
            <input
              type="text"
              inputMode="numeric"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onBlur={handlePageJump}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handlePageJump();
                }
              }}
              aria-label="PDF page number"
              className="w-10 text-center py-1 text-base sm:text-xs border border-slate-200 rounded bg-slate-50 text-slate-900 focus:outline-none focus:border-blue-900"
            />
            <span>/ {numPages}</span>
          </div>

          <button
            type="button"
            disabled={safePage >= numPages}
            onClick={() => onPageChange(Math.min(numPages, safePage + 1))}
            aria-label="Next page"
            className="p-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>

          <div className="hidden sm:flex items-center gap-1 ml-1 pl-1.5 border-l border-slate-200">
            <button
              type="button"
              onClick={() => setZoomScale((z) => Math.max(0.75, +(z - 0.15).toFixed(2)))}
              aria-label="Zoom out"
              className="p-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <ZoomOut className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setZoomScale((z) => Math.min(1.75, +(z + 0.15).toFixed(2)))}
              aria-label="Zoom in"
              className="p-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          <a
            href={currentDoc.url}
            download
            className="ml-1 inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 rounded hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            <Download className="w-3 h-3" aria-hidden="true" />
            <span>PDF</span>
          </a>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close PDF panel"
              className="lg:hidden p-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div className="px-3 sm:px-4 py-2 border-b border-slate-200 bg-slate-50 flex items-center gap-1.5 overflow-x-auto">
        <span className="text-xs font-medium text-slate-500 whitespace-nowrap mr-1">
          Quick Jump:
        </span>
        {quickJumps.map((jump) => (
          <button
            key={jump.page}
            type="button"
            onClick={() => onPageChange(jump.page)}
            className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors whitespace-nowrap shrink-0 ${
              safePage === jump.page
                ? 'bg-blue-900 text-white border-blue-900'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:text-slate-900'
            }`}
          >
            {jump.label}
          </button>
        ))}
      </div>

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-auto bg-slate-100 p-2 sm:p-4 flex flex-col items-center relative"
      >
        {renderError && (
          <div className="my-auto max-w-sm bg-white border border-red-200 rounded-lg p-5 text-center space-y-3">
            <AlertCircle className="w-6 h-6 text-red-600 mx-auto" aria-hidden="true" />
            <div className="text-sm font-semibold text-slate-900">
              Unable to Display Page {safePage}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">{renderError}</p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  pdfDocumentCache.delete(currentDoc.url);
                  setRenderError(null);
                  setReloadToken((t) => t + 1);
                }}
                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-900 rounded hover:bg-blue-950 transition-colors"
              >
                Retry
              </button>
              <a
                href={currentDoc.url}
                download
                className="px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 rounded hover:bg-slate-50 transition-colors"
              >
                Download PDF
              </a>
            </div>
          </div>
        )}
        <div
          className={
            renderError
              ? 'hidden'
              : 'relative bg-white border border-slate-200 shadow-xs'
          }
        >
          {isRendering && (
            <div className="absolute inset-0 bg-white/75 flex items-center justify-center z-10">
              <span className="text-xs font-medium text-slate-600">
                Rendering page {safePage}...
              </span>
            </div>
          )}
          <canvas ref={canvasRef} className="block" />
        </div>
      </div>
    </aside>
  );
}
