import React, { useRef, useState, useEffect } from 'react';
import {
  RotateCcw,
  RotateCw,
  Trash2,
  Undo2,
  Check,
  X,
  Palette,
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
  const [color, setColor] = useState<string>('#2563eb'); // Bold Blue default
  const [strokeWidth, setStrokeWidth] = useState<number>(4);
  const [fontSize, setFontSize] = useState<number>(20);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Crop selection state
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
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fillRect(0, 0, canvas.width, cropY);
        ctx.fillRect(0, cropY + cropH, canvas.width, canvas.height - (cropY + cropH));
        ctx.fillRect(0, cropY, cropX, cropH);
        ctx.fillRect(cropX + cropW, cropY, canvas.width - (cropX + cropW), cropH);

        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 4]);
        ctx.strokeRect(cropX, cropY, cropW, cropH);

        ctx.setLineDash([]);
        ctx.fillStyle = '#2563eb';
        const handleSize = 10;
        ctx.fillRect(cropX - 5, cropY - 5, handleSize, handleSize);
        ctx.fillRect(cropX + cropW - 5, cropY - 5, handleSize, handleSize);
        ctx.fillRect(cropX - 5, cropY + cropH - 5, handleSize, handleSize);
        ctx.fillRect(cropX + cropW - 5, cropY + cropH - 5, handleSize, handleSize);
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
      ctx.font = `bold ${(ann.fontSize || 18) * (w / 600)}px 'Space Grotesk', sans-serif`;
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
        color: tool === 'highlight' && color === '#2563eb' ? '#facc15' : color,
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

  // Neobrutalist primary palette: blues, black, white, and essential accents
  const colorPalette = [
    '#2563eb', // Royal Blue
    '#0284c7', // Sky Blue
    '#000000', // Black
    '#ffffff', // White
    '#dc2626', // Red
    '#eab308', // Yellow
    '#16a34a', // Green
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-hidden animate-in fade-in duration-100">
      <div className="bg-white dark:bg-black neo-border-3 neo-shadow-lg flex flex-col w-full max-w-5xl h-[92vh] overflow-hidden text-black dark:text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b-3 border-black dark:border-white bg-blue-50 dark:bg-slate-900">
          <div className="flex items-center space-x-3">
            <span className="px-2.5 py-1 text-xs font-black uppercase neo-border bg-blue-600 text-white">
              Page {pageNumber} of {totalPages}
            </span>
            <h2 className="text-base font-black uppercase tracking-tight truncate max-w-md">
              {page.sourceFileName}
            </h2>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={rotateCounterClockwise}
              className="px-2.5 py-1.5 neo-border neo-btn bg-white dark:bg-black text-xs font-black uppercase flex items-center gap-1"
              title="Rotate Left (-90°)"
            >
              <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>-90°</span>
            </button>
            <button
              onClick={rotateClockwise}
              className="px-2.5 py-1.5 neo-border neo-btn bg-white dark:bg-black text-xs font-black uppercase flex items-center gap-1"
              title="Rotate Right (+90°)"
            >
              <RotateCw className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>+90°</span>
            </button>
            <div className="h-6 w-[2px] bg-black dark:bg-white mx-1" />
            <button
              onClick={onClose}
              className="p-1.5 neo-border neo-btn bg-white dark:bg-black hover:bg-black hover:text-white"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 border-b-3 border-black dark:border-white bg-white dark:bg-black text-sm">
          {/* Tool selectors */}
          <div className="flex items-center gap-1 neo-border p-1 bg-slate-100 dark:bg-slate-900">
            <button
              onClick={() => {
                setTool('draw');
                setCropBox(null);
              }}
              className={`px-3 py-1 font-black uppercase text-xs transition-all ${
                tool === 'draw'
                  ? 'bg-blue-600 text-white neo-border'
                  : 'text-black dark:text-white hover:bg-blue-50 dark:hover:bg-slate-800'
              }`}
            >
              Draw
            </button>

            <button
              onClick={() => {
                setTool('crop');
              }}
              className={`px-3 py-1 font-black uppercase text-xs transition-all ${
                tool === 'crop'
                  ? 'bg-blue-600 text-white neo-border'
                  : 'text-black dark:text-white hover:bg-blue-50 dark:hover:bg-slate-800'
              }`}
            >
              Crop
            </button>

            <button
              onClick={() => {
                setTool('highlight');
                setCropBox(null);
              }}
              className={`px-3 py-1 font-black uppercase text-xs transition-all ${
                tool === 'highlight'
                  ? 'bg-blue-600 text-white neo-border'
                  : 'text-black dark:text-white hover:bg-blue-50 dark:hover:bg-slate-800'
              }`}
            >
              Highlight
            </button>

            <button
              onClick={() => {
                setTool('rect');
                setCropBox(null);
              }}
              className={`px-3 py-1 font-black uppercase text-xs transition-all ${
                tool === 'rect'
                  ? 'bg-blue-600 text-white neo-border'
                  : 'text-black dark:text-white hover:bg-blue-50 dark:hover:bg-slate-800'
              }`}
            >
              Box
            </button>

            <button
              onClick={() => {
                setTool('text');
                setCropBox(null);
              }}
              className={`px-3 py-1 font-black uppercase text-xs transition-all ${
                tool === 'text'
                  ? 'bg-blue-600 text-white neo-border'
                  : 'text-black dark:text-white hover:bg-blue-50 dark:hover:bg-slate-800'
              }`}
            >
              Text
            </button>
          </div>

          {/* Tool specific options */}
          {tool === 'crop' ? (
            <div className="flex items-center gap-3">
              <span className="text-xs font-black uppercase text-blue-600 dark:text-blue-400">
                {cropBox ? 'Zone Selected' : 'Drag area on page to crop'}
              </span>
              <button
                onClick={applyCrop}
                disabled={!cropBox}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-black text-xs uppercase neo-border neo-btn flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>Confirm Crop</span>
              </button>
              {cropBox && (
                <button
                  onClick={() => setCropBox(null)}
                  className="px-2.5 py-1 text-xs font-bold uppercase neo-border bg-white dark:bg-black"
                >
                  Cancel
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Color Palette */}
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 stroke-[2.5]" />
                <div className="flex items-center gap-1 neo-border bg-white dark:bg-slate-900 px-2 py-1">
                  {colorPalette.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-5 h-5 neo-border transition-transform ${
                        color === c ? 'scale-125 ring-2 ring-blue-600' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Sizing & Undo */}
              <div className="flex items-center gap-2">
                {tool !== 'text' ? (
                  <div className="flex items-center gap-2 text-xs font-bold uppercase">
                    <span>Size</span>
                    <input
                      type="range"
                      min="1"
                      max="18"
                      value={strokeWidth}
                      onChange={(e) => setStrokeWidth(Number(e.target.value))}
                      className="w-20 accent-blue-600 cursor-pointer"
                    />
                    <span className="w-4 font-mono">{strokeWidth}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-bold uppercase">
                    <span>Font</span>
                    <input
                      type="range"
                      min="12"
                      max="48"
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="w-20 accent-blue-600 cursor-pointer"
                    />
                    <span className="w-4 font-mono">{fontSize}</span>
                  </div>
                )}

                <div className="h-5 w-[2px] bg-black dark:bg-white mx-1" />

                <button
                  onClick={handleUndo}
                  disabled={annotations.length === 0}
                  className="p-1.5 neo-border neo-btn bg-white dark:bg-slate-900 disabled:opacity-30"
                  title="Undo"
                >
                  <Undo2 className="w-4 h-4 stroke-[2.5]" />
                </button>

                <button
                  onClick={handleClearAll}
                  disabled={annotations.length === 0}
                  className="p-1.5 neo-border neo-btn bg-white dark:bg-slate-900 hover:bg-black hover:text-white disabled:opacity-30"
                  title="Clear All Annotations"
                >
                  <Trash2 className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Canvas Workspace */}
        <div
          ref={containerRef}
          className="flex-1 bg-slate-200 dark:bg-slate-950 overflow-auto flex items-center justify-center p-6 relative select-none"
        >
          <div
            className="relative neo-border-3 neo-shadow-lg overflow-hidden bg-white transition-transform duration-150"
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
                tool === 'text' ? 'cursor-text' : 'cursor-crosshair'
              }`}
            />

            {textInputPos && (
              <div
                className="absolute z-30 p-2 bg-white dark:bg-black neo-border-3 neo-shadow flex items-center gap-2 text-sm"
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
                  className="bg-slate-100 dark:bg-slate-900 text-black dark:text-white px-2 py-1 neo-border outline-none w-48 text-xs font-bold"
                />
                <button
                  onClick={handleAddText}
                  className="p-1 bg-blue-600 text-white neo-border"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                </button>
                <button
                  onClick={() => setTextInputPos(null)}
                  className="p-1 bg-white text-black neo-border"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t-3 border-black dark:border-white bg-blue-50 dark:bg-slate-900">
          <p className="text-xs font-black uppercase text-black dark:text-white">
            {annotations.length > 0 ? `${annotations.length} annotation(s)` : 'No annotations'}
            {hasCropped && ' • Cropped'} • Rotation: {rotation}°
          </p>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-black uppercase neo-border neo-btn bg-white dark:bg-black"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAndClose}
              className="px-6 py-2 text-xs font-black uppercase neo-border-3 neo-shadow bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Apply Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
