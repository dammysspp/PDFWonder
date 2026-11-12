import React from 'react';
import {
  RotateCw,
  RotateCcw,
  Trash2,
  Download,
  ArrowUpDown,
  CheckSquare,
  Square,
  Loader2,
  SlidersHorizontal,
} from 'lucide-react';
import type { PageScaleMode } from '../types';

interface ToolbarProps {
  totalPages: number;
  selectedCount: number;
  allSelected: boolean;
  scaleMode: PageScaleMode;
  onScaleModeChange: (mode: PageScaleMode) => void;
  isExporting: boolean;
  exportProgress: { percent: number; text: string };
  onSelectAll: () => void;
  onRotateSelected: (delta: number) => void;
  onRotateAll: (delta: number) => void;
  onDeleteSelected: () => void;
  onClearAll: () => void;
  onReverseOrder: () => void;
  onExport: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  totalPages,
  selectedCount,
  allSelected,
  scaleMode,
  onScaleModeChange,
  isExporting,
  exportProgress,
  onSelectAll,
  onRotateSelected,
  onRotateAll,
  onDeleteSelected,
  onClearAll,
  onReverseOrder,
  onExport,
}) => {
  return (
    <div className="sticky top-0 z-30 bg-white/85 dark:bg-slate-950/85 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 px-4 py-3 sm:px-6 transition-colors shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left side: Selection & Bulk Stats */}
        <div className="flex items-center gap-3">
          <button
            onClick={onSelectAll}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-xs"
          >
            {allSelected ? (
              <CheckSquare className="w-4 h-4 text-rose-500" />
            ) : (
              <Square className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            )}
            <span>{allSelected ? 'Deselect All' : 'Select All'}</span>
          </button>

          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {selectedCount > 0 ? (
              <span className="text-rose-500 font-semibold">{selectedCount} selected</span>
            ) : (
              `${totalPages} total page${totalPages !== 1 ? 's' : ''}`
            )}
          </span>
        </div>

        {/* Center: Rotation & Organization Actions */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-0.5">
            <button
              onClick={() => (selectedCount > 0 ? onRotateSelected(-90) : onRotateAll(-90))}
              className="p-1.5 px-2.5 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium"
              title={selectedCount > 0 ? "Rotate selected 90° counter-clockwise" : "Rotate all 90° counter-clockwise"}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Rotate L</span>
            </button>
            <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800" />
            <button
              onClick={() => (selectedCount > 0 ? onRotateSelected(90) : onRotateAll(90))}
              className="p-1.5 px-2.5 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium"
              title={selectedCount > 0 ? "Rotate selected 90° clockwise" : "Rotate all 90° clockwise"}
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Rotate R</span>
            </button>
          </div>

          <button
            onClick={onReverseOrder}
            className="p-1.5 px-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-medium shadow-xs"
            title="Reverse Page Order"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reverse</span>
          </button>

          {selectedCount > 0 ? (
            <button
              onClick={onDeleteSelected}
              className="p-1.5 px-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl transition-all flex items-center gap-1.5 text-xs font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete ({selectedCount})</span>
            </button>
          ) : (
            <button
              onClick={onClearAll}
              className="p-1.5 px-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300 dark:hover:border-rose-900/50 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-medium shadow-xs"
              title="Clear all pages"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear All</span>
            </button>
          )}
        </div>

        {/* Right side: Auto-Scaler & Export Action */}
        <div className="flex items-center gap-2.5">
          {/* Auto Scaler Control */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 gap-1 text-xs shadow-xs">
            <span className="flex items-center gap-1 px-1.5 text-slate-500 dark:text-slate-400 font-medium">
              <SlidersHorizontal className="w-3.5 h-3.5 text-rose-500" />
              <span className="hidden lg:inline">Auto-Scale:</span>
            </span>
            <button
              onClick={() => onScaleModeChange('fit_a4')}
              className={`px-2 py-1 rounded-lg font-medium transition-all ${
                scaleMode === 'fit_a4'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
              title="Scale and align all images and pages to standard A4"
            >
              Align to A4
            </button>
            <button
              onClick={() => onScaleModeChange('fit_first_page')}
              className={`px-2 py-1 rounded-lg font-medium transition-all ${
                scaleMode === 'fit_first_page'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
              title="Align all pages and images to the dimensions of the first page"
            >
              Match 1st Page
            </button>
            <button
              onClick={() => onScaleModeChange('original')}
              className={`px-2 py-1 rounded-lg font-medium transition-all ${
                scaleMode === 'original'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
              title="Keep raw original pixel dimensions"
            >
              Original
            </button>
          </div>

          <button
            onClick={onExport}
            disabled={isExporting || totalPages === 0}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:to-pink-700 shadow-md shadow-rose-500/25 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{exportProgress.text || 'Exporting...'}</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Save & Export PDF</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
