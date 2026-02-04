
import React, { useRef } from 'react';

interface HeaderProps {
  language: 'vi' | 'en';
  activeTab: 'converter' | 'thumbnail';
  onTabChange: (tab: 'converter' | 'thumbnail') => void;
  onLanguageChange: (lang: 'vi' | 'en') => void;
  onSaveAll: () => void;
  onExportConfig: () => void;
  onImportConfig: (file: File) => void;
  isSaving?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  language, 
  activeTab, 
  onTabChange, 
  onLanguageChange, 
  onSaveAll, 
  onExportConfig,
  onImportConfig,
  isSaving 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImportConfig(e.target.files[0]);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 backdrop-blur-md sticky top-0 z-50 shadow-sm">
      <div className="w-full px-3 md:px-6 py-3 flex flex-col gap-3">
        
        {/* Row 1: Logo + Main Tools (Visible immediately on mobile) */}
        <div className="flex items-center justify-between w-full gap-2">
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                <div className="bg-[#4A6B5D] p-2 rounded-lg sm:rounded-xl shadow-inner">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-7 sm:w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                </div>
                <div className="hidden min-[400px]:block">
                    <h1 className="text-base sm:text-2xl font-black text-[#423a3a] tracking-tight uppercase leading-none">
                        AI STYLE
                    </h1>
                </div>
            </div>

            {/* Tools Area */}
            <div className="flex items-center gap-1.5 sm:gap-3">
                {/* Import/Export Group */}
                <div className="flex items-center gap-1 sm:gap-2 pr-1 sm:pr-3 border-r border-gray-100">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
                    <button 
                        onClick={handleImportClick}
                        className="p-1.5 sm:p-2.5 text-black hover:text-[#4A6B5D] hover:bg-gray-100 rounded-xl transition-all border border-black/5 shadow-sm active:scale-95"
                        title={language === 'vi' ? 'Nhập cấu hình' : 'Import Config'}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                    </button>
                    <button 
                        onClick={onExportConfig}
                        className="p-1.5 sm:p-2.5 text-black hover:text-[#4A6B5D] hover:bg-gray-100 rounded-xl transition-all border border-black/5 shadow-sm active:scale-95"
                        title={language === 'vi' ? 'Xuất cấu hình' : 'Export Config'}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                    </button>
                </div>

                {/* Save Button */}
                <button 
                    onClick={onSaveAll}
                    disabled={isSaving}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 ${isSaving ? 'bg-gray-100 text-gray-400' : 'bg-[#4A6B5D] text-white hover:bg-[#3e5a4e]'}`}
                >
                    {isSaving ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400"></div>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                        </svg>
                    )}
                    <span className="hidden min-[480px]:inline">{language === 'vi' ? 'Lưu dự án' : 'Save'}</span>
                </button>

                {/* Language Switch */}
                <div className="flex items-center gap-0.5 bg-gray-100 p-0.5 sm:p-1 rounded-lg border border-gray-200 shrink-0">
                    <button 
                        onClick={() => onLanguageChange('vi')}
                        className={`px-2 py-1 text-[9px] font-black rounded-md transition-all ${language === 'vi' ? 'bg-white text-[#4A6B5D] shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
                    >
                        VI
                    </button>
                    <button 
                        onClick={() => onLanguageChange('en')}
                        className={`px-2 py-1 text-[9px] font-black rounded-md transition-all ${language === 'en' ? 'bg-white text-[#4A6B5D] shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
                    >
                        EN
                    </button>
                </div>
            </div>
        </div>

        {/* Row 2: Tab Navigation (Centered) */}
        <div className="flex justify-center">
            <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 shadow-inner w-full sm:w-auto">
                <button 
                    onClick={() => onTabChange('converter')}
                    className={`flex-1 sm:flex-none px-4 sm:px-6 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${activeTab === 'converter' ? 'bg-white text-[#4A6B5D] shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    {language === 'vi' ? 'Chuyển đổi' : 'Converter'}
                </button>
                <button 
                    onClick={() => onTabChange('thumbnail')}
                    className={`flex-1 sm:flex-none px-4 sm:px-6 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${activeTab === 'thumbnail' ? 'bg-white text-[#4A6B5D] shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>
                    {language === 'vi' ? 'Thumbnail' : 'Thumbnail'}
                </button>
            </div>
        </div>

      </div>
    </header>
  );
};
