import React, { useState } from 'react';

interface RatingFieldProps {
  label: string;
  name: string;
  value: number;
  onChange: (name: string, value: number) => void;
  required?: boolean;
  className?: string;
  readOnly?: boolean;
}

const StarIcon: React.FC<{ filled: boolean; onMouseEnter: () => void; onClick: () => void; isReadOnly: boolean }> = ({ filled, onMouseEnter, onClick, isReadOnly }) => (
  <svg
    onMouseEnter={onMouseEnter}
    onClick={onClick}
    className={`w-8 h-8 transition-colors duration-200 ${filled ? 'text-yellow-400' : 'text-gray-300'} ${!isReadOnly ? 'cursor-pointer hover:text-yellow-300' : ''}`}
    fill="currentColor"
    viewBox="0 0 20 20"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const ratingDescriptions: { [key: number]: string } = {
    1: 'Not Effective',
    2: 'Somewhat Ineffective',
    3: 'Neutral',
    4: 'Effective',
    5: 'Very Effective',
};


const RatingField: React.FC<RatingFieldProps> = ({ label, name, value, onChange, required = false, className = 'md:col-span-2', readOnly = false }) => {
  const [hoverValue, setHoverValue] = useState(0);
  
  const displayValue = hoverValue || value;
  const description = displayValue > 0 ? ratingDescriptions[displayValue] : '';

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="flex items-center" onMouseLeave={!readOnly ? () => setHoverValue(0) : undefined}>
        <div className="flex items-center space-x-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <StarIcon
              key={star}
              filled={displayValue >= star}
              onMouseEnter={!readOnly ? () => setHoverValue(star) : () => {}}
              onClick={!readOnly ? () => onChange(name, star) : () => {}}
              isReadOnly={readOnly}
            />
          ))}
        </div>
        {description && <span className="ml-4 text-gray-700 font-medium">{description}</span>}
      </div>
    </div>
  );
};

export default RatingField;