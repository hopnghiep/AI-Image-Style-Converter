
import React from 'react';

interface StyleInfluenceSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  language?: 'vi' | 'en';
}

const StyleInfluenceSlider: React.FC<StyleInfluenceSliderProps> = ({ value, onChange, disabled = false, language = 'vi' }) => {
  const getInfluenceLabel = (val: number) => {
    if (val < 25) return language === 'vi' ? 'Rất nhẹ' : 'Very Subtle';
    if (val < 45) return language === 'vi' ? 'Nhẹ nhàng' : 'Subtle';
    if (val > 85) return language === 'vi' ? 'Biến hóa mạnh' : 'Strongly Transformed';
    if (val > 65) return language === 'vi' ? 'Mạnh mẽ' : 'Strong';
    return language === 'vi' ? 'Cân bằng' : 'Balanced';
  };

  return (
    <div className={`mt-6 mb-2 ${disabled ? 'opacity-50 pointer-events-none' : ''} animate-fade-in`}>
      <h2 className="text-lg font-normal mb-4 text-[#4A6B5D]">
        {language === 'vi' ? 'Mức độ ảnh hưởng style' : 'Style Influence'}
      </h2>
      <div className="flex justify-between items-center mb-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
        <span>{language === 'vi' ? 'Gốc' : 'Original'}</span>
        <span>{language === 'vi' ? 'Style AI' : 'Style AI'}</span>
      </div>
      <div className="relative flex items-center h-6">
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          disabled={disabled}
          className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer
                     [&::-webkit-slider-thumb]:appearance-none
                     [&::-webkit-slider-thumb]:h-5
                     [&::-webkit-slider-thumb]:w-5
                     [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:bg-[#4A6B5D]
                     [&::-webkit-slider-thumb]:border-2
                     [&::-webkit-slider-thumb]:border-white
                     [&::-webkit-slider-thumb]:shadow-md
                     [&::-moz-range-thumb]:h-5
                     [&::-moz-range-thumb]:w-5
                     [&::-moz-range-thumb]:rounded-full
                     [&::-moz-range-thumb]:bg-[#4A6B5D]
                     [&::-moz-range-thumb]:border-2
                     [&::-moz-range-thumb]:border-white"
        />
      </div>
      <div className="text-center mt-3 font-black text-xs text-[#4A6B5D] uppercase tracking-wider bg-[#4A6B5D]/5 py-1.5 rounded-lg border border-[#4A6B5D]/10">
        {getInfluenceLabel(value)} ({value}%)
      </div>
    </div>
  );
};

export default StyleInfluenceSlider;
