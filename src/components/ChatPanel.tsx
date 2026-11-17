import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import {
  Send,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Copy,
  Check,
  AlertCircle,
  PanelRightOpen,
  PanelRightClose,
  ArrowUpRight,
} from 'lucide-react';
import {
  DOCUMENTS,
  STARTER_QUESTIONS,
  WAGE_HEADLINE_RATES,
} from '../data/agreementIndex';
import { ChatMessage, Citation, DocumentId } from '../types/chat';
import { IbewSeal } from './IbewSeal';

interface ChatPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
  showPdfPane: boolean;
  onTogglePdfPane: () => void;
  onSendMessage: (text: string) => void;
  onSelectCitation: (citation: Citation) => void;
  onOpenDocumentPage: (docId: DocumentId, page: number) => void;
}

function renderInlineFormatting(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={idx}
          className="px-1 py-0.5 text-xs font-mono bg-slate-100 text-slate-800 rounded"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

function FormattedMarkdown({ content }: { content: string }) {
  const lines = content.split('\n');
  const blocks: Array<
    | { type: 'paragraph'; text: string }
    | { type: 'heading'; text: string }
    | { type: 'ul'; items: string[] }
    | { type: 'ol'; items: string[] }
    | { type: 'table'; headers: string[]; rows: string[][] }
  > = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }

    if (
      line.startsWith('|') &&
      i + 1 < lines.length &&
      lines[i + 1].trim().startsWith('|') &&
      lines[i + 1].includes('---')
    ) {
      const headers = line
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim());
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const row = lines[i]
          .trim()
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());
        rows.push(row);
        i++;
      }
      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    if (/^#{1,3}\s+/.test(line)) {
      blocks.push({ type: 'heading', text: line.replace(/^#{1,3}\s+/, '') });
      i++;
      continue;
    }

    if (/^[-*•]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*•]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^#{1,3}\s+/.test(lines[i].trim()) &&
      !/^[-*•]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !lines[i].trim().startsWith('|')
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }
    blocks.push({ type: 'paragraph', text: paraLines.join(' ') });
  }

  return (
    <div className="space-y-3 text-sm leading-relaxed text-slate-700">
      {blocks.map((block, idx) => {
        if (block.type === 'heading') {
          return (
            <h4 key={idx} className="text-sm font-semibold text-slate-900 pt-1">
              {renderInlineFormatting(block.text)}
            </h4>
          );
        }
        if (block.type === 'ul') {
          return (
            <ul key={idx} className="list-disc pl-5 space-y-1.5">
              {block.items.map((item, j) => (
                <li key={j}>{renderInlineFormatting(item)}</li>
              ))}
            </ul>
          );
        }
        if (block.type === 'ol') {
          return (
            <ol key={idx} className="list-decimal pl-5 space-y-1.5">
              {block.items.map((item, j) => (
                <li key={j}>{renderInlineFormatting(item)}</li>
              ))}
            </ol>
          );
        }
        if (block.type === 'table') {
          return (
            <div
              key={idx}
              className="overflow-x-auto border border-slate-200 rounded-md bg-white"
            >
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                  <tr>
                    {block.headers.map((h, j) => (
                      <th key={j} className="px-3 py-2 font-semibold whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums">
                  {block.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50/60">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3 py-2 text-slate-700">
                          {renderInlineFormatting(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return <p key={idx}>{renderInlineFormatting(block.text)}</p>;
      })}
    </div>
  );
}

export function ChatPanel({
  messages,
  isLoading,
  showPdfPane,
  onTogglePdfPane,
  onSendMessage,
  onSelectCitation,
  onOpenDocumentPage,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!input.trim() || isLoading) return;
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleCopy = async (msg: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(msg.content);
      setCopiedId(msg.id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // Ignore clipboard failures
    }
  };

  return (
    <section className="flex-1 min-w-0 flex flex-col bg-slate-50 h-full">
      <div className="px-3 sm:px-6 py-2 sm:py-2.5 bg-white border-b border-slate-200 flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-600 min-w-0">
          <ShieldCheck className="w-4 h-4 text-blue-900 shrink-0" aria-hidden="true" />
          <span className="truncate sm:hidden">
            Strict Mode · 2 PDFs (42 pp.)
          </span>
          <span className="truncate hidden sm:inline">
            Strict Document Mode · Grounded exclusively in 2 attached PDFs (42 pages)
          </span>
        </div>

        <button
          type="button"
          onClick={onTogglePdfPane}
          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
        >
          {showPdfPane ? (
            <>
              <PanelRightClose className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="sm:hidden">Hide PDF</span>
              <span className="hidden sm:inline">Hide Source PDF</span>
            </>
          ) : (
            <>
              <PanelRightOpen className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="sm:hidden">View PDF</span>
              <span className="hidden sm:inline">Show Source PDF</span>
            </>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
        {messages.length === 0 ? (
          <div className="max-w-4xl mx-auto space-y-5 sm:space-y-6">
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-900 px-4 py-5 sm:px-6 sm:py-6 text-white flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white p-1 shrink-0 flex items-center justify-center">
                  <IbewSeal className="w-full h-full" />
                </div>
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-amber-300 font-medium tracking-wide">
                    <span>IBEW Local Union 84</span>
                    <span aria-hidden="true" className="text-slate-500">
                      ·
                    </span>
                    <span>SELCAT / NECA</span>
                    <span aria-hidden="true" className="text-slate-500">
                      ·
                    </span>
                    <span className="font-mono tabular-nums">
                      06/01/2025 – 05/31/2028
                    </span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white [text-wrap:balance]">
                    Georgia Statewide Agreement &amp; Wage Schedule Assistant
                  </h1>
                  <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
                    Query contract provisions, crew requirements, gloving rules, referral
                    procedures, and updated 2025–2028 hourly wage and benefit tables across
                    both attached PDFs.
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 bg-white">
                {[DOCUMENTS.wages, DOCUMENTS.agreement].map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => onOpenDocumentPage(doc.id, 1)}
                    className="px-4 py-3.5 sm:px-6 sm:py-4 text-left hover:bg-slate-50 transition-colors group focus:outline-none focus-visible:bg-slate-50"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-blue-900 inline-flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>{doc.title}</span>
                      </span>
                      <span className="font-mono tabular-nums text-slate-500 group-hover:text-blue-900 shrink-0">
                        {doc.totalPages} pp.
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span className="truncate">{doc.subtitle}</span>
                      <ArrowUpRight
                        className="w-3.5 h-3.5 shrink-0 text-slate-400 group-hover:text-blue-900 transition-colors"
                        aria-hidden="true"
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4">
                <h2 className="text-xs font-semibold text-slate-700 tracking-wide">
                  2025–2028 Key Classification Rates (Updated GA Wages PDF)
                </h2>
                <button
                  type="button"
                  onClick={() => onOpenDocumentPage('wages', 1)}
                  className="text-xs font-medium text-blue-900 hover:underline underline-offset-4 whitespace-nowrap"
                >
                  Open full rate tables
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {WAGE_HEADLINE_RATES.map((rate) => (
                  <button
                    key={rate.classification}
                    type="button"
                    onClick={() => onOpenDocumentPage(rate.documentId, rate.page)}
                    className="p-4 text-left bg-white border border-slate-200 rounded-lg hover:border-blue-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-900 group"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span className="truncate">{rate.schedule}</span>
                      <ArrowUpRight
                        className="w-3.5 h-3.5 shrink-0 text-slate-300 group-hover:text-blue-900 transition-colors"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {rate.classification}
                    </div>
                    <div className="mt-3 flex items-baseline justify-between gap-2">
                      <span className="text-lg font-bold font-mono tabular-nums text-slate-900">
                        {rate.base25}
                      </span>
                      <span className="text-xs font-mono tabular-nums text-slate-500">
                        Pkg {rate.pkg25}
                      </span>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-mono tabular-nums text-slate-500">
                      <span>26–27: {rate.base26}</span>
                      <span>27–28: {rate.base27}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5">
              <h2 className="text-xs font-semibold text-slate-700 tracking-wide">
                Suggested Contract &amp; Wage Questions
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {STARTER_QUESTIONS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={isLoading}
                    onClick={() => onSendMessage(item.question)}
                    className="p-4 text-left bg-white border border-slate-200 rounded-lg hover:border-blue-900 transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-900 group"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs font-semibold text-blue-900">
                      <span>{item.category}</span>
                      <ArrowUpRight
                        className="w-3.5 h-3.5 shrink-0 text-slate-300 group-hover:text-blue-900 transition-colors"
                        aria-hidden="true"
                      />
                    </div>
                    <p className="mt-1.5 text-sm text-slate-800 leading-snug">
                      {item.question}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
            {messages.map((msg) => {
              if (msg.role === 'user') {
                return (
                  <div key={msg.id} className="flex justify-end">
                    <div className="max-w-[90%] sm:max-w-[85%] bg-blue-900 text-white px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-lg text-sm leading-relaxed">
                      {msg.content}
                    </div>
                  </div>
                );
              }

              if (msg.isError) {
                return (
                  <div
                    key={msg.id}
                    className="bg-white border border-red-200 rounded-lg p-4 flex items-start gap-3"
                  >
                    <AlertCircle
                      className="w-4 h-4 text-red-600 shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <div className="space-y-1 text-sm">
                      <div className="font-semibold text-red-800">
                        Request Error
                      </div>
                      <p className="text-slate-700">{msg.content}</p>
                    </div>
                  </div>
                );
              }

              const isGrounded = msg.grounded !== false;

              return (
                <article
                  key={msg.id}
                  className="bg-white border border-slate-200 rounded-lg p-3.5 sm:p-5 space-y-3.5 sm:space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2 text-xs">
                      {isGrounded ? (
                        <>
                          <ShieldCheck
                            className="w-4 h-4 text-emerald-700 shrink-0"
                            aria-hidden="true"
                          />
                          <span className="font-medium text-emerald-800">
                            Grounded in Source PDFs
                          </span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert
                            className="w-4 h-4 text-amber-700 shrink-0"
                            aria-hidden="true"
                          />
                          <span className="font-medium text-amber-800">
                            Outside Document Scope
                          </span>
                        </>
                      )}
                      <span aria-hidden="true" className="text-slate-300">
                        ·
                      </span>
                      <span className="font-mono tabular-nums text-slate-400">
                        {msg.timestamp}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopy(msg)}
                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors"
                      aria-label="Copy response"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                          <span className="text-emerald-700">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  <FormattedMarkdown content={msg.content} />

                  {isGrounded && msg.citations && msg.citations.length > 0 && (
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <div className="text-xs font-semibold text-slate-700">
                        Source Citations (click to view cited page)
                      </div>
                      <div className="space-y-2">
                        {msg.citations.map((cit, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => onSelectCitation(cit)}
                            className="w-full text-left p-3 rounded-md bg-slate-50 border border-slate-200 hover:border-blue-900 hover:bg-blue-50/30 transition-colors group"
                          >
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="inline-flex items-center gap-1.5 font-semibold text-blue-900 min-w-0">
                                <FileText className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                <span className="truncate">
                                  {cit.documentTitle} · {cit.section}
                                </span>
                              </span>
                              <span className="font-mono tabular-nums text-slate-500 group-hover:text-blue-900 shrink-0">
                                {cit.pageLabel}
                              </span>
                            </div>
                            {cit.quote && (
                              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed line-clamp-2">
                                &ldquo;{cit.quote}&rdquo;
                              </p>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}

            {isLoading && (
              <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-medium text-slate-700">
                    Checking both Agreement &amp; Updated Wage Schedule PDFs...
                  </span>
                </div>
                <div className="space-y-2 animate-pulse">
                  <div className="h-3.5 bg-slate-100 rounded w-3/4" />
                  <div className="h-3.5 bg-slate-100 rounded w-5/6" />
                  <div className="h-3.5 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="px-3 py-2.5 sm:p-4 pb-[max(0.625rem,env(safe-area-inset-bottom))] bg-white border-t border-slate-200"
      >
        <div className="max-w-3xl mx-auto flex items-end gap-2 sm:gap-3">
          <div className="flex-1 min-w-0">
            <label htmlFor="agreement-question" className="sr-only">
              Ask a question about the agreement or updated wage schedules
            </label>
            <textarea
              id="agreement-question"
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder="Ask about wage schedules, benefits, crew rules, gloving, or MOUs..."
              className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 sm:px-3.5 py-2 sm:py-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-900 focus:bg-white focus:outline-none disabled:opacity-60 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="h-11 px-3.5 sm:px-5 inline-flex items-center gap-1.5 sm:gap-2 rounded-lg bg-blue-900 text-white text-sm font-medium hover:bg-blue-950 disabled:opacity-45 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
          >
            <span>Ask</span>
            <Send className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </form>
    </section>
  );
}
