import React from 'react';
import {
  RotateCw,
  RotateCcw,
  Trash2,
  Edit3,
  GripVertical,
  Copy,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import type { PDFPageItem } from '../types';

interface PageCardProps {
  page: PDFPageItem;
  index: number;
  isSelected: boolean;
  onSelect: (index: number, e: React.MouseEvent) => void;
  onRotate: (id: string, delta: number) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onEdit: (page: PDFPageItem) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  isDragging: boolean;
  isDragOver: boolean;
}

export const PageCard: React.FC<PageCardProps> = ({
  page,
  index,
  isSelected,
  onSelect,
  onRotate,
  onDelete,
  onDuplicate,
  onEdit,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  isDragging,
  isDragOver,
}) => {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      onDrop={(e) => onDrop(e, index)}
      onClick={(e) => onSelect(index, e)}
      className={`group relative flex flex-col bg-white dark:bg-slate-900/90 border rounded-2xl p-3 transition-all duration-200 select-none cursor-pointer shadow-sm ${
        isSelected
          ? 'border-rose-500 ring-2 ring-rose-500/40 shadow-lg shadow-rose-500/10 -translate-y-1'
          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md'
      } ${isDragging ? 'opacity-30 scale-95' : 'opacity-100'} ${
        isDragOver ? 'border-rose-400 bg-rose-500/10 ring-2 ring-rose-400/50 scale-102' : ''
      }`}
    >
      {/* Top Header: Badge, Drag Handle & Quick Actions */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:bg-rose-500 group-hover:text-white transition-colors">
            {index + 1}
          </span>
          <div className="cursor-grab active:cursor-grabbing text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 p-0.5">
            <GripVertical className="w-4 h-4" />
          </div>
        </div>

        <div className="flex items-center gap-1">
          {page.annotations && page.annotations.length > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-pink-500/10 text-pink-600 dark:bg-pink-500/20 dark:text-pink-300 rounded border border-pink-500/30">
              Edited
            </span>
          )}
          {page.sourceType === 'image' ? (
            <span title="Image Page" className="text-slate-400 dark:text-slate-500">
              <ImageIcon className="w-3.5 h-3.5" />
            </span>
          ) : (
            <span title="PDF Page" className="text-slate-400 dark:text-slate-500">
              <FileText className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
      </div>

      {/* Page Preview Thumbnail */}
      <div className="relative aspect-[3/4] w-full bg-slate-100 dark:bg-slate-950/80 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800/80 flex items-center justify-center shadow-inner group/thumb">
        <div
          className="w-full h-full flex items-center justify-center transition-transform duration-200"
          style={{ transform: `rotate(${page.rotation}deg)` }}
        >
          <img
            src={page.thumbnailUrl}
            alt={`Page ${index + 1}`}
            className="max-w-full max-h-full object-contain pointer-events-none drop-shadow-md"
            loading="lazy"
          />
        </div>

        {/* Hover overlay with Edit action */}
        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 backdrop-blur-[2px]">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(page);
            }}
            className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-rose-500/30 transition-transform hover:scale-105 active:scale-95"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Annotate / Edit</span>
          </button>
        </div>

        {/* Rotation indicator badge if rotated */}
        {page.rotation !== 0 && (
          <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-white/90 dark:bg-slate-900/90 text-rose-500 dark:text-rose-400 rounded-md border border-slate-200 dark:border-slate-800 shadow">
            {page.rotation}°
          </span>
        )}
      </div>

      {/* File Info */}
      <div className="mt-2.5 px-1">
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate" title={page.sourceFileName}>
          {page.sourceFileName}
        </p>
      </div>

      {/* Bottom Action Bar */}
      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRotate(page.id, -90);
            }}
            className="p-1.5 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Rotate Left (-90°)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRotate(page.id, 90);
            }}
            className="p-1.5 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Rotate Right (+90°)"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate(page.id);
            }}
            className="p-1.5 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Duplicate Page"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(page.id);
            }}
            className="p-1.5 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
            title="Delete Page"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
