import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  FileText,
  Sparkles,
  Layers,
  ShieldCheck,
  Zap,
  Info,
  Loader2,
  Sun,
  Moon
} from 'lucide-react';

import type { PDFPageItem, LoadedFile, PageAnnotation, PageScaleMode } from './types';
import { renderPdfPageToDataUrl, getPdfPageCount, renderImageFileToDataUrl } from './utils/pdfRenderer';
import { generateExportPdf, downloadPdf } from './utils/pdfExporter';
import { FileDropzone } from './components/FileDropzone';
import { PageCard } from './components/PageCard';
import { Toolbar } from './components/Toolbar';
import { PageEditorModal } from './components/PageEditorModal';

export function App() {
  const [pages, setPages] = useState<PDFPageItem[]>([]);
  const [filesMap, setFilesMap] = useState<Map<string, LoadedFile>>(new Map());
  const [selectedPageIndices, setSelectedPageIndices] = useState<Set<number>>(new Set());
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string>('');

  // Dark / Light mode state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Drag & drop rearranging state
  const [draggedPageIndex, setDraggedPageIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Page Editor Modal state
  const [editingPage, setEditingPage] = useState<PDFPageItem | null>(null);

  // Export progress and settings
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ percent: 0, text: '' });
  const [scaleMode, setScaleMode] = useState<PageScaleMode>('fit_a4');

  // Handle incoming PDF or image files
  const handleFilesAdded = async (files: File[]) => {
    setIsLoadingFiles(true);
    const newPages: PDFPageItem[] = [];
    const newFilesMap = new Map(filesMap);

    for (let fIdx = 0; fIdx < files.length; fIdx++) {
      const file = files[fIdx];
      const fileId = 'file_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

      setLoadingStatus(`Reading ${file.name} (${fIdx + 1}/${files.length})...`);

      try {
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          const arrayBuffer = await file.arrayBuffer();
          const pdfBytes = new Uint8Array(arrayBuffer);
          const pageCount = await getPdfPageCount(pdfBytes);

          newFilesMap.set(fileId, {
            id: fileId,
            name: file.name,
            size: file.size,
            type: file.type || 'application/pdf',
            pageCount,
            pdfBytes,
          });

          for (let p = 0; p < pageCount; p++) {
            setLoadingStatus(`Rendering page ${p + 1} of ${pageCount} for ${file.name}...`);
            const { dataUrl, width, height } = await renderPdfPageToDataUrl(pdfBytes, p, 1.2);

            newPages.push({
              id: `page_${fileId}_${p}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
              sourceFileId: fileId,
              sourceFileName: file.name,
              sourceType: 'pdf',
              sourcePageIndex: p,
              rotation: 0,
              thumbnailUrl: dataUrl,
              width,
              height,
              annotations: [],
            });
          }
        } else if (file.type.startsWith('image/')) {
          setLoadingStatus(`Processing image ${file.name}...`);
          const { dataUrl, width, height } = await renderImageFileToDataUrl(file);

          newFilesMap.set(fileId, {
            id: fileId,
            name: file.name,
            size: file.size,
            type: file.type,
            pageCount: 1,
            imageBlob: file,
          });

          newPages.push({
            id: `page_${fileId}_0_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            sourceFileId: fileId,
            sourceFileName: file.name,
            sourceType: 'image',
            sourcePageIndex: 0,
            rotation: 0,
            thumbnailUrl: dataUrl,
            width,
            height,
            annotations: [],
          });
        }
      } catch (err) {
        console.error('Error processing file:', file.name, err);
        alert(`Could not process "${file.name}". Please ensure it is a valid PDF or image.`);
      }
    }

    setFilesMap(newFilesMap);
    setPages((prev) => [...prev, ...newPages]);
    setIsLoadingFiles(false);
    setLoadingStatus('');
  };

  // Selection toggle
  const handleSelectPage = (index: number, e: React.MouseEvent) => {
    setSelectedPageIndices((prev) => {
      const next = new Set(prev);
      if (e.shiftKey || e.ctrlKey || e.metaKey) {
        if (next.has(index)) {
          next.delete(index);
        } else {
          next.add(index);
        }
      } else {
        if (next.has(index) && next.size === 1) {
          next.clear();
        } else {
          next.clear();
          next.add(index);
        }
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedPageIndices.size === pages.length) {
      setSelectedPageIndices(new Set());
    } else {
      setSelectedPageIndices(new Set(pages.map((_, i) => i)));
    }
  };

  // Rotation
  const handleRotatePage = (id: string, delta: number) => {
    setPages((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const newRot = (p.rotation + delta + 360) % 360;
          return { ...p, rotation: newRot };
        }
        return p;
      })
    );
  };

  const handleRotateSelected = (delta: number) => {
    setPages((prev) =>
      prev.map((p, idx) => {
        if (selectedPageIndices.has(idx)) {
          const newRot = (p.rotation + delta + 360) % 360;
          return { ...p, rotation: newRot };
        }
        return p;
      })
    );
  };

  const handleRotateAll = (delta: number) => {
    setPages((prev) =>
      prev.map((p) => ({
        ...p,
        rotation: (p.rotation + delta + 360) % 360,
      }))
    );
  };

  // Deletion
  const handleDeletePage = (id: string) => {
    setPages((prev) => prev.filter((p) => p.id !== id));
    setSelectedPageIndices(new Set());
  };

  const handleDeleteSelected = () => {
    if (selectedPageIndices.size === 0) return;
    setPages((prev) => prev.filter((_, idx) => !selectedPageIndices.has(idx)));
    setSelectedPageIndices(new Set());
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to remove all pages and start over?')) {
      setPages([]);
      setSelectedPageIndices(new Set());
    }
  };

  // Duplication
  const handleDuplicatePage = (id: string) => {
    const pageIndex = pages.findIndex((p) => p.id === id);
    if (pageIndex === -1) return;

    const source = pages[pageIndex];
    const duplicated: PDFPageItem = {
      ...source,
      id: `page_${source.sourceFileId}_dup_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      annotations: source.annotations.map((a) => ({ ...a })),
    };

    const nextPages = [...pages];
    nextPages.splice(pageIndex + 1, 0, duplicated);
    setPages(nextPages);
  };

  // Reverse page order
  const handleReverseOrder = () => {
    setPages((prev) => [...prev].reverse());
    setSelectedPageIndices(new Set());
  };

  // Drag and drop page reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedPageIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedPageIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedPageIndex === null || draggedPageIndex === targetIndex) {
      setDraggedPageIndex(null);
      setDragOverIndex(null);
      return;
    }

    setPages((prev) => {
      const updated = [...prev];
      const [movedPage] = updated.splice(draggedPageIndex, 1);
      updated.splice(targetIndex, 0, movedPage);
      return updated;
    });

    setDraggedPageIndex(null);
    setDragOverIndex(null);
  };

  // Page Editor Save Callback
  const handleSavePageEdits = (
    annotations: PageAnnotation[],
    rotation: number,
    newThumbnailUrl?: string,
    newDimensions?: { width: number; height: number }
  ) => {
    if (!editingPage) return;

    setPages((prev) =>
      prev.map((p) => {
        if (p.id === editingPage.id) {
          return {
            ...p,
            annotations,
            rotation,
            thumbnailUrl: newThumbnailUrl || p.thumbnailUrl,
            width: newDimensions ? newDimensions.width : p.width,
            height: newDimensions ? newDimensions.height : p.height,
            isEdited: annotations.length > 0 || !!newThumbnailUrl,
          };
        }
        return p;
      })
    );
  };

  // Export to PDF
  const handleExport = async () => {
    if (pages.length === 0) return;
    setIsExporting(true);
    setExportProgress({ percent: 10, text: 'Preparing pages...' });

    try {
      const mergedPdfBytes = await generateExportPdf(
        pages,
        filesMap,
        scaleMode,
        (percent, text) => {
          setExportProgress({ percent, text });
        }
      );

      downloadPdf(mergedPdfBytes, `PDFWonder_${Date.now()}.pdf`);

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#f43f5e', '#ec4899', '#8b5cf6', '#3b82f6'],
        });
      } catch {
        // Confetti fallback
      }
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('Error creating exported PDF. Check console for details.');
    } finally {
      setIsExporting(false);
      setExportProgress({ percent: 0, text: '' });
    }
  };

  const editingPageIndex = editingPage ? pages.findIndex((p) => p.id === editingPage.id) : -1;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white transition-colors duration-200">
      {/* Navigation Bar */}
      <header className="border-b border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-400 p-0.5 shadow-lg shadow-rose-500/20">
              <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[10px] flex items-center justify-center">
                <FileText className="w-5 h-5 text-rose-500" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                  MakeMePDF
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-500/30">
                  Pro Studio
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Merge • Rotate • Reorder • Annotate
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors shadow-xs"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>

            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Client-side only & Private</span>
            </div>
            {pages.length > 0 && (
              <FileDropzone onFilesAdded={handleFilesAdded} isLoading={isLoadingFiles} compact />
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {pages.length === 0 ? (
          /* Empty State / Hero Section */
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 md:py-20 max-w-5xl mx-auto w-full">
            <div className="text-center space-y-4 mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                <span>The complete browser-based PDF suite</span>
              </div>
              <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 dark:text-white max-w-3xl leading-[1.1]">
                Merge, Rotate & Edit PDFs and Images Seamlessly
              </h1>
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
                Combine PDFs with images, rearrange pages with smooth drag-and-drop, rotate individual sheets, and annotate or draw before exporting.
              </p>
            </div>

            {/* Dropzone Card */}
            <FileDropzone onFilesAdded={handleFilesAdded} isLoading={isLoadingFiles} />

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 w-full">
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 flex flex-col gap-2 shadow-xs">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Merge PDFs & Images</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Mix multiple PDF files with JPG, PNG, and WebP images. Each sheet is extracted into its own moveable card.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 flex flex-col gap-2 shadow-xs">
                <div className="w-9 h-9 rounded-xl bg-pink-500/10 text-pink-500 flex items-center justify-center font-bold">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Rotate & Rearrange Pages</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Turn pages 90° clockwise or counter-clockwise individually or in bulk. Drag cards to change the final order seamlessly.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 flex flex-col gap-2 shadow-xs">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Edit & Annotate Pages</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Click any page to draw, highlight paragraphs, crop areas, or add text stamps directly on top of the document.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Active Workspace: Toolbar + Page Grid */
          <div className="flex-1 flex flex-col">
            <Toolbar
              totalPages={pages.length}
              selectedCount={selectedPageIndices.size}
              allSelected={selectedPageIndices.size === pages.length && pages.length > 0}
              scaleMode={scaleMode}
              onScaleModeChange={setScaleMode}
              isExporting={isExporting}
              exportProgress={exportProgress}
              onSelectAll={handleSelectAll}
              onRotateSelected={handleRotateSelected}
              onRotateAll={handleRotateAll}
              onDeleteSelected={handleDeleteSelected}
              onClearAll={handleClearAll}
              onReverseOrder={handleReverseOrder}
              onExport={handleExport}
            />

            {/* Instruction Banner */}
            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-4 pb-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-rose-500" />
                <span>Tip: Drag pages to reorder. Click a page card to select, or hover to click <strong>"Annotate / Edit"</strong>.</span>
              </div>
              <span className="hidden sm:inline text-slate-400 dark:text-slate-500 font-mono">
                {pages.length} page{pages.length !== 1 ? 's' : ''} ready
              </span>
            </div>

            {/* Page Grid */}
            <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {pages.map((page, index) => (
                  <PageCard
                    key={page.id}
                    page={page}
                    index={index}
                    isSelected={selectedPageIndices.has(index)}
                    onSelect={handleSelectPage}
                    onRotate={handleRotatePage}
                    onDelete={handleDeletePage}
                    onDuplicate={handleDuplicatePage}
                    onEdit={(p) => setEditingPage(p)}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                    onDrop={handleDrop}
                    isDragging={draggedPageIndex === index}
                    isDragOver={dragOverIndex === index}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Loading overlay during file ingestion */}
      {isLoadingFiles && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="text-lg font-bold text-white">Importing Documents</h3>
            <p className="text-sm text-slate-300">{loadingStatus || 'Processing...'}</p>
          </div>
        </div>
      )}

      {/* Page Editor Modal */}
      {editingPage && (
        <PageEditorModal
          page={editingPage}
          pageNumber={editingPageIndex + 1}
          totalPages={pages.length}
          isOpen={true}
          onClose={() => setEditingPage(null)}
          onSave={handleSavePageEdits}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-900 py-6 px-4 text-center text-xs text-slate-500">
        <p>MakeMePDF Pro Studio • Private in-browser PDF manipulation. No documents ever leave your computer.</p>
      </footer>
    </div>
  );
}

export default App;
