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
    <div className="sticky top-0 z-30 bg-white dark:bg-black border-b-3 border-black dark:border-white px-4 py-3 sm:px-6 transition-colors shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left side: Selection & Bulk Stats */}
        <div className="flex items-center gap-3">
          <button
            onClick={onSelectAll}
            className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 neo-border neo-btn text-xs font-black uppercase text-black dark:text-white"
          >
            {allSelected ? (
              <CheckSquare className="w-4 h-4 text-blue-600 stroke-[2.5]" />
            ) : (
              <Square className="w-4 h-4 text-black dark:text-white stroke-[2]" />
            )}
            <span>{allSelected ? 'Deselect All' : 'Select All'}</span>
          </button>

          <span className="text-xs font-black uppercase text-black dark:text-white bg-blue-100 dark:bg-blue-950 px-2 py-1 neo-border">
            {selectedCount > 0 ? (
              <span className="text-blue-700 dark:text-blue-300">{selectedCount} SELECTED</span>
            ) : (
              `${totalPages} PAGE${totalPages !== 1 ? 'S' : ''}`
            )}
          </span>
        </div>

        {/* Center: Rotation & Organization Actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center neo-border bg-white dark:bg-slate-900 p-0.5">
            <button
              onClick={() => (selectedCount > 0 ? onRotateSelected(-90) : onRotateAll(-90))}
              className="px-2.5 py-1 text-black dark:text-white hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors flex items-center gap-1 text-xs font-black uppercase"
              title={selectedCount > 0 ? "Rotate selected 90° counter-clockwise" : "Rotate all 90° counter-clockwise"}
            >
              <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Rot -90°</span>
            </button>
            <div className="h-4 w-[2px] bg-black dark:bg-white" />
            <button
              onClick={() => (selectedCount > 0 ? onRotateSelected(90) : onRotateAll(90))}
              className="px-2.5 py-1 text-black dark:text-white hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors flex items-center gap-1 text-xs font-black uppercase"
              title={selectedCount > 0 ? "Rotate selected 90° clockwise" : "Rotate all 90° clockwise"}
            >
              <RotateCw className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Rot +90°</span>
            </button>
          </div>

          <button
            onClick={onReverseOrder}
            className="px-2.5 py-1.5 bg-white dark:bg-slate-900 neo-border neo-btn text-black dark:text-white flex items-center gap-1.5 text-xs font-black uppercase"
            title="Reverse Page Order"
          >
            <ArrowUpDown className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">Reverse</span>
          </button>

          {selectedCount > 0 ? (
            <button
              onClick={onDeleteSelected}
              className="px-3 py-1.5 bg-black text-white dark:bg-white dark:text-black neo-border neo-btn flex items-center gap-1.5 text-xs font-black uppercase"
            >
              <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Delete ({selectedCount})</span>
            </button>
          ) : (
            <button
              onClick={onClearAll}
              className="px-2.5 py-1.5 bg-white dark:bg-slate-900 neo-border neo-btn text-black dark:text-white hover:bg-red-500 hover:text-white flex items-center gap-1.5 text-xs font-black uppercase"
              title="Clear all pages"
            >
              <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Clear All</span>
            </button>
          )}
        </div>

        {/* Right side: Auto-Scaler & Export Action */}
        <div className="flex items-center gap-2.5">
          {/* Auto Scaler Control */}
          <div className="flex items-center bg-white dark:bg-slate-900 neo-border p-1 gap-1 text-xs">
            <span className="flex items-center gap-1 px-1.5 text-black dark:text-white font-black uppercase text-[11px]">
              <SlidersHorizontal className="w-3 h-3 text-blue-600 stroke-[2.5]" />
              <span className="hidden lg:inline">Scaler:</span>
            </span>
            <button
              onClick={() => onScaleModeChange('fit_a4')}
              className={`px-2 py-0.5 font-black uppercase text-[11px] transition-all ${
                scaleMode === 'fit_a4'
                  ? 'bg-blue-600 text-white neo-border'
                  : 'text-black dark:text-white hover:bg-blue-50 dark:hover:bg-slate-800'
              }`}
              title="Scale and align all images and pages to standard A4"
            >
              Align A4
            </button>
            <button
              onClick={() => onScaleModeChange('fit_first_page')}
              className={`px-2 py-0.5 font-black uppercase text-[11px] transition-all ${
                scaleMode === 'fit_first_page'
                  ? 'bg-blue-600 text-white neo-border'
                  : 'text-black dark:text-white hover:bg-blue-50 dark:hover:bg-slate-800'
              }`}
              title="Align all pages and images to the dimensions of the first page"
            >
              Match 1st
            </button>
            <button
              onClick={() => onScaleModeChange('original')}
              className={`px-2 py-0.5 font-black uppercase text-[11px] transition-all ${
                scaleMode === 'original'
                  ? 'bg-blue-600 text-white neo-border'
                  : 'text-black dark:text-white hover:bg-blue-50 dark:hover:bg-slate-800'
              }`}
              title="Keep raw original pixel dimensions"
            >
              Original
            </button>
          </div>

          <button
            onClick={onExport}
            disabled={isExporting || totalPages === 0}
            className="px-5 py-2 neo-border-3 neo-btn bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{exportProgress.text || 'Exporting...'}</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Export PDF</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
