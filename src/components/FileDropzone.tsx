import React, { useRef, useState } from 'react';
import { UploadCloud, FileUp, Image as ImageIcon, Sparkles } from 'lucide-react';

interface FileDropzoneProps {
  onFilesAdded: (files: File[]) => void;
  isLoading: boolean;
  compact?: boolean;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  onFilesAdded,
  isLoading,
  compact = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).filter(
        (file) =>
          file.type === 'application/pdf' ||
          file.type.startsWith('image/') ||
          file.name.toLowerCase().endsWith('.pdf')
      );
      if (files.length > 0) {
        onFilesAdded(files);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesAdded(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  if (compact) {
    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`flex items-center justify-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl border border-dashed cursor-pointer transition-all ${
          isDragOver
            ? 'border-rose-400 bg-rose-500/10 text-rose-500 dark:text-rose-300'
            : 'border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:border-slate-400 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300 shadow-sm'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,image/png,image/jpeg,image/webp,image/jpg"
          className="hidden"
          onChange={handleFileInputChange}
          disabled={isLoading}
        />
        <FileUp className="w-4 h-4 text-rose-500" />
        <span className="text-xs sm:text-sm font-semibold">Add PDFs / Images</span>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`relative w-full max-w-3xl mx-auto rounded-3xl border-2 border-dashed p-10 md:p-16 text-center cursor-pointer transition-all duration-300 shadow-sm ${
        isDragOver
          ? 'border-rose-500 bg-rose-500/10 scale-102 shadow-2xl shadow-rose-500/20 ring-4 ring-rose-500/20'
          : 'border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 bg-white/70 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-900/70'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,image/png,image/jpeg,image/webp,image/jpg"
        className="hidden"
        onChange={handleFileInputChange}
        disabled={isLoading}
      />

      <div className="flex flex-col items-center justify-center space-y-4">
        {/* Glow icon */}
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-500/30">
            <UploadCloud className="w-10 h-10 text-white" />
          </div>
          <div className="absolute -top-1 -right-1 bg-amber-400 p-1.5 rounded-full shadow-md text-slate-950">
            <Sparkles className="w-3.5 h-3.5 fill-current" />
          </div>
        </div>

        <div className="space-y-1.5">
          <h3 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Drop your PDFs and Images here
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md">
            Merge multiple PDFs, mix with PNG, JPG or WEBP images, rotate or edit individual pages, and rearrange with ease.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            className="px-6 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 shadow-lg shadow-rose-500/25 transition-all transform hover:scale-105 active:scale-95 text-sm"
          >
            Select Files from Computer
          </button>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-3">
          <span className="flex items-center gap-1">
            <FileUp className="w-3.5 h-3.5" /> PDF Documents
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <ImageIcon className="w-3.5 h-3.5" /> JPG, PNG, WEBP
          </span>
          <span>•</span>
          <span>100% Private (Runs locally in browser)</span>
        </div>
      </div>
    </div>
  );
};
