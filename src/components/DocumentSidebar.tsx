import { useMemo, useState } from 'react';
import { BookOpen, Search, ArrowUpRight, X } from 'lucide-react';
import { AGREEMENT_SECTIONS } from '../data/agreementIndex';
import { DocumentId, DocumentSection } from '../types/chat';

interface DocumentSidebarProps {
  activeDocument: DocumentId;
  activePage: number;
  onSelectSection: (section: DocumentSection) => void;
  onAskQuestion: (question: string) => void;
  isLoading: boolean;
  onClose?: () => void;
}

type CategoryFilter = 'all' | 'wages' | 'agreement' | 'mou';

export function DocumentSidebar({
  activeDocument,
  activePage,
  onSelectSection,
  onAskQuestion,
  isLoading,
  onClose,
}: DocumentSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<CategoryFilter>('all');

  const filteredSections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return AGREEMENT_SECTIONS.filter((sec) => {
      const matchesFilter = filter === 'all' || sec.category === filter;
      const matchesQuery =
        q.length === 0 ||
        sec.title.toLowerCase().includes(q) ||
        sec.code.toLowerCase().includes(q) ||
        sec.summary.toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [searchQuery, filter]);

  return (
    <aside className="w-[min(86vw,320px)] md:w-64 xl:w-72 shrink-0 border-r border-slate-200 bg-white flex flex-col h-full">
      <div className="p-3.5 sm:p-4 border-b border-slate-200 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold text-slate-900 tracking-wide">
            Document Index
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono tabular-nums text-slate-500">
              2 PDFs · 42 pp.
            </span>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close document index"
                className="md:hidden p-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        <div className="relative">
          <Search
            className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter schedules, articles, MOUs..."
            aria-label="Filter agreement and wage sections"
            className="w-full pl-8 pr-3 py-2 md:py-1.5 text-base md:text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-900 focus:bg-white transition-colors"
          />
        </div>

        <div
          className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-md"
          role="tablist"
          aria-label="Section category filter"
        >
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'wages', label: 'Wages' },
              { id: 'agreement', label: 'Rules' },
              { id: 'mou', label: 'MOUs' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={filter === tab.id}
              onClick={() => setFilter(tab.id)}
              className={`py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                filter === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {filteredSections.length === 0 ? (
          <div className="p-6 text-center space-y-2">
            <BookOpen className="w-5 h-5 text-slate-400 mx-auto" aria-hidden="true" />
            <p className="text-xs text-slate-500">
              No sections match &ldquo;{searchQuery}&rdquo;.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setFilter('all');
              }}
              className="text-xs font-medium text-blue-900 hover:underline"
            >
              Reset filter
            </button>
          </div>
        ) : (
          filteredSections.map((section) => {
            const isActive =
              activeDocument === section.documentId &&
              activePage === section.pdfPage;
            return (
              <div
                key={section.id}
                className={`p-3.5 transition-colors ${
                  isActive ? 'bg-blue-50/50' : 'hover:bg-slate-50/80'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectSection(section)}
                  className="w-full text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-900 rounded"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono font-medium text-blue-900">
                      {section.code}
                    </span>
                    <span className="font-mono tabular-nums text-slate-400">
                      {section.pageLabel}
                    </span>
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-900 group-hover:text-blue-900 transition-colors">
                    {section.title}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
                    {section.summary}
                  </p>
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => onAskQuestion(section.sampleQuestion)}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-900 hover:text-blue-950 disabled:opacity-50 transition-colors"
                >
                  <span>Ask about this section</span>
                  <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="p-3.5 border-t border-slate-200 bg-slate-50 text-xs text-slate-600 space-y-1.5">
        <div className="font-semibold text-slate-800">Indexed Sources</div>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate">Updated GA Wages</span>
          <span className="font-mono tabular-nums text-slate-400 shrink-0">4 pp.</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate">Outside Line Agreement</span>
          <span className="font-mono tabular-nums text-slate-400 shrink-0">38 pp.</span>
        </div>
      </div>
    </aside>
  );
}
