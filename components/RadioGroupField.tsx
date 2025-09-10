
import React from 'react';

interface RadioGroupFieldProps {
  label: string;
  name: string;
  value: boolean | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  className?: string;
  readOnly?: boolean;
}

const RadioGroupField: React.FC<RadioGroupFieldProps> = ({
  label,
  name,
  value,
  onChange,
  required = false,
  className = '',
  readOnly = false,
}) => {
  return (
    <div className={className}>
      <p className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </p>
      <div className="flex items-center space-x-6">
        <div className="flex items-center">
          <input
            id={`${name}-yes`}
            name={name}
            type="radio"
            value="true"
            checked={value === true}
            onChange={onChange}
            disabled={readOnly}
            className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <label htmlFor={`${name}-yes`} className="ml-2 block text-sm text-gray-900">
            Yes
          </label>
        </div>
        <div className="flex items-center">
          <input
            id={`${name}-no`}
            name={name}
            type="radio"
            value="false"
            checked={value === false}
            onChange={onChange}
            disabled={readOnly}
            className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <label htmlFor={`${name}-no`} className="ml-2 block text-sm text-gray-900">
            No
          </label>
        </div>
      </div>
    </div>
  );
};

export default RadioGroupField;