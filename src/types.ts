export type PageSourceType = 'pdf' | 'image';

export type PageScaleMode = 'fit_a4' | 'fit_first_page' | 'original';

export interface PageAnnotation {
  id: string;
  type: 'text' | 'drawing' | 'highlight' | 'rectangle';
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  fontSize?: number;
  color: string;
  strokeWidth?: number;
  points?: { x: number; y: number }[];
  fill?: boolean;
}

export interface PDFPageItem {
  id: string;
  sourceFileId: string;
  sourceFileName: string;
  sourceType: PageSourceType;
  sourcePageIndex: number;
  rotation: number;
  thumbnailUrl: string;
  width: number;
  height: number;
  annotations: PageAnnotation[];
  isEdited?: boolean;
}

export interface LoadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  pageCount: number;
  pdfBytes?: Uint8Array;
  imageBlob?: Blob;
}
