
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { stylizeImage, generateImageFromPrompt, animateImage, upscaleImage, RateLimitError } from './services/geminiService';
import { ART_STYLES, DEFAULT_FOLDERS } from './constants';
import type { ArtStyle, Preset, ImageEditorAdjustments, StyleFolder, GalleryImage } from './types';
import ImageUploader from './components/ImageUploader';
import StyleSelector from './components/StyleSelector';
import ResultDisplay from './components/ResultDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import StyleReferenceUploader from './components/StyleReferenceUploader';
import ColorAdjustmentSliders from './components/ColorAdjustmentSliders';
import AspectRatioSelector from './components/AspectRatioSelector';
import CustomStyleInput from './components/CustomStyleInput';
import StylePresets from './components/StylePresets';
import ImageCropperModal from './components/ImageCropperModal';
import StylePreviewModal from './components/StylePreviewModal';
import FolderManager from './components/FolderManager';
import ImageGallery from './components/ImageGallery';
import SaveStyleModal from './components/SaveStyleModal';
import EditStyleModal from './components/EditStyleModal';
import StyleSearch from './components/StyleSearch';
import DeletedStyles from './components/DeletedStyles';
import StyleInfluenceSlider from './components/StyleInfluenceSlider';
import ConfirmDeleteModal from './components/ConfirmDeleteModal';
import ThumbnailCreator from './components/ThumbnailCreator';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}

interface ImageState {
  id: string;
  name: string;
  originalData: string;
  originalType: string;
  history: string[];
  historyIndex: number;
  animatedVideoUrl: string | null;
  adjustments: ImageEditorAdjustments;
  adjustmentHistory: ImageEditorAdjustments[];
  adjustmentHistoryIndex: number;
}

const initialAdjustmentsState: ImageEditorAdjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
};

const DEFAULT_PRESETS: Preset[] = [
  { id: 'default_1', name: 'Chân dung Điện ảnh', styleId: null, customStylePrompt: 'Cinematic portrait, moody lighting', styleInfluence: 80, vibrancy: 10, mood: -10, aspectRatio: '3:4' },
  { id: 'default_2', name: 'Phim Cổ điển', styleId: null, customStylePrompt: 'Vintage film aesthetic', styleInfluence: 70, vibrancy: -15, mood: -20, aspectRatio: '4:3' },
];

const createThumbnail = (base64: string, size: number = 300, quality: number = 0.5): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
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
            if (ctx) {
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);
            }
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(base64);
        img.src = base64;
    });
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'converter' | 'thumbnail'>('converter');
  const [images, setImages] = useState<ImageState[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [isOriginalImageLoading, setIsOriginalImageLoading] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<ArtStyle | null>(null);
  const [customStylePrompt, setCustomStylePrompt] = useState('');
  const [styleReferenceImage, setStyleReferenceImage] = useState<string | null>(null);
  const [styleInfluence, setStyleInfluence] = useState(50);
  const [vibrancy, setVibrancy] = useState(0);
  const [mood, setMood] = useState(0);
  const [aspectRatio, setAspectRatio] = useState('auto');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [batchResults, setBatchResults] = useState<{ styleId: string; imageUrl: string | null; error?: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [artStyles, setArtStyles] = useState<ArtStyle[]>([]);
  const [styleFolders, setStyleFolders] = useState<StyleFolder[]>([]);
  const [language, setLanguage] = useState<'vi' | 'en'>('vi');
  
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [isBlendMode, setIsBlendMode] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  const [blendStyleA, setBlendStyleA] = useState<ArtStyle | null>(null);
  const [blendStyleB, setBlendStyleB] = useState<ArtStyle | null>(null);
  const [batchSelectedStyleIds, setBatchSelectedStyleIds] = useState<Set<string>>(new Set());

  const [styleSearchTerm, setStyleSearchTerm] = useState('');
  const [progress, setProgress] = useState(0);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [previewingStyle, setPreviewingStyle] = useState<ArtStyle | null>(null);
  const [editingStyle, setEditingStyle] = useState<ArtStyle | null>(null);
  const [croppingTarget, setCroppingTarget] = useState<{ id: string, type: 'original' | 'generated' } | null>(null);
  const [rateLimitCooldown, setRateLimitCooldown] = useState(0);
  const [editPrompt, setEditPrompt] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [hasStyleRefResult, setHasStyleRefResult] = useState(false);
  const [lastStyleRefUsed, setLastStyleRefUsed] = useState<string | null>(null);
  const [lastUsedPrompt, setLastUsedPrompt] = useState<string | null>(null);

  const [styleToDelete, setStyleToDelete] = useState<ArtStyle | null>(null);

  const [isApiKeySelected, setIsApiKeySelected] = useState<boolean>(true);

  const progressIntervalRef = useRef<number | null>(null);

  const selectedImage = useMemo(() => images.find(img => img.id === selectedImageId), [images, selectedImageId]);
  const originalImage = useMemo(() => selectedImage?.originalData ?? null, [selectedImage]);
  const generatedImage = useMemo(() => {
    if (!selectedImage || !selectedImage.history || selectedImage.history.length === 0) return null;
    const idx = selectedImage.historyIndex;
    if (idx < 0 || idx >= selectedImage.history.length) return selectedImage.history[selectedImage.history.length - 1];
    return selectedImage.history[idx] || null;
  }, [selectedImage]);
  
  const adjustments = useMemo(() => selectedImage?.adjustments ?? initialAdjustmentsState, [selectedImage]);

  useEffect(() => {
    try {
      const savedStylesString = localStorage.getItem('artStyles');
      const savedStyles = savedStylesString ? JSON.parse(savedStylesString) : [];
      const reconciled = ART_STYLES.map(s => {
        const saved = Array.isArray(savedStyles) ? savedStyles.find((ss: any) => ss?.id === s.id) : null;
        return saved ? { 
          ...s, 
          rating: saved.rating || 0, 
          isDeleted: !!saved.isDeleted, 
          folderId: saved.folderId,
          thumbnail: saved.thumbnail || s.thumbnail,
          preview: saved.preview || s.preview,
          exampleImage: saved.exampleImage || s.exampleImage,
          prompt: saved.prompt || s.prompt,
          prompt_vi: saved.prompt_vi || s.prompt_vi
        } : s;
      });
      const customStyles = Array.isArray(savedStyles) ? savedStyles.filter((ss: any) => ss && !ART_STYLES.find(s => s.id === ss.id)) : [];
      setArtStyles([...reconciled, ...customStyles]);
      
      const savedPresets = localStorage.getItem('stylePresets');
      setPresets(savedPresets && JSON.parse(savedPresets).length > 0 ? JSON.parse(savedPresets) : DEFAULT_PRESETS);
      
      const savedFolders = localStorage.getItem('styleFolders');
      setStyleFolders(savedFolders ? JSON.parse(savedFolders) : DEFAULT_FOLDERS);
      
      const savedGallery = localStorage.getItem('imageGallery');
      setGalleryImages(savedGallery ? JSON.parse(savedGallery) : []);
    } catch (e) {
      console.error("Failed to load storage", e);
      setArtStyles(ART_STYLES);
      setPresets(DEFAULT_PRESETS);
      setStyleFolders(DEFAULT_FOLDERS);
      setGalleryImages([]);
    }
  }, []);

  useEffect(() => {
    const checkApiKey = async () => {
      if (window.aistudio) {
        try {
          const hasKey = await window.aistudio.hasSelectedApiKey();
          setIsApiKeySelected(hasKey);
        } catch (e) {
          console.error("Failed to check API key status", e);
        }
      }
    };
    checkApiKey();
  }, []);

  const handleOpenSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setIsApiKeySelected(true);
    }
  };

  const persistToLocalStorage = useCallback(async (manual: boolean = false) => {
    setIsSaving(true);
    try {
        const trySetItem = (key: string, value: string) => {
            try {
                localStorage.setItem(key, value);
                return true;
            } catch (e) {
                return false;
            }
        };

        const optimizedArtStyles = await Promise.all(artStyles.map(async (s) => {
            const isDefault = ART_STYLES.some(ds => ds.id === s.id);
            if (!isDefault && s.preview && s.preview.length > 50000) {
                const compressed = await createThumbnail(s.preview, 300, 0.3);
                return { ...s, preview: compressed, thumbnail: compressed };
            }
            return s;
        }));

        localStorage.setItem('styleFolders', JSON.stringify(styleFolders));
        localStorage.setItem('stylePresets', JSON.stringify(presets));
        
        let savedStyles = trySetItem('artStyles', JSON.stringify(optimizedArtStyles));
        
        if (!savedStyles) {
            const superOptimized = await Promise.all(optimizedArtStyles.map(async (s) => ({
                ...s,
                preview: await createThumbnail(s.preview || s.exampleImage, 200, 0.2),
                thumbnail: await createThumbnail(s.thumbnail || s.exampleImage, 150, 0.2)
            })));
            savedStyles = trySetItem('artStyles', JSON.stringify(superOptimized));
        }

        let galleryToSave = galleryImages.slice(0, 15);
        let savedGallery = trySetItem('imageGallery', JSON.stringify(galleryToSave));

        if (!savedGallery && galleryImages.length > 0) {
            const compressedGallery = await Promise.all(galleryToSave.map(async (img) => ({
                ...img,
                url: await createThumbnail(img.url, 300, 0.2)
            })));
            savedGallery = trySetItem('imageGallery', JSON.stringify(compressedGallery));
            
            if (!savedGallery) {
                savedGallery = trySetItem('imageGallery', JSON.stringify(compressedGallery.slice(0, 5)));
                
                if (!savedGallery) {
                    localStorage.removeItem('imageGallery');
                    if (manual) showToast(language === 'vi' ? 'Bộ nhớ quá đầy, không thể lưu lịch sử ảnh.' : 'Storage critical, image history discarded.', 'error');
                }
            }
        }
        
        if (manual && savedStyles) showToast(language === 'vi' ? 'Đã lưu dự án!' : 'Project saved!');
    } catch (e: any) {
        console.error("Critical storage failure", e);
        if (manual) showToast(language === 'vi' ? 'Lỗi nghiêm trọng! Vui lòng xuất tệp dự án.' : 'Critical storage failure! Please export project.', 'error');
    } finally {
        setIsSaving(false);
    }
  }, [artStyles, presets, styleFolders, galleryImages, language]);

  useEffect(() => {
    const timer = setTimeout(() => {
        if (artStyles.length > 0) persistToLocalStorage(false);
    }, 7000); 
    return () => clearTimeout(timer);
  }, [artStyles, presets, styleFolders, galleryImages, persistToLocalStorage]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const startProgressSimulation = () => {
    setProgress(0);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = window.setInterval(() => {
      setProgress(p => (p >= 95 ? 95 : p + Math.random() * 5));
    }, 400);
  };

  const stopProgressSimulation = () => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setProgress(100);
    setTimeout(() => setProgress(0), 500);
  };

  const handleImageUpload = (files: File[]) => {
    setIsOriginalImageLoading(true);
    const newImageStates: ImageState[] = [];
    let completedCount = 0;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const newId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newImg: ImageState = {
          id: newId, name: file.name, originalData: dataUrl, originalType: file.type,
          history: [dataUrl], historyIndex: 0, animatedVideoUrl: null,
          adjustments: { ...initialAdjustmentsState }, 
          adjustmentHistory: [{ ...initialAdjustmentsState }], 
          adjustmentHistoryIndex: 0
        };
        newImageStates.push(newImg);
        completedCount++;

        if (completedCount === files.length) {
          setImages(prev => [...prev, ...newImageStates]);
          if (!selectedImageId && newImageStates.length > 0) {
            setSelectedImageId(newImageStates[0].id);
          }
          setIsOriginalImageLoading(false);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleGenerateClick = async () => {
    if (images.length === 0) return;
    const hasMultipleStyles = isBatchMode && batchSelectedStyleIds.size > 0;
    const hasMultipleImages = images.length > 1;

    if (!selectedStyle && !customStylePrompt.trim() && !isBlendMode && !styleReferenceImage && !hasMultipleStyles) return;
    
    setIsLoading(true);
    setError(null);
    setHasStyleRefResult(false);
    startProgressSimulation();

    let intensityInstruction = "";
    if (styleInfluence >= 90) intensityInstruction = "Transform the image COMPLETELY and RIGIDLY to match the target style.";
    else if (styleInfluence >= 70) intensityInstruction = "Apply the style with high intensity.";
    else if (styleInfluence <= 10) intensityInstruction = "Apply the style EXTREMELY SUBTLY.";
    else if (styleInfluence <= 30) intensityInstruction = "Apply the style subtly.";
    else intensityInstruction = "Apply the style with balanced intensity.";

    try {
      if (hasMultipleStyles && selectedImage) {
        setIsBatchProcessing(true);
        const styleIds = Array.from(batchSelectedStyleIds);
        setBatchResults(styleIds.map(id => ({ styleId: id, imageUrl: null })));
        
        for (let i = 0; i < styleIds.length; i++) {
          setBatchProgress({ current: i + 1, total: styleIds.length });
          const style = artStyles.find(s => s.id === styleIds[i]);
          if (!style) continue;
          
          const stylePrompt = language === 'vi' ? (style.prompt_vi || style.prompt) : style.prompt;
          const finalPrompt = `${intensityInstruction} ${stylePrompt}`;
          
          try {
            const res = await stylizeImage(selectedImage.originalData.split(',')[1], selectedImage.originalType, finalPrompt, null, null, undefined, aspectRatio);
            if (res) {
              const fullRes = `data:image/png;base64,${res}`;
              setBatchResults(prev => prev.map((item, idx) => idx === i ? { ...item, imageUrl: fullRes } : item));
              const styleName = language === 'vi' ? (style.label_vi || style.label) : style.label;
              const thumbUrl = await createThumbnail(fullRes, 400, 0.3);
              setGalleryImages(prev => [{ id: `gal_${Date.now()}_${i}`, url: thumbUrl, styleName, prompt: finalPrompt, timestamp: Date.now(), aspectRatio }, ...prev]);
            }
          } catch (err: any) {
            setBatchResults(prev => prev.map((item, idx) => idx === i ? { ...item, error: err.message } : item));
          }
        }
        setIsBatchProcessing(false);
      } else if (hasMultipleImages) {
        setIsBatchProcessing(true);
        let basePrompt = customStylePrompt.trim() || (selectedStyle ? (language === 'vi' ? (selectedStyle.prompt_vi || selectedStyle.prompt) : selectedStyle.prompt) : "An artistic transformation.");
        const finalPrompt = `${intensityInstruction} ${basePrompt}`;
        const currentStyleId = selectedStyle?.id || 'custom';
        const styleName = selectedStyle ? (language === 'vi' ? (selectedStyle.label_vi || selectedStyle.label) : selectedStyle.label) : 'Custom';

        setBatchResults(images.map(() => ({ styleId: currentStyleId, imageUrl: null })));
        
        for (let i = 0; i < images.length; i++) {
          setBatchProgress({ current: i + 1, total: images.length });
          const img = images[i];
          try {
            const res = await stylizeImage(img.originalData.split(',')[1], img.originalType, finalPrompt, styleReferenceImage?.split(',')[1] || null, styleReferenceImage ? 'image/png' : null, undefined, aspectRatio);
            if (res) {
              const fullRes = `data:image/png;base64,${res}`;
              setImages(prev => prev.map(item => item.id === img.id ? { ...item, history: [...item.history, fullRes], historyIndex: item.history.length } : item));
              setBatchResults(prev => prev.map((resItem, idx) => idx === i ? { ...resItem, imageUrl: fullRes } : resItem));
              const thumbUrl = await createThumbnail(fullRes, 400, 0.3);
              setGalleryImages(prev => [{ id: `gal_${Date.now()}_${i}`, url: thumbUrl, styleName, prompt: finalPrompt, timestamp: Date.now(), aspectRatio }, ...prev]);
            }
          } catch (err: any) {
             setBatchResults(prev => prev.map((resItem, idx) => idx === i ? { ...resItem, error: err.message } : resItem));
          }
        }
        setIsBatchProcessing(false);
      } else if (selectedImage) {
        let basePrompt = customStylePrompt.trim() || (selectedStyle ? (language === 'vi' ? (selectedStyle.prompt_vi || selectedStyle.prompt) : selectedStyle.prompt) : "An artistic transformation.");
        const finalPrompt = `${intensityInstruction} ${basePrompt}`;
        const res = await stylizeImage(selectedImage.originalData.split(',')[1], selectedImage.originalType, finalPrompt, styleReferenceImage?.split(',')[1] || null, styleReferenceImage ? 'image/png' : null, undefined, aspectRatio);
        if (res) {
          const fullRes = `data:image/png;base64,${res}`;
          setImages(prev => prev.map(img => img.id === selectedImage.id ? { ...img, history: [...img.history, fullRes], historyIndex: img.history.length } : img));
          const styleName = language === 'vi' ? (selectedStyle?.label_vi || selectedStyle?.label || 'Custom') : (selectedStyle?.label || 'Custom');
          const thumbUrl = await createThumbnail(fullRes, 400, 0.3);
          setGalleryImages(prev => [{ id: `gal_${Date.now()}`, url: thumbUrl, styleName, prompt: finalPrompt, timestamp: Date.now(), aspectRatio }, ...prev]);
          setHasStyleRefResult(true);
          if (styleReferenceImage) setLastStyleRefUsed(styleReferenceImage);
          setLastUsedPrompt(finalPrompt);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      stopProgressSimulation();
      setBatchProgress(null);
    }
  };

  const handleAnimate = async () => {
    if (!selectedImage || !generatedImage) return;
    setIsAnimating(true);
    try {
      const mimeType = generatedImage.substring(5, generatedImage.indexOf(';'));
      const videoUrl = await animateImage(generatedImage.split(',')[1], mimeType);
      if (videoUrl) {
        setImages(prev => prev.map(img => img.id === selectedImageId ? { ...img, animatedVideoUrl: videoUrl } : img));
      }
    } catch (e: any) { setError(e.message); }
    finally { setIsAnimating(false); }
  };

  const handleUpscale = async (size: '2K' | '4K') => {
    if (!selectedImage || !generatedImage) return;
    setIsUpscaling(true);
    startProgressSimulation();
    try {
      const mimeType = generatedImage.substring(5, generatedImage.indexOf(';'));
      const res = await upscaleImage(generatedImage.split(',')[1], mimeType, size);
      if (res) {
        const fullRes = `data:image/png;base64,${res}`;
        setImages(prev => prev.map(img => img.id === selectedImageId ? { ...img, history: [...img.history, fullRes], historyIndex: img.history.length } : img));
      }
    } catch (e: any) { setError(e.message); }
    finally { setIsUpscaling(false); stopProgressSimulation(); }
  };

  const handleStyleSelect = (style: ArtStyle) => {
    if (selectedStyle?.id === style.id) {
        setSelectedStyle(null);
    } else {
        setSelectedStyle(style);
    }
  };

  const handleBatchStyleToggle = (styleId: string) => {
    setBatchSelectedStyleIds(prev => {
      const next = new Set(prev);
      if (next.has(styleId)) next.delete(styleId);
      else next.add(styleId);
      return next;
    });
  };

  const handleBlendStyleSelect = (style: ArtStyle) => {
    if (!blendStyleA) {
      setBlendStyleA(style);
    } else if (!blendStyleB) {
      if (blendStyleA.id === style.id) setBlendStyleA(null);
      else setBlendStyleB(style);
    } else {
      if (blendStyleA.id === style.id) {
        setBlendStyleA(blendStyleB);
        setBlendStyleB(null);
      } else if (blendStyleB.id === style.id) {
        setBlendStyleB(null);
      } else {
        setBlendStyleA(style);
        setBlendStyleB(null);
      }
    }
  };

  const handleSaveStyle = async (name: string, folderId: string | null) => {
    if (!generatedImage) return;
    setIsLoading(true);
    try {
        const [thumb, refThumb] = await Promise.all([
          createThumbnail(generatedImage, 400, 0.3),
          (lastStyleRefUsed || styleReferenceImage) ? createThumbnail((lastStyleRefUsed || styleReferenceImage)!, 300, 0.3) : Promise.resolve(undefined)
        ]);
        const ns: ArtStyle = {
            id: `c_${Date.now()}`,
            label: name, label_vi: name,
            prompt: lastUsedPrompt || customStylePrompt || "Custom hybrid style.",
            thumbnail: thumb, preview: thumb, exampleImage: thumb, referenceImage: refThumb,
            folderId: folderId, rating: 0, isDeleted: false
        };
        setArtStyles(prev => [...prev, ns]);
        showToast(language === 'vi' ? 'Lưu phong cách thành công!' : 'Style saved successfully!');
        setShowSaveModal(false);
    } catch (err) {
        showToast(language === 'vi' ? 'Lỗi khi lưu phong cách!' : 'Error saving style!', 'error');
    } finally {
        setIsLoading(false);
    }
  };

  const handleUpdateStyleImage = async (styleId: string, fullImageUrl: string) => {
    try {
        // Tạo cả preview chất lượng cao và thumbnail nhỏ cho sidebar
        const [thumb, preview] = await Promise.all([
          createThumbnail(fullImageUrl, 400, 0.3),
          createThumbnail(fullImageUrl, 600, 0.5)
        ]);
        
        setArtStyles(prev => prev.map(s => s.id === styleId ? {
            ...s, 
            preview: preview, 
            thumbnail: thumb, 
            exampleImage: thumb 
        } : s));
        
        // Cập nhật selectedStyle nếu đang chọn chính style đó
        if (selectedStyle?.id === styleId) {
            setSelectedStyle(prev => prev ? { ...prev, preview, thumbnail: thumb, exampleImage: thumb } : null);
        }
        
        showToast(language === 'vi' ? 'Đã cập nhật hình minh họa gắn liền với style!' : 'Updated style illustration!');
    } catch (e) {
        console.error("Failed to update style image", e);
    }
  };

  const handleUpdateStyle = (styleId: string, updates: Partial<ArtStyle>) => {
    setArtStyles(prev => prev.map(s => s.id === styleId ? { ...s, ...updates } : s));
    if (selectedStyle?.id === styleId) {
        setSelectedStyle(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const handleStyleDeleteRequest = (id: string) => {
    const style = artStyles.find(s => s.id === id);
    if (style) {
      setStyleToDelete(style);
    }
  };

  const confirmStyleDelete = () => {
    if (!styleToDelete) return;
    const id = styleToDelete.id;
    setArtStyles(prev => prev.map(s => s.id === id ? { ...s, isDeleted: true } : s));
    if (selectedStyle?.id === id) setSelectedStyle(null);
    showToast(language === 'vi' ? 'Đã chuyển vào thùng rác' : 'Moved to trash');
    setStyleToDelete(null);
  };

  const visibleArtStyles = useMemo(() => {
    return artStyles.filter(s => !s.isDeleted && (
      s.label.toLowerCase().includes(styleSearchTerm.toLowerCase()) || 
      (s.label_vi && s.label_vi.toLowerCase().includes(styleSearchTerm.toLowerCase()))
    ));
  }, [artStyles, styleSearchTerm]);

  const deletedStyles = useMemo(() => {
    return artStyles.filter(s => !!s.isDeleted);
  }, [artStyles]);

  const handleTryWithPhotoFromModal = (files: File[]) => {
    handleImageUpload(files);
    if (previewingStyle) {
      setSelectedStyle(previewingStyle);
    }
  };

  const handleExportConfig = () => {
    const config = {
      artStyles: artStyles,
      presets: presets,
      styleFolders: styleFolders
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ai_style_project_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(language === 'vi' ? 'Đã xuất tệp cấu hình!' : 'Config exported!');
  };

  const handleImportConfig = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target?.result as string);
        if (config.artStyles) setArtStyles(config.artStyles);
        if (config.presets) setPresets(config.presets);
        if (config.styleFolders) setStyleFolders(config.styleFolders);
        showToast(language === 'vi' ? 'Đã nhập cấu hình mới!' : 'Config imported!');
      } catch (err) {
        showToast(language === 'vi' ? 'Tệp không hợp lệ!' : 'Invalid file!', 'error');
      }
    };
    reader.readAsText(file);
  };

  if (!isApiKeySelected) {
    return (
      <div className="min-h-screen bg-[#f8f5f2] flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-12 rounded-[40px] shadow-2xl max-w-md w-full border border-gray-100">
          <div className="bg-[#4A6B5D]/10 p-6 rounded-3xl mb-8 inline-block">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-[#4A6B5D]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-[#423a3a] uppercase tracking-tighter mb-4">
            {language === 'vi' ? 'Yêu cầu API Key' : 'API Key Required'}
          </h1>
          <p className="text-gray-500 font-medium mb-8 leading-relaxed">
            {language === 'vi' 
              ? 'Để sử dụng các tính năng cao cấp như tạo video và nâng cấp ảnh 4K, bạn cần chọn API Key từ dự án có trả phí của mình.' 
              : 'To use premium features like video generation and 4K upscaling, please select an API Key from your paid project.'}
            <br />
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-[#4A6B5D] underline font-bold mt-2 inline-block">
              {language === 'vi' ? 'Xem hướng dẫn thanh toán' : 'View billing documentation'}
            </a>
          </p>
          <button 
            onClick={handleOpenSelectKey}
            className="w-full py-5 bg-[#4A6B5D] text-white rounded-2xl font-black text-lg shadow-xl hover:shadow-2xl transition-all active:scale-95"
          >
            {language === 'vi' ? 'Chọn API Key Ngay' : 'Select API Key Now'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f5f2] text-[#423a3a] flex flex-col font-sans">
      <Header 
        language={language} 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLanguageChange={setLanguage} 
        onSaveAll={() => persistToLocalStorage(true)} 
        onExportConfig={handleExportConfig}
        onImportConfig={handleImportConfig}
        isSaving={isSaving}
      />
      {toast && (
        <div className={`fixed top-24 right-6 z-[100] p-4 rounded-2xl shadow-2xl animate-in slide-in-from-right duration-300 flex items-center gap-3 border ${toast.type === 'success' ? 'bg-white border-green-100 text-green-800' : 'bg-white border-red-100 text-red-800'}`}>
            <div className={`p-2 rounded-full ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    {toast.type === 'success' ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />}
                </svg>
            </div>
            <span className="font-bold">{toast.message}</span>
        </div>
      )}

      <main className="flex-grow w-full px-2 md:px-6 py-6 space-y-12">
        {activeTab === 'thumbnail' ? (
          <ThumbnailCreator language={language} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-3 space-y-6">
              <section className="bg-white/90 p-6 rounded-2xl shadow-lg border border-gray-200">
                <h2 className="text-xl font-bold mb-4 text-[#4A6B5D] uppercase tracking-wide">1. {language === 'vi' ? 'Tải ảnh' : 'Upload'}</h2>
                <ImageUploader 
                  onImageUpload={handleImageUpload} images={images.map(i => ({ id: i.id, name: i.name, data: i.originalData }))}
                  selectedImageId={selectedImageId} onSelectImage={setSelectedImageId} onRemoveImage={id => setImages(prev => prev.filter(img => img.id !== id))}
                  onClearAll={() => {setImages([]); setSelectedImageId(null);}} onCropClick={id => setCroppingTarget({ id, type: 'original' })} isLoading={isOriginalImageLoading} language={language}
                />
                <button onClick={handleGenerateClick} disabled={isLoading || images.length === 0 || (!selectedStyle && !customStylePrompt.trim() && !isBlendMode && !styleReferenceImage && !(isBatchMode && batchSelectedStyleIds.size > 0))} className="w-full py-4 mt-6 bg-[#4A6B5D] text-white rounded-xl font-bold shadow-xl hover:shadow-2xl transition-all disabled:opacity-50">
                  {isLoading ? <LoadingSpinner /> : (language === 'vi' ? "Chuyển đổi ngay" : "Convert Now")}
                </button>
                {error && <p className="mt-4 p-3 bg-red-100 text-red-800 rounded-lg text-sm font-bold">{error}</p>}
              </section>
              <section className="bg-white/90 p-6 rounded-2xl shadow-lg border border-gray-200">
                  <ColorAdjustmentSliders vibrancy={vibrancy} onVibrancyChange={setVibrancy} mood={mood} onMoodChange={setMood} />
                  <StyleInfluenceSlider value={styleInfluence} onChange={setStyleInfluence} language={language} />
                  <AspectRatioSelector selectedValue={aspectRatio} onChange={setAspectRatio} />
              </section>
              <section className="bg-white/90 p-6 rounded-2xl shadow-lg border border-gray-200">
                  <StylePresets presets={presets} onSave={n => setPresets(prev => [...prev, { id: `p_${Date.now()}`, name: n, styleId: selectedStyle?.id || null, customStylePrompt, styleInfluence, vibrancy, mood, aspectRatio }])} onApply={p => { setSelectedStyle(artStyles.find(s => s.id === p.styleId) || null); setCustomStylePrompt(p.customStylePrompt); setStyleInfluence(p.styleInfluence); setVibrancy(p.vibrancy); setMood(p.mood); setAspectRatio(p.aspectRatio); }} onDelete={id => setPresets(prev => prev.filter(p => p.id !== id))} isSaveEnabled={!!(selectedStyle || customStylePrompt)} styles={artStyles} language={language} />
              </section>
            </div>

            <div className="lg:col-span-4">
              <section className="bg-white/90 p-6 rounded-2xl shadow-lg border border-gray-200 h-full flex flex-col overflow-y-auto max-h-[calc(100vh-160px)] custom-scrollbar">
                  <h2 className="text-lg font-black mb-3 text-gray-600 uppercase tracking-tighter">2. CHỌN HOẶC MÔ TẢ PHONG CÁCH</h2>
                  <div className="flex items-center gap-6 mb-4 px-1">
                    <label className="flex items-center cursor-pointer select-none group">
                        <div className="relative">
                          <input type="checkbox" checked={isBatchMode} onChange={() => setIsBatchMode(!isBatchMode)} className="sr-only" />
                          <div className={`block w-10 h-5 rounded-full transition-colors ${isBatchMode ? 'bg-[#4A6B5D]' : 'bg-[#ced4da]'}`}></div>
                          <div className={`absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform transform ${isBatchMode ? 'translate-x-5' : 'translate-x-0'}`}></div>
                        </div>
                        <span className="ml-3 text-sm font-bold text-gray-700 group-hover:text-[#4A6B5D] transition-colors">Hàng loạt</span>
                    </label>
                    <label className="flex items-center cursor-pointer select-none group">
                        <div className="relative">
                          <input type="checkbox" checked={isBlendMode} onChange={() => setIsBlendMode(!isBlendMode)} className="sr-only" />
                          <div className={`block w-10 h-5 rounded-full transition-colors ${isBlendMode ? 'bg-[#4A6B5D]' : 'bg-[#ced4da]'}`}></div>
                          <div className={`absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform transform ${isBlendMode ? 'translate-x-5' : 'translate-x-0'}`}></div>
                        </div>
                        <span className="ml-3 text-sm font-bold text-gray-700 group-hover:text-[#4A6B5D] transition-colors">Hòa trộn</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                      <div className="flex-grow">
                          <StyleSearch value={styleSearchTerm} onChange={setStyleSearchTerm} />
                      </div>
                      <button 
                          type="button"
                          onClick={() => setShowTrash(!showTrash)}
                          className={`p-2 rounded-xl transition-all border-2 flex items-center justify-center min-w-[44px] min-h-[44px] relative ${showTrash ? 'bg-red-500 border-red-600 text-white shadow-lg' : 'bg-white border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 shadow-sm'} ${deletedStyles.length > 0 && !showTrash ? 'animate-pulse' : ''}`}
                          title={language === 'vi' ? 'Thùng rác' : 'Trash bin'}
                      >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          {deletedStyles.length > 0 && (
                              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full ring-2 ring-white">
                                  {deletedStyles.length}
                              </span>
                          )}
                      </button>
                  </div>

                  <FolderManager folders={styleFolders} onCreateFolder={n => setStyleFolders([...styleFolders, { id: `f_${Date.now()}`, name: n }])} onDeleteFolder={id => setStyleFolders(styleFolders.filter(f => f.id !== id))} onRenameFolder={(id, n) => setStyleFolders(styleFolders.map(f => f.id === id ? { ...f, name: n } : f))} language={language} />
                  
                  {showTrash ? (
                      <div className="animate-in fade-in zoom-in duration-200">
                          <DeletedStyles 
                              deletedStyles={deletedStyles} 
                              onRestore={id => {
                                  setArtStyles(prev => prev.map(s => s.id === id ? { ...s, isDeleted: false } : s));
                                  showToast(language === 'vi' ? 'Đã khôi phục phong cách' : 'Style restored');
                              }}
                              onRestoreAll={() => {
                                  setArtStyles(prev => prev.map(s => ({ ...s, isDeleted: false })));
                                  showToast(language === 'vi' ? 'Đã khôi phục tất cả' : 'All styles restored');
                              }}
                              onPermanentlyDelete={id => {
                                  setArtStyles(prev => prev.filter(s => s.id !== id));
                                  showToast(language === 'vi' ? 'Đã xóa vĩnh viễn' : 'Permanently deleted', 'error');
                              }}
                              language={language}
                          />
                          <button 
                              type="button"
                              onClick={() => setShowTrash(false)}
                              className="w-full mt-4 py-2 text-xs font-bold text-[#4A6B5D] bg-[#4A6B5D]/10 rounded-xl hover:bg-[#4A6B5D]/20 transition-all"
                          >
                              {language === 'vi' ? 'Quay lại danh sách phong cách' : 'Back to styles'}
                          </button>
                      </div>
                  ) : (
                      <StyleSelector 
                          styles={visibleArtStyles} selectedStyle={selectedStyle} styleFolders={styleFolders}
                          onStyleSelect={handleStyleSelect} onStylePreview={setPreviewingStyle} 
                          onStyleDelete={handleStyleDeleteRequest}
                          onStyleEdit={setEditingStyle} onSetRating={(id, r) => setArtStyles(prev => prev.map(s => s.id === id ? { ...s, rating: r } : s))}
                          onMoveStyleToFolder={(sId, fId) => setArtStyles(prev => prev.map(s => s.id === sId ? { ...s, folderId: fId } : s))}
                          onSelectAll={() => {}} onDeselectAll={() => {}} language={language}
                          isBlendMode={isBlendMode} isBatchMode={isBatchMode}
                          blendStyleA={blendStyleA} blendStyleB={blendStyleB}
                          onBlendStyleSelect={handleBlendStyleSelect}
                          batchSelectedIds={batchSelectedStyleIds}
                          onBatchStyleToggle={handleBatchStyleToggle}
                      />
                  )}

                  <div className="mt-8 space-y-4 border-t border-gray-100 pt-6">
                    <CustomStyleInput 
                      value={customStylePrompt} 
                      onChange={setCustomStylePrompt} 
                      language={language} 
                      isModifierMode={!!selectedStyle}
                      styleName={selectedStyle ? (language === 'vi' ? selectedStyle.label_vi : selectedStyle.label) : undefined}
                    />
                    <StyleReferenceUploader styleReferenceImage={styleReferenceImage} onImageUpload={f => { const r = new FileReader(); r.onload = (e) => setStyleReferenceImage(e.target?.result as string); r.readAsDataURL(f); }} onImageClear={() => setStyleReferenceImage(null)} language={language} />
                  </div>
              </section>
            </div>

            <div className="lg:col-span-5">
              <section className="bg-white/40 p-4 rounded-2xl shadow-inner min-h-[600px] border border-gray-100 h-full">
                <ResultDisplay 
                  originalImage={originalImage} generatedImage={generatedImage} styleReferenceImage={styleReferenceImage} selectedStyle={selectedStyle} customStylePrompt={customStylePrompt}
                  isLoading={isLoading} progress={progress} adjustments={adjustments} onAdjustmentChange={(k, v) => setImages(prev => prev.map(img => img.id === selectedImageId ? { ...img, adjustments: { ...img.adjustments, [k]: v } } : img))}
                  isPreviewing={false} animatedVideoUrl={selectedImage?.animatedVideoUrl || null} isAnimating={isAnimating} onAnimate={handleAnimate} isEditing={isEditing} editPrompt={editPrompt} onEditPromptChange={setEditPrompt}
                  onEditTextFileUpload={() => {}} onEdit={() => {}} onCrop={() => setCroppingTarget({ id: selectedImageId!, type: 'generated' })} onUndo={() => setImages(prev => prev.map(img => img.id === selectedImageId ? { ...img, historyIndex: Math.max(0, img.historyIndex - 1) } : img))} onRedo={() => setImages(prev => prev.map(img => img.id === selectedImageId ? { ...img, historyIndex: Math.min(img.history.length - 1, img.historyIndex + 1) } : img))} canUndo={selectedImage ? selectedImage.historyIndex > 0 : false} canRedo={selectedImage ? selectedImage.historyIndex < selectedImage.history.length - 1 : false} isUpscaling={isUpscaling} onUpscale={handleUpscale}
                  rateLimitCooldown={rateLimitCooldown} onCommitSliderAdjustments={() => {}} onRotate={() => {}} onFlip={() => {}} onResetAdjustments={() => {}} onUndoAdjustment={() => {}} onRedoAdjustment={() => {}}
                  canUndoAdjustment={false} canRedoAdjustment={false} isBatchMode={isBatchMode} isBatchProcessing={isBatchProcessing} batchProgress={batchProgress} batchResults={batchResults}
                  allArtStyles={artStyles} onClearBatchResults={() => { setBatchResults([]); setIsBatchMode(false); }} isParsingFile={false} editReferenceImages={[]} isEditReferenceLoading={false} onEditReferenceImageUpload={() => {}}
                  onClearEditReferenceImage={() => {}} language={language}
                  onSaveReferenceStyle={() => setShowSaveModal(true)}
                  hasReferenceStyleToSave={hasStyleRefResult}
                />
              </section>
            </div>
          </div>
        )}
        
        {activeTab === 'converter' && (
          <ImageGallery images={galleryImages} onRemoveImage={id => setGalleryImages(prev => prev.filter(img => img.id !== id))} onClearAll={() => {}} language={language} />
        )}
      </main>
      <Footer />
      {croppingTarget && (
        <ImageCropperModal 
          imageUrl={croppingTarget.type === 'original' 
            ? images.find(img => img.id === croppingTarget.id)?.originalData || '' 
            : images.find(img => img.id === croppingTarget.id)?.history[images.find(img => img.id === croppingTarget.id)?.historyIndex || 0] || ''} 
          aspectRatio={aspectRatio} onCancel={() => setCroppingTarget(null)} 
          onCropComplete={url => { 
            if (croppingTarget.type === 'original') { 
              setImages(prev => prev.map(img => img.id === croppingTarget.id ? { ...img, originalData: url, history: [url], historyIndex: 0 } : img)); 
            } else { 
              setImages(prev => prev.map(img => img.id === croppingTarget.id ? { ...img, history: [...img.history, url], historyIndex: img.history.length } : img)); 
            } 
            setCroppingTarget(null); 
          }} 
        />
      )}
      {showSaveModal && (
        <SaveStyleModal 
            folders={styleFolders} 
            onClose={() => setShowSaveModal(false)} 
            onSave={handleSaveStyle} 
            language={language} 
        />
      )}
      {previewingStyle && (
        <StylePreviewModal 
            style={previewingStyle} 
            onClose={() => setPreviewingStyle(null)} 
            onPreviewGenerated={handleUpdateStyleImage} 
            onUpdateStyle={handleUpdateStyle}
            onTryWithPhoto={handleTryWithPhotoFromModal}
            language={language}
        />
      )}
      {editingStyle && <EditStyleModal style={editingStyle} onClose={() => setEditingStyle(null)} onSave={(id, n, p) => setArtStyles(prev => prev.map(s => s.id === id ? {...s, label: n, label_vi: n, prompt: p} : s))} language={language} />}
      
      {styleToDelete && (
        <ConfirmDeleteModal 
          styleName={language === 'vi' ? (styleToDelete.label_vi || styleToDelete.label) : styleToDelete.label}
          onConfirm={confirmStyleDelete}
          onCancel={() => setStyleToDelete(null)}
          language={language}
        />
      )}
    </div>
  );
}
