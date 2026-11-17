import { useState } from 'react';
import { Menu } from 'lucide-react';
import { ChatPanel } from './components/ChatPanel';
import { DocumentSidebar } from './components/DocumentSidebar';
import { IbewSeal } from './components/IbewSeal';
import { PdfReferencePane } from './components/PdfReferencePane';
import { ChatMessage, Citation, DocumentId, DocumentSection } from './types/chat';

function formatTime(): string {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeDocument, setActiveDocument] = useState<DocumentId>('wages');
  const [activePage, setActivePage] = useState(1);
  const [showMobileIndex, setShowMobileIndex] = useState(false);
  const [showPdfPane, setShowPdfPane] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );

  const openDocumentPage = (docId: DocumentId, page: number) => {
    const safeDoc: DocumentId = docId === 'wages' ? 'wages' : 'agreement';
    const maxPages = safeDoc === 'wages' ? 4 : 38;
    const parsedPage = Number(page);
    const safePage = Number.isFinite(parsedPage)
      ? Math.max(1, Math.min(maxPages, Math.round(parsedPage)))
      : 1;
    setActiveDocument(safeDoc);
    setActivePage(safePage);
    setShowPdfPane(true);
  };

  const handleSelectDocument = (docId: DocumentId) => {
    setActiveDocument(docId === 'wages' ? 'wages' : 'agreement');
    setActivePage(1);
  };

  const handleSelectSection = (section: DocumentSection) => {
    setShowMobileIndex(false);
    openDocumentPage(section.documentId, section.pdfPage);
  };

  const handleSelectCitation = (citation: Citation) => {
    const safeDoc: DocumentId =
      citation.documentId === 'wages' ? 'wages' : 'agreement';
    const maxPages = safeDoc === 'wages' ? 4 : 38;
    const parsedPage = Number(citation.pageNumber);
    const safePage = Number.isFinite(parsedPage)
      ? Math.max(1, Math.min(maxPages, Math.round(parsedPage)))
      : 1;
    openDocumentPage(safeDoc, safePage);
  };

  const handleClearChat = () => {
    if (isLoading) return;
    setMessages([]);
  };

  const handleSendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: formatTime(),
    };

    const historyPayload = messages
      .filter((m) => !m.isError)
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: historyPayload,
        }),
      });

      const data = (await response.json()) as {
        grounded?: boolean;
        answer?: string;
        citations?: Citation[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get a response from the server.');
      }

      const citations: Citation[] = Array.isArray(data.citations)
        ? data.citations.map((cit) => {
            const safeDoc: DocumentId =
              cit.documentId === 'wages' ? 'wages' : 'agreement';
            const maxPages = safeDoc === 'wages' ? 4 : 38;
            const parsedPage = Number(cit.pageNumber);
            const safePage = Number.isFinite(parsedPage)
              ? Math.max(1, Math.min(maxPages, Math.round(parsedPage)))
              : 1;
            return {
              ...cit,
              documentId: safeDoc,
              pageNumber: safePage,
            };
          })
        : [];
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content:
          data.answer ||
          'No supported answer was returned from the attached documents.',
        grounded: data.grounded,
        citations,
        timestamp: formatTime(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (data.grounded && citations.length > 0) {
        setActiveDocument(citations[0].documentId);
        setActivePage(citations[0].pageNumber);
      }
    } catch (error) {
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content:
          error instanceof Error
            ? error.message
            : 'Unable to reach the agreement assistant right now.',
        isError: true,
        timestamp: formatTime(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-slate-50 text-slate-900 overflow-hidden">
      <header className="h-14 sm:h-16 px-3 sm:px-6 bg-white border-b border-slate-200 flex items-center justify-between gap-3 sm:gap-8 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setShowMobileIndex((prev) => !prev)}
            aria-label="Open document index"
            aria-expanded={showMobileIndex}
            className="md:hidden p-2 -ml-1 rounded-md text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors shrink-0"
          >
            <Menu className="w-4 h-4" aria-hidden="true" />
          </button>
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              handleClearChat();
              openDocumentPage('wages', 1);
            }}
            className="inline-flex items-center gap-2.5 text-sm sm:text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            <IbewSeal className="w-7 h-7 sm:w-8 sm:h-8" />
            <span>Local 84 Contract Hub</span>
          </a>
        </div>

        <nav
          aria-label="Document quick navigation"
          className="hidden lg:flex items-center gap-4 xl:gap-6 text-xs xl:text-sm font-medium text-slate-600"
        >
          <button
            type="button"
            onClick={() => openDocumentPage('wages', 1)}
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Updated Wages
          </button>
          <button
            type="button"
            onClick={() => openDocumentPage('agreement', 3)}
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Main Agreement
          </button>
          <button
            type="button"
            onClick={() => openDocumentPage('agreement', 28)}
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Underground MOU
          </button>
          <button
            type="button"
            onClick={() => openDocumentPage('agreement', 32)}
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Substation MOU
          </button>
          <button
            type="button"
            onClick={() => openDocumentPage('agreement', 35)}
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Ductline MOU
          </button>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={handleClearChat}
            disabled={isLoading || messages.length === 0}
            className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-medium text-white bg-blue-900 rounded-lg hover:bg-blue-950 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
          >
            New Chat
          </button>
        </div>
      </header>

      <main className="flex-1 min-h-0 flex overflow-hidden relative">
        {showMobileIndex && (
          <div className="md:hidden fixed inset-0 top-14 sm:top-16 z-40 flex">
            <div
              className="fixed inset-0 top-14 sm:top-16 bg-slate-900/35"
              aria-hidden="true"
              onClick={() => setShowMobileIndex(false)}
            />
            <div className="relative z-10 h-full">
              <DocumentSidebar
                activeDocument={activeDocument}
                activePage={activePage}
                onSelectSection={handleSelectSection}
                onAskQuestion={(q) => {
                  setShowMobileIndex(false);
                  handleSendMessage(q);
                }}
                isLoading={isLoading}
                onClose={() => setShowMobileIndex(false)}
              />
            </div>
          </div>
        )}

        <div className="hidden md:flex h-full">
          <DocumentSidebar
            activeDocument={activeDocument}
            activePage={activePage}
            onSelectSection={handleSelectSection}
            onAskQuestion={handleSendMessage}
            isLoading={isLoading}
          />
        </div>

        <ChatPanel
          messages={messages}
          isLoading={isLoading}
          showPdfPane={showPdfPane}
          onTogglePdfPane={() => setShowPdfPane((prev) => !prev)}
          onSendMessage={handleSendMessage}
          onSelectCitation={handleSelectCitation}
          onOpenDocumentPage={openDocumentPage}
        />

        {showPdfPane && (
          <div className="fixed inset-0 top-14 sm:top-16 z-30 flex lg:static lg:inset-auto lg:z-auto lg:contents">
            <PdfReferencePane
              activeDocument={activeDocument}
              activePage={activePage}
              onSelectDocument={handleSelectDocument}
              onPageChange={setActivePage}
              onClose={() => setShowPdfPane(false)}
            />
          </div>
        )}
      </main>
    </div>
  );
}
