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
        className={`flex items-center justify-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-none neo-border font-bold text-xs sm:text-sm cursor-pointer transition-all neo-btn ${
          isDragOver
            ? 'bg-blue-200 dark:bg-blue-900 translate-x-1 translate-y-1'
            : 'bg-white dark:bg-black text-black dark:text-white hover:bg-blue-50 dark:hover:bg-slate-900'
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
        <FileUp className="w-4 h-4 text-blue-600 dark:text-blue-400 stroke-[2.5]" />
        <span>+ Add PDFs / Images</span>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`relative w-full max-w-3xl mx-auto neo-border-3 neo-shadow-lg p-10 md:p-14 text-center cursor-pointer transition-all duration-150 ${
        isDragOver
          ? 'bg-blue-100 dark:bg-blue-950/60 translate-x-1 translate-y-1'
          : 'bg-white dark:bg-black hover:bg-blue-50/50 dark:hover:bg-slate-900/40'
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
        {/* Neobrutalist Icon badge */}
        <div className="relative">
          <div className="w-20 h-20 bg-blue-600 text-white neo-border-3 neo-shadow flex items-center justify-center">
            <UploadCloud className="w-10 h-10 stroke-[2.5]" />
          </div>
          <div className="absolute -top-2 -right-2 bg-white text-black neo-border p-1 neo-shadow-sm font-black">
            <Sparkles className="w-4 h-4 text-blue-600 fill-current" />
          </div>
        </div>

        <div className="space-y-1.5">
          <h3 className="text-2xl md:text-3xl font-black text-black dark:text-white tracking-tight uppercase">
            Drop your PDFs and Images here
          </h3>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 max-w-md">
            Merge multiple PDFs, mix with PNG, JPG or WEBP images, rotate, crop or annotate, and rearrange with zero hassle.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            className="px-7 py-3 neo-border-3 neo-shadow bg-blue-600 hover:bg-blue-700 text-white font-black text-sm uppercase tracking-wider transition-all transform hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1"
          >
            Select Files From Device
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-black dark:text-white pt-3">
          <span className="flex items-center gap-1.5 bg-blue-100 dark:bg-blue-950/80 px-2.5 py-1 neo-border">
            <FileUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> PDF Documents
          </span>
          <span className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2.5 py-1 neo-border">
            <ImageIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> JPG, PNG, WEBP
          </span>
          <span className="bg-black text-white dark:bg-white dark:text-black px-2.5 py-1 font-black uppercase text-[11px]">
            100% Client-Side & Private
          </span>
        </div>
      </div>
    </div>
  );
};
