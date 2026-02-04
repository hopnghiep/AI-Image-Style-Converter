
import React, { useState, useRef, useCallback } from 'react';
import type { ThumbnailResult } from '../types';
import JSZip from 'jszip';
import { LoadingSpinner } from './LoadingSpinner';

interface ThumbnailCreatorProps {
  language: 'vi' | 'en';
}

const ThumbnailCreator: React.FC<ThumbnailCreatorProps> = ({ language }) => {
  const [results, setResults] = useState<ThumbnailResult[]>([]);
  const [targetSize, setTargetSize] = useState<number>(300);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resizeImage = (file: File, size: number): Promise<ThumbnailResult> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > size) {
              height *= size / width;
              width = size;
            }
          } else {
            if (height > size) {
              width *= size / height;
              height = size;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);
          }
          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve({
            id: `thumb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            originalName: file.name,
            dataUrl,
            width: Math.round(width),
            height: Math.round(height),
            size: Math.round(dataUrl.length * 0.75) // Rough estimate
          });
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFiles = async (files: File[]) => {
    setIsProcessing(true);
    try {
      const newResults = await Promise.all(
        files.filter(f => f.type.startsWith('image/')).map(file => resizeImage(file, targetSize))
      );
      setResults(prev => [...newResults, ...prev]);
    } catch (err) {
      console.error("Resizing error", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(Array.from(e.target.files));
  };

  const onPaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) handleFiles(files);
  }, [targetSize]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) handleFiles(Array.from(e.dataTransfer.files));
  };

  const handleDownloadZip = async () => {
    if (results.length === 0) return;
    setIsZipping(true);
    try {
      const zip = new JSZip();
      results.forEach(res => {
        const base64Data = res.dataUrl.split(',')[1];
        const nameParts = res.originalName.split('.');
        const ext = nameParts.pop();
        const baseName = nameParts.join('.');
        zip.file(`${baseName}-thumb.jpg`, base64Data, { base64: true });
      });
      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `thumbnails_${Date.now()}.zip`;
      link.click();
    } catch (err) {
      console.error("ZIP failed", err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500" onPaste={onPaste}>
      <section className="bg-white/90 p-8 rounded-[32px] shadow-xl border border-gray-100 flex flex-col items-center">
        <h2 className="text-3xl font-black text-[#4A6B5D] uppercase tracking-tighter mb-2">
          {language === 'vi' ? 'Tạo Thumbnail Đồng Loạt' : 'Bulk Thumbnail Creator'}
        </h2>
        <p className="text-gray-500 font-medium mb-8">
          {language === 'vi' ? 'Giảm kích thước ảnh nhanh chóng để sử dụng trên web' : 'Quickly resize images for web use'}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          <div 
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className={`relative h-64 rounded-3xl border-4 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center p-8 text-center
              ${isDragging ? 'bg-[#4A6B5D]/10 border-[#4A6B5D] scale-[0.98]' : 'bg-gray-50 border-gray-200 hover:border-[#4A6B5D]/50 hover:bg-gray-100'}`}
          >
            <input type="file" ref={fileInputRef} onChange={onFileChange} className="hidden" multiple accept="image/*" />
            <div className="bg-white p-4 rounded-2xl shadow-md mb-4 text-[#4A6B5D]">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <p className="text-lg font-black text-gray-700 uppercase tracking-tighter">
              {language === 'vi' ? 'Thả hình hoặc Dán (Ctrl+V) tại đây' : 'Drop images or Paste (Ctrl+V) here'}
            </p>
            <p className="text-xs text-gray-400 mt-2 font-bold uppercase tracking-widest">
              {language === 'vi' ? 'Hỗ trợ tải lên hàng loạt nhiều hình' : 'Bulk upload supported'}
            </p>
          </div>

          <div className="bg-gray-50 rounded-3xl p-8 flex flex-col justify-center border border-gray-100">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">
              {language === 'vi' ? 'Cấu hình Thumbnail' : 'Thumbnail Configuration'}
            </h3>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-black text-[#4A6B5D] uppercase tracking-wider">{language === 'vi' ? 'Kích thước tối đa' : 'Max Dimension'}</label>
                  <span className="bg-[#4A6B5D] text-white text-xs font-black px-2 py-1 rounded-lg">{targetSize}px</span>
                </div>
                <input 
                  type="range" min="50" max="1200" step="10" value={targetSize} 
                  onChange={(e) => setTargetSize(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#4A6B5D]"
                />
              </div>

              <div className="flex gap-2">
                {[150, 300, 600].map(size => (
                  <button 
                    key={size}
                    onClick={() => setTargetSize(size)}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                      ${targetSize === size ? 'bg-[#4A6B5D] text-white shadow-lg' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-100'}`}
                  >
                    {size}px
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {results.length > 0 && (
        <section className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-center bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-white/20">
            <div className="flex items-center gap-4">
              <h3 className="text-xl font-black text-[#4A6B5D] uppercase tracking-tighter">
                {language === 'vi' ? `Kết quả (${results.length})` : `Results (${results.length})`}
              </h3>
              <button 
                onClick={() => setResults([])} 
                className="text-[10px] font-black text-red-400 hover:text-red-600 uppercase tracking-widest underline decoration-2 underline-offset-4"
              >
                {language === 'vi' ? 'Xóa tất cả' : 'Clear All'}
              </button>
            </div>
            
            <button 
              onClick={handleDownloadZip}
              disabled={isZipping}
              className="bg-[#4A6B5D] text-white px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-wider shadow-xl hover:shadow-2xl transition-all active:scale-95 flex items-center gap-3 disabled:opacity-50"
            >
              {isZipping ? <LoadingSpinner /> : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
              {language === 'vi' ? 'Tải tệp ZIP' : 'Download ZIP'}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {results.map(res => (
              <div key={res.id} className="group bg-white rounded-3xl overflow-hidden shadow-md border border-gray-100 hover:shadow-2xl transition-all flex flex-col">
                <div className="aspect-square w-full bg-gray-50 relative overflow-hidden flex items-center justify-center p-2">
                  <img src={res.dataUrl} alt={res.originalName} className="max-w-full max-h-full object-contain rounded-xl shadow-sm" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <a 
                      href={res.dataUrl} 
                      download={`${res.originalName.split('.')[0]}-thumb.jpg`}
                      className="bg-white text-[#4A6B5D] px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all duration-300"
                    >
                      {language === 'vi' ? 'Lưu' : 'Save'}
                    </a>
                  </div>
                </div>
                <div className="p-3 border-t border-gray-50">
                  <p className="text-[10px] font-black text-gray-700 truncate mb-1 uppercase tracking-tight" title={res.originalName}>{res.originalName}</p>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{res.width} x {res.height} • {(res.size / 1024).toFixed(1)}KB</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {isProcessing && (
        <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white p-10 rounded-[40px] shadow-2xl flex flex-col items-center">
            <LoadingSpinner />
            <p className="mt-6 text-sm font-black text-[#4A6B5D] uppercase tracking-[0.2em] animate-pulse">
              {language === 'vi' ? 'Đang tạo thumbnail...' : 'Processing thumbnails...'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThumbnailCreator;
