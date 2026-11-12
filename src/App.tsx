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

  // Default mode is LIGHT mode as requested
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return 'light'; // Default is light mode
    }
    return 'light';
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

  const handleReverseOrder = () => {
    setPages((prev) => [...prev].reverse());
    setSelectedPageIndices(new Set());
  };

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
          particleCount: 90,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#2563eb', '#0284c7', '#000000', '#ffffff'],
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
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#080c14] text-black dark:text-white flex flex-col font-sans transition-colors duration-150">
      {/* Top Banner / Announcement */}
      <div className="bg-black text-white dark:bg-blue-600 dark:text-white py-1 px-4 text-center text-[11px] font-black tracking-widest uppercase border-b-2 border-black dark:border-white">
        PDFWONDER • POWERED BY SAMSCO COMMUNICATIONS • 100% PRIVATE CLIENT-SIDE ENGINE
      </div>

      {/* Main Header */}
      <header className="border-b-3 border-black dark:border-white bg-white dark:bg-black sticky top-0 z-40 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 bg-blue-600 text-white neo-border-3 neo-shadow flex items-center justify-center">
              <FileText className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-black dark:text-white uppercase">
                  PDFWonder
                </span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-blue-600 text-white neo-border">
                  PRO
                </span>
              </div>
              <p className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                By Samsco Communications
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 neo-border-3 neo-btn bg-white dark:bg-slate-900 text-black dark:text-white font-black"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-blue-400 stroke-[2.5]" />
              ) : (
                <Moon className="w-4 h-4 text-black stroke-[2.5]" />
              )}
            </button>

            <div className="hidden md:flex items-center gap-1.5 text-xs font-black uppercase bg-blue-100 dark:bg-blue-950 px-3 py-1.5 neo-border">
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 stroke-[2.5]" />
              <span>Private & Client-Side</span>
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
          /* Empty State / Neobrutalist Hero Section */
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 md:py-20 max-w-5xl mx-auto w-full">
            <div className="text-center space-y-4 mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 neo-border bg-white dark:bg-black text-xs font-black uppercase neo-shadow-sm">
                <Sparkles className="w-4 h-4 text-blue-600 fill-current" />
                <span>PDFWonder (By Samsco Communications)</span>
              </div>
              <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-black dark:text-white max-w-3xl leading-[1.1] uppercase">
                The Ultimate <span className="text-blue-600 underline decoration-4 underline-offset-6">Client-Side</span> PDF Studio
              </h1>
              <p className="text-base sm:text-lg font-bold text-slate-700 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
                Merge PDFs with images, rearrange pages seamlessly, rotate, crop, draw, and auto-scale before exporting—zero server uploads.
              </p>
            </div>

            {/* Dropzone Card */}
            <FileDropzone onFilesAdded={handleFilesAdded} isLoading={isLoadingFiles} />

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 w-full">
              <div className="p-6 bg-white dark:bg-black neo-border-3 neo-shadow flex flex-col gap-3">
                <div className="w-10 h-10 neo-border bg-blue-600 text-white flex items-center justify-center font-bold">
                  <Layers className="w-5 h-5 stroke-[2.5]" />
                </div>
                <h3 className="font-black text-black dark:text-white text-base uppercase">Merge PDFs & Images</h3>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">
                  Mix multiple PDF files with JPG, PNG, and WebP images. Each sheet is isolated into its own moveable card.
                </p>
              </div>

              <div className="p-6 bg-white dark:bg-black neo-border-3 neo-shadow flex flex-col gap-3">
                <div className="w-10 h-10 neo-border bg-white dark:bg-slate-900 text-blue-600 flex items-center justify-center font-bold">
                  <Zap className="w-5 h-5 stroke-[2.5]" />
                </div>
                <h3 className="font-black text-black dark:text-white text-base uppercase">Rotate & Rearrange</h3>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">
                  Flip pages 90° clockwise or counter-clockwise. Drag and drop cards to change the final order seamlessly.
                </p>
              </div>

              <div className="p-6 bg-white dark:bg-black neo-border-3 neo-shadow flex flex-col gap-3">
                <div className="w-10 h-10 neo-border bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold">
                  <Sparkles className="w-5 h-5 stroke-[2.5]" />
                </div>
                <h3 className="font-black text-black dark:text-white text-base uppercase">Crop, Draw & Annotate</h3>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">
                  Crop any image snippet, highlight paragraphs, sketch freehand, or stamp text blocks directly on any page.
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
            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-4 pb-2 flex items-center justify-between text-xs font-bold text-black dark:text-white">
              <div className="flex items-center gap-2 bg-blue-100 dark:bg-blue-950 px-3 py-1.5 neo-border">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 stroke-[2.5]" />
                <span>Drag cards to reorder. Hover over a page and click <strong>"Annotate / Crop"</strong> to edit.</span>
              </div>
              <span className="hidden sm:inline font-black uppercase text-blue-700 dark:text-blue-400">
                {pages.length} PAGE{pages.length !== 1 ? 'S' : ''} READY
              </span>
            </div>

            {/* Page Grid */}
            <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
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
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center space-y-4">
          <div className="w-20 h-20 bg-blue-600 text-white neo-border-3 neo-shadow-lg flex items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin stroke-[2.5]" />
          </div>
          <div className="text-center space-y-1 bg-white dark:bg-black p-4 neo-border-3 neo-shadow">
            <h3 className="text-base font-black uppercase text-black dark:text-white">Importing Documents</h3>
            <p className="text-xs font-bold text-blue-600 dark:text-blue-400">{loadingStatus || 'Processing...'}</p>
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
      <footer className="border-t-3 border-black dark:border-white py-6 px-4 text-center bg-white dark:bg-black">
        <p className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
          PDFWonder • By Samsco Communications • All operations run 100% inside your browser
        </p>
      </footer>
    </div>
  );
}

export default App;
