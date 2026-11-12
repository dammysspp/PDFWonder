import React, { useRef, useState, useEffect } from 'react';
import {
  RotateCcw,
  RotateCw,
  Trash2,
  Pencil,
  Type,
  Square,
  Highlighter,
  Undo2,
  Check,
  X,
  Palette,
  Crop,
  CheckCircle2
} from 'lucide-react';
import type { PDFPageItem, PageAnnotation } from '../types';

interface PageEditorModalProps {
  page: PDFPageItem;
  pageNumber: number;
  totalPages: number;
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    updatedAnnotations: PageAnnotation[],
    rotation: number,
    newThumbnailUrl?: string,
    newDimensions?: { width: number; height: number }
  ) => void;
}

type ToolMode = 'draw' | 'text' | 'rect' | 'highlight' | 'crop';

export const PageEditorModal: React.FC<PageEditorModalProps> = ({
  page,
  pageNumber,
  totalPages,
  isOpen,
  onClose,
  onSave,
}) => {
  const [currentImageSrc, setCurrentImageSrc] = useState<string>(page.thumbnailUrl);
  const [annotations, setAnnotations] = useState<PageAnnotation[]>(page.annotations || []);
  const [rotation, setRotation] = useState<number>(page.rotation || 0);
  const [tool, setTool] = useState<ToolMode>('draw');
  const [color, setColor] = useState<string>('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState<number>(4);
  const [fontSize, setFontSize] = useState<number>(20);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Crop selection state (normalized 0 to 1 coordinates)
  const [cropBox, setCropBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [hasCropped, setHasCropped] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number }>({
    width: page.width,
    height: page.height,
  });

  // Text input state
  const [textInputPos, setTextInputPos] = useState<{ x: number; y: number } | null>(null);
  const [textInputValue, setTextInputValue] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentImageSrc(page.thumbnailUrl);
      setAnnotations(page.annotations || []);
      setRotation(page.rotation || 0);
      setTextInputPos(null);
      setTextInputValue('');
      setCropBox(null);
      setHasCropped(false);
      setImageDimensions({ width: page.width, height: page.height });
    }
  }, [isOpen, page]);

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = img.naturalWidth || 800;
      canvas.height = img.naturalHeight || 1100;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      for (const ann of annotations) {
        drawAnnotation(ctx, ann, canvas.width, canvas.height);
      }

      if (isDrawing && tool === 'draw' && currentPoints.length > 1) {
        ctx.strokeStyle = color;
        ctx.lineWidth = strokeWidth * (canvas.width / 600);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(currentPoints[0].x * canvas.width, currentPoints[0].y * canvas.height);
        for (let i = 1; i < currentPoints.length; i++) {
          ctx.lineTo(currentPoints[i].x * canvas.width, currentPoints[i].y * canvas.height);
        }
        ctx.stroke();
      }

      if (isDrawing && (tool === 'rect' || tool === 'highlight') && currentRect) {
        if (tool === 'highlight') {
          ctx.save();
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.4;
          ctx.fillRect(
            currentRect.x * canvas.width,
            currentRect.y * canvas.height,
            currentRect.w * canvas.width,
            currentRect.h * canvas.height
          );
          ctx.restore();
        } else {
          ctx.strokeStyle = color;
          ctx.lineWidth = strokeWidth * (canvas.width / 600);
          ctx.strokeRect(
            currentRect.x * canvas.width,
            currentRect.y * canvas.height,
            currentRect.w * canvas.width,
            currentRect.h * canvas.height
          );
        }
      }

      // Crop box preview overlay
      const activeCrop = isDrawing && tool === 'crop' ? currentRect : cropBox;
      if (activeCrop && activeCrop.w > 0.005 && activeCrop.h > 0.005) {
        const cropX = activeCrop.x * canvas.width;
        const cropY = activeCrop.y * canvas.height;
        const cropW = activeCrop.w * canvas.width;
        const cropH = activeCrop.h * canvas.height;

        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(0, 0, canvas.width, cropY);
        ctx.fillRect(0, cropY + cropH, canvas.width, canvas.height - (cropY + cropH));
        ctx.fillRect(0, cropY, cropX, cropH);
        ctx.fillRect(cropX + cropW, cropY, canvas.width - (cropX + cropW), cropH);

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(cropX, cropY, cropW, cropH);

        ctx.setLineDash([]);
        ctx.fillStyle = '#38bdf8';
        const handleSize = 8;
        ctx.fillRect(cropX - 4, cropY - 4, handleSize, handleSize);
        ctx.fillRect(cropX + cropW - 4, cropY - 4, handleSize, handleSize);
        ctx.fillRect(cropX - 4, cropY + cropH - 4, handleSize, handleSize);
        ctx.fillRect(cropX + cropW - 4, cropY + cropH - 4, handleSize, handleSize);
        ctx.restore();
      }
    };
    img.src = currentImageSrc;
  }, [isOpen, currentImageSrc, annotations, isDrawing, currentPoints, currentRect, cropBox, color, strokeWidth, tool]);

  const drawAnnotation = (ctx: CanvasRenderingContext2D, ann: PageAnnotation, w: number, h: number) => {
    if (ann.type === 'drawing' && ann.points && ann.points.length > 0) {
      ctx.strokeStyle = ann.color;
      ctx.lineWidth = (ann.strokeWidth || 3) * (w / 600);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(ann.points[0].x * w, ann.points[0].y * h);
      for (let i = 1; i < ann.points.length; i++) {
        ctx.lineTo(ann.points[i].x * w, ann.points[i].y * h);
      }
      ctx.stroke();
    } else if (ann.type === 'highlight' && ann.width && ann.height) {
      ctx.save();
      ctx.fillStyle = ann.color;
      ctx.globalAlpha = 0.4;
      ctx.fillRect(ann.x * w, ann.y * h, ann.width * w, ann.height * h);
      ctx.restore();
    } else if (ann.type === 'rectangle' && ann.width && ann.height) {
      ctx.strokeStyle = ann.color;
      ctx.lineWidth = (ann.strokeWidth || 3) * (w / 600);
      ctx.strokeRect(ann.x * w, ann.y * h, ann.width * w, ann.height * h);
    } else if (ann.type === 'text' && ann.text) {
      ctx.font = `${(ann.fontSize || 18) * (w / 600)}px sans-serif`;
      ctx.fillStyle = ann.color;
      ctx.fillText(ann.text, ann.x * w, ann.y * h + (ann.fontSize || 18) * (w / 600));
    }
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);

    if (tool === 'text') {
      setTextInputPos(coords);
      return;
    }

    setIsDrawing(true);
    setStartPoint(coords);

    if (tool === 'draw') {
      setCurrentPoints([coords]);
    } else if (tool === 'rect' || tool === 'highlight' || tool === 'crop') {
      setCurrentRect({ x: coords.x, y: coords.y, w: 0, h: 0 });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const coords = getCanvasCoords(e);

    if (tool === 'draw') {
      setCurrentPoints((prev) => [...prev, coords]);
    } else if ((tool === 'rect' || tool === 'highlight' || tool === 'crop') && startPoint) {
      const minX = Math.min(startPoint.x, coords.x);
      const minY = Math.min(startPoint.y, coords.y);
      const w = Math.abs(coords.x - startPoint.x);
      const h = Math.abs(coords.y - startPoint.y);
      setCurrentRect({ x: minX, y: minY, w, h });
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (tool === 'draw' && currentPoints.length > 1) {
      const newAnn: PageAnnotation = {
        id: 'ann_' + Date.now() + Math.random().toString(36).substring(2, 5),
        type: 'drawing',
        x: 0,
        y: 0,
        points: currentPoints,
        color,
        strokeWidth,
      };
      setAnnotations((prev) => [...prev, newAnn]);
      setCurrentPoints([]);
    } else if ((tool === 'rect' || tool === 'highlight') && currentRect && currentRect.w > 0.01 && currentRect.h > 0.01) {
      const newAnn: PageAnnotation = {
        id: 'ann_' + Date.now() + Math.random().toString(36).substring(2, 5),
        type: tool === 'highlight' ? 'highlight' : 'rectangle',
        x: currentRect.x,
        y: currentRect.y,
        width: currentRect.w,
        height: currentRect.h,
        color: tool === 'highlight' && color === '#ef4444' ? '#facc15' : color,
        strokeWidth,
      };
      setAnnotations((prev) => [...prev, newAnn]);
      setCurrentRect(null);
    } else if (tool === 'crop' && currentRect && currentRect.w > 0.02 && currentRect.h > 0.02) {
      setCropBox(currentRect);
      setCurrentRect(null);
    }
    setStartPoint(null);
  };

  const applyCrop = () => {
    if (!cropBox) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const cropPxX = Math.floor(cropBox.x * img.naturalWidth);
      const cropPxY = Math.floor(cropBox.y * img.naturalHeight);
      const cropPxW = Math.max(10, Math.floor(cropBox.w * img.naturalWidth));
      const cropPxH = Math.max(10, Math.floor(cropBox.h * img.naturalHeight));

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = cropPxW;
      tempCanvas.height = cropPxH;
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, cropPxX, cropPxY, cropPxW, cropPxH, 0, 0, cropPxW, cropPxH);

      const adjustedAnnotations = annotations
        .filter((ann) => {
          if (ann.type === 'drawing' && ann.points) {
            return ann.points.some(
              (p) => p.x >= cropBox.x && p.x <= cropBox.x + cropBox.w && p.y >= cropBox.y && p.y <= cropBox.y + cropBox.h
            );
          }
          return ann.x >= cropBox.x && ann.x <= cropBox.x + cropBox.w && ann.y >= cropBox.y && ann.y <= cropBox.y + cropBox.h;
        })
        .map((ann) => {
          if (ann.type === 'drawing' && ann.points) {
            return {
              ...ann,
              points: ann.points.map((p) => ({
                x: (p.x - cropBox.x) / cropBox.w,
                y: (p.y - cropBox.y) / cropBox.h,
              })),
            };
          }
          return {
            ...ann,
            x: (ann.x - cropBox.x) / cropBox.w,
            y: (ann.y - cropBox.y) / cropBox.h,
            width: ann.width ? ann.width / cropBox.w : undefined,
            height: ann.height ? ann.height / cropBox.h : undefined,
          };
        });

      const croppedDataUrl = tempCanvas.toDataURL('image/jpeg', 0.94);
      setCurrentImageSrc(croppedDataUrl);
      setAnnotations(adjustedAnnotations);
      setCropBox(null);
      setHasCropped(true);
      setImageDimensions({
        width: Math.round(page.width * cropBox.w),
        height: Math.round(page.height * cropBox.h),
      });
      setTool('draw');
    };
    img.src = currentImageSrc;
  };

  const handleAddText = () => {
    if (!textInputPos || !textInputValue.trim()) {
      setTextInputPos(null);
      setTextInputValue('');
      return;
    }

    const newAnn: PageAnnotation = {
      id: 'ann_' + Date.now() + Math.random().toString(36).substring(2, 5),
      type: 'text',
      x: textInputPos.x,
      y: textInputPos.y,
      text: textInputValue,
      color,
      fontSize,
    };

    setAnnotations((prev) => [...prev, newAnn]);
    setTextInputPos(null);
    setTextInputValue('');
  };

  const handleUndo = () => {
    setAnnotations((prev) => prev.slice(0, prev.length - 1));
  };

  const handleClearAll = () => {
    if (window.confirm('Clear all drawings and annotations on this page?')) {
      setAnnotations([]);
    }
  };

  const rotateClockwise = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const rotateCounterClockwise = () => {
    setRotation((prev) => (prev - 90 + 360) % 360);
  };

  const handleSaveAndClose = () => {
    onSave(
      annotations,
      rotation,
      hasCropped ? currentImageSrc : undefined,
      hasCropped ? imageDimensions : undefined
    );
    onClose();
  };

  if (!isOpen) return null;

  const colorPalette = [
    '#ef4444',
    '#f97316',
    '#facc15',
    '#22c55e',
    '#06b6d4',
    '#3b82f6',
    '#8b5cf6',
    '#ec4899',
    '#000000',
    '#ffffff',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-hidden animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col w-full max-w-5xl h-[92vh] overflow-hidden text-slate-800 dark:text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
              Page {pageNumber} of {totalPages}
            </span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate max-w-md">
              {page.sourceFileName}
            </h2>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={rotateCounterClockwise}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
              title="Rotate Left (90°)"
            >
              <RotateCcw className="w-4 h-4" />
              <span>-90°</span>
            </button>
            <button
              onClick={rotateClockwise}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
              title="Rotate Right (90°)"
            >
              <RotateCw className="w-4 h-4" />
              <span>+90°</span>
            </button>
            <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1" />
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/90 text-sm">
          {/* Tool selectors */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-950/80 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <button
              onClick={() => {
                setTool('draw');
                setCropBox(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                tool === 'draw'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Pencil className="w-4 h-4" />
              <span>Draw</span>
            </button>

            <button
              onClick={() => {
                setTool('crop');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                tool === 'crop'
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Crop className="w-4 h-4" />
              <span>Crop</span>
            </button>

            <button
              onClick={() => {
                setTool('highlight');
                setCropBox(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                tool === 'highlight'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Highlighter className="w-4 h-4" />
              <span>Highlight</span>
            </button>

            <button
              onClick={() => {
                setTool('rect');
                setCropBox(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                tool === 'rect'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Square className="w-4 h-4" />
              <span>Box</span>
            </button>

            <button
              onClick={() => {
                setTool('text');
                setCropBox(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                tool === 'text'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Type className="w-4 h-4" />
              <span>Text</span>
            </button>
          </div>

          {/* Tool specific options */}
          {tool === 'crop' ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-sky-600 dark:text-sky-400 font-medium">
                {cropBox ? 'Drag area selected' : 'Click & drag on image to choose crop zone'}
              </span>
              <button
                onClick={applyCrop}
                disabled={!cropBox}
                className="px-3.5 py-1.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-40 disabled:hover:bg-sky-500 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Apply Crop</span>
              </button>
              {cropBox && (
                <button
                  onClick={() => setCropBox(null)}
                  className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancel Selection
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Color Palette */}
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-slate-400" />
                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-950/80 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  {colorPalette.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-5 h-5 rounded-full border transition-transform ${
                        color === c ? 'scale-125 border-white shadow-xs ring-2 ring-rose-500/50' : 'border-slate-300 dark:border-slate-700 hover:scale-110'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Sizing & Undo */}
              <div className="flex items-center gap-2">
                {tool !== 'text' ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>Thickness</span>
                    <input
                      type="range"
                      min="1"
                      max="16"
                      value={strokeWidth}
                      onChange={(e) => setStrokeWidth(Number(e.target.value))}
                      className="w-20 accent-rose-500 cursor-pointer"
                    />
                    <span className="w-4 text-right font-mono text-slate-700 dark:text-slate-300">{strokeWidth}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>Font</span>
                    <input
                      type="range"
                      min="12"
                      max="48"
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="w-20 accent-rose-500 cursor-pointer"
                    />
                    <span className="w-4 text-right font-mono text-slate-700 dark:text-slate-300">{fontSize}px</span>
                  </div>
                )}

                <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1" />

                <button
                  onClick={handleUndo}
                  disabled={annotations.length === 0}
                  className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-colors"
                  title="Undo"
                >
                  <Undo2 className="w-4 h-4" />
                </button>

                <button
                  onClick={handleClearAll}
                  disabled={annotations.length === 0}
                  className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-colors"
                  title="Clear All Annotations"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Canvas Workspace */}
        <div
          ref={containerRef}
          className="flex-1 bg-slate-100 dark:bg-slate-950 overflow-auto flex items-center justify-center p-6 relative select-none"
        >
          <div
            className="relative shadow-2xl rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700/60 transition-transform duration-200 bg-white"
            style={{
              transform: `rotate(${rotation}deg)`,
              maxWidth: '90%',
              maxHeight: '90%',
            }}
          >
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className={`max-w-full max-h-[72vh] block object-contain ${
                tool === 'text' ? 'cursor-text' : tool === 'crop' ? 'cursor-crosshair' : 'cursor-crosshair'
              }`}
            />

            {textInputPos && (
              <div
                className="absolute z-30 p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg shadow-xl flex items-center gap-2 text-sm"
                style={{
                  left: `${textInputPos.x * 100}%`,
                  top: `${textInputPos.y * 100}%`,
                  transform: 'translate(-10%, -50%)',
                }}
              >
                <input
                  type="text"
                  autoFocus
                  placeholder="Enter text..."
                  value={textInputValue}
                  onChange={(e) => setTextInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddText();
                    if (e.key === 'Escape') setTextInputPos(null);
                  }}
                  className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 outline-none focus:border-rose-500 w-48 text-sm"
                />
                <button
                  onClick={handleAddText}
                  className="p-1 bg-rose-500 hover:bg-rose-600 text-white rounded"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setTextInputPos(null)}
                  className="p-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {annotations.length > 0 ? `${annotations.length} annotation(s)` : 'No annotations'}
            {hasCropped && ' • Cropped'} • Rotation: {rotation}°
          </p>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAndClose}
              className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 rounded-xl shadow-md shadow-rose-500/25 transition-all flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Apply Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
