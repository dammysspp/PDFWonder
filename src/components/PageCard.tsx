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
      className={`group relative flex flex-col bg-white dark:bg-black neo-border-3 p-3 transition-all duration-150 select-none cursor-pointer ${
        isSelected
          ? 'bg-blue-50 dark:bg-blue-950/50 neo-shadow-lg -translate-x-1 -translate-y-1'
          : 'neo-shadow hover:-translate-x-0.5 hover:-translate-y-0.5'
      } ${isDragging ? 'opacity-30 scale-95' : 'opacity-100'} ${
        isDragOver ? 'bg-blue-200 dark:bg-blue-900 ring-4 ring-blue-600 scale-102' : ''
      }`}
    >
      {/* Top Header: Badge, Drag Handle & Quick Actions */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="flex items-center justify-center w-6 h-6 neo-border bg-blue-600 text-white text-xs font-black">
            {index + 1}
          </span>
          <div className="cursor-grab active:cursor-grabbing text-black dark:text-white p-0.5" title="Drag to reorder">
            <GripVertical className="w-4 h-4 stroke-[2.5]" />
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {page.annotations && page.annotations.length > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-black uppercase bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 neo-border">
              Edited
            </span>
          )}
          {page.sourceType === 'image' ? (
            <span title="Image Page" className="text-black dark:text-white">
              <ImageIcon className="w-3.5 h-3.5" />
            </span>
          ) : (
            <span title="PDF Page" className="text-black dark:text-white">
              <FileText className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
      </div>

      {/* Page Preview Thumbnail */}
      <div className="relative aspect-[3/4] w-full bg-slate-100 dark:bg-slate-900 neo-border overflow-hidden flex items-center justify-center group/thumb">
        <div
          className="w-full h-full flex items-center justify-center transition-transform duration-150"
          style={{ transform: `rotate(${page.rotation}deg)` }}
        >
          <img
            src={page.thumbnailUrl}
            alt={`Page ${index + 1}`}
            className="max-w-full max-h-full object-contain pointer-events-none"
            loading="lazy"
          />
        </div>

        {/* Hover overlay with Edit action */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(page);
            }}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wide neo-border neo-shadow-sm flex items-center gap-1.5 transition-transform hover:scale-105"
          >
            <Edit3 className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Annotate / Crop</span>
          </button>
        </div>

        {/* Rotation indicator badge if rotated */}
        {page.rotation !== 0 && (
          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 text-[10px] font-black bg-blue-600 text-white neo-border">
            {page.rotation}°
          </span>
        )}
      </div>

      {/* File Info */}
      <div className="mt-2.5 px-0.5">
        <p className="text-xs font-bold text-black dark:text-white truncate" title={page.sourceFileName}>
          {page.sourceFileName}
        </p>
      </div>

      {/* Bottom Action Bar */}
      <div className="mt-2 pt-2 border-t-2 border-black dark:border-white flex items-center justify-between text-black dark:text-white">
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRotate(page.id, -90);
            }}
            className="p-1.5 neo-border bg-white dark:bg-slate-900 hover:bg-blue-100 dark:hover:bg-blue-900 neo-btn"
            title="Rotate Left (-90°)"
          >
            <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRotate(page.id, 90);
            }}
            className="p-1.5 neo-border bg-white dark:bg-slate-900 hover:bg-blue-100 dark:hover:bg-blue-900 neo-btn"
            title="Rotate Right (+90°)"
          >
            <RotateCw className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate(page.id);
            }}
            className="p-1.5 neo-border bg-white dark:bg-slate-900 hover:bg-blue-100 dark:hover:bg-blue-900 neo-btn"
            title="Duplicate Page"
          >
            <Copy className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(page.id);
            }}
            className="p-1.5 neo-border bg-white dark:bg-slate-900 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black neo-btn"
            title="Delete Page"
          >
            <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};
