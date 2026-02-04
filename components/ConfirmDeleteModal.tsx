
import React from 'react';

interface ConfirmDeleteModalProps {
  styleName: string;
  onConfirm: () => void;
  onCancel: () => void;
  language?: 'vi' | 'en';
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({ styleName, onConfirm, onCancel, language = 'vi' }) => {
  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onCancel}
    >
      <div 
        className="bg-[#1e293b] w-full max-w-[320px] rounded-[32px] p-8 shadow-2xl relative border border-white/10 animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Nút đóng X ở góc */}
        <button 
          onClick={onCancel}
          className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex flex-col items-center text-center">
          {/* Icon cảnh báo màu đỏ */}
          <div className="w-16 h-16 bg-[#ef4444]/10 rounded-2xl flex items-center justify-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-[#ef4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <h3 className="text-2xl font-black text-white mb-2 tracking-tight">
            {language === 'vi' ? 'Xác nhận xóa' : 'Confirm Delete'}
          </h3>
          
          <p className="text-gray-400 text-lg mb-8 font-medium">
            {language === 'vi' ? `Xóa "${styleName}"?` : `Delete "${styleName}"?`}
          </p>

          <div className="w-full space-y-3">
            <button 
              onClick={onConfirm}
              className="w-full py-4 text-lg font-black text-white bg-[#ef4444] hover:bg-[#dc2626] rounded-2xl shadow-lg transition-all active:scale-95"
            >
              {language === 'vi' ? 'Xác nhận xóa' : 'Confirm Delete'}
            </button>
            <button 
              onClick={onCancel}
              className="w-full py-4 text-lg font-black text-white bg-transparent border-2 border-white/20 hover:border-white/40 rounded-2xl transition-all active:scale-95"
            >
              {language === 'vi' ? 'Hủy bỏ' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;
