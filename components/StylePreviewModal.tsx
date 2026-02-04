
import React, { useEffect, useState, useRef, useCallback } from 'react';
import type { ArtStyle } from '../types';
import { LoadingSpinner } from './LoadingSpinner';

interface StylePreviewModalProps {
  style: ArtStyle;
  onClose: () => void;
  onPreviewGenerated: (styleId: string, newPreviewUrl: string) => void;
  onUpdateStyle: (styleId: string, updates: Partial<ArtStyle>) => void;
  onTryWithPhoto: (files: File[]) => void;
  language?: 'vi' | 'en';
}

const StylePreviewModal: React.FC<StylePreviewModalProps> = ({ 
  style, 
  onClose, 
  onPreviewGenerated, 
  onUpdateStyle,
  onTryWithPhoto,
  language = 'vi' 
}) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [displayImage, setDisplayImage] = useState<string>(style.preview || style.exampleImage);
  const [editablePrompt, setEditablePrompt] = useState<string>(language === 'vi' ? (style.prompt_vi || style.prompt) : style.prompt);

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setDisplayImage(result);
      onPreviewGenerated(style.id, result);
      setIsProcessing(false);
    };
    reader.readAsDataURL(file);
  }, [style.id, onPreviewGenerated]);

  const handleGlobalPaste = useCallback((e: ClipboardEvent) => {
    // Không xử lý paste nếu người dùng đang focus vào textarea (tránh xung đột khi paste text)
    if (document.activeElement?.tagName === 'TEXTAREA') return;

    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          processFile(file);
          break; // Chỉ xử lý hình ảnh đầu tiên tìm thấy
        }
      }
    }
  }, [processFile]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('paste', handleGlobalPaste);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('paste', handleGlobalPaste);
    };
  }, [onClose, handleGlobalPaste]);

  useEffect(() => {
    setDisplayImage(style.preview || style.exampleImage);
    setEditablePrompt(language === 'vi' ? (style.prompt_vi || style.prompt) : style.prompt);
  }, [style, language]);

  const handlePromptChange = (val: string) => {
    setEditablePrompt(val);
    onUpdateStyle(style.id, language === 'vi' ? { prompt_vi: val } : { prompt: val });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [processFile]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[150] backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}>
      <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-300 mx-4" onClick={e => e.stopPropagation()}>
        
        <header className="px-8 pt-8 pb-4 flex justify-between items-start">
          <h2 className="text-xl font-black text-[#A98768] uppercase tracking-tighter">
            {language === 'vi' ? (style.label_vi || style.label) : style.label}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-800 transition-colors p-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <main className="px-8 py-2 flex-grow flex flex-col md:flex-row gap-8 items-stretch mb-8">
          <div className="w-full md:w-1/2 flex flex-col justify-center">
            <div 
              onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={handleDrop}
              className={`relative aspect-square rounded-[32px] overflow-hidden bg-gray-100 border-4 transition-all group
                ${isDraggingOver ? 'border-[#4A6B5D] scale-[0.98] shadow-inner' : 'border-transparent shadow-lg hover:shadow-xl'}`}
            >
              <img src={displayImage} alt="Preview" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              
              {/* Overlay with central icon per mockup - Click disabled */}
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 cursor-default">
                 <div className="bg-white p-3 rounded-2xl shadow-2xl transform group-hover:scale-110 transition-transform duration-300">
                    {isProcessing ? (
                        <LoadingSpinner />
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                    )}
                 </div>
                 <span className="text-white text-[14px] font-black uppercase tracking-[0.1em] drop-shadow-lg px-4 text-center">
                    {language === 'vi' ? 'KÉO HOẶC DÁN HÌNH ĐỂ THAY ĐỔI' : 'DRAG OR PASTE IMAGE TO CHANGE'}
                 </span>
              </div>
            </div>
          </div>

          <div className="w-full md:w-1/2 flex flex-col py-6">
            <div className="flex items-center gap-4 mb-6">
                <div className="h-[2px] w-12 bg-[#8DE9C4]"></div>
                <h3 className="text-sm font-black text-[#8DE9C4] uppercase tracking-[0.2em]">
                  {language === 'vi' ? 'MÔ TẢ PHONG CÁCH' : 'STYLE DESCRIPTION'}
                </h3>
            </div>

            <div className="flex-grow overflow-y-auto custom-preview-scrollbar pr-4">
                <textarea 
                    value={editablePrompt}
                    onChange={(e) => handlePromptChange(e.target.value)}
                    placeholder={language === 'vi' ? "Mô tả nội dung phong cách..." : "Describe the style content..."}
                    className="w-full text-lg text-gray-500 font-medium italic leading-relaxed bg-transparent border-none focus:ring-0 resize-none min-h-[300px]"
                    style={{ fontFamily: 'serif' }}
                />
            </div>
          </div>
        </main>

      </div>
    </div>
  );
};

export default StylePreviewModal;
