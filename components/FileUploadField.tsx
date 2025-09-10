
import React from 'react';

interface FileUploadFieldProps {
  label: string;
  name: string;
  files: File | File[] | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  className?: string;
  accept?: string;
  readOnly?: boolean;
  multiple?: boolean;
  description?: string;
}

const FileUploadField: React.FC<FileUploadFieldProps> = ({
  label,
  name,
  files,
  onChange,
  required = false,
  className = '',
  accept="image/*,.pdf",
  readOnly = false,
  multiple = false,
  description = 'PNG, JPG, PDF up to 10MB',
}) => {
  const displayFiles = Array.isArray(files) ? files : (files ? [files] : []);

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className={`mt-1 flex items-center justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md ${readOnly ? 'bg-gray-100 opacity-60 cursor-not-allowed' : ''}`}>
        <div className="space-y-1 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="flex text-sm text-gray-600">
            <label htmlFor={name} className={`relative rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500 ${readOnly ? 'cursor-not-allowed' : 'cursor-pointer bg-white'}`}>
              <span>Upload {multiple ? 'files' : 'a file'}</span>
              <input id={name} name={name} type="file" className="sr-only" onChange={onChange} accept={accept} disabled={readOnly} multiple={multiple} />
            </label>
            <p className="pl-1">or drag and drop</p>
          </div>
          <p className="text-xs text-gray-500">{description}</p>
          {displayFiles.length > 0 && (
            <div className="pt-2 text-sm font-semibold text-green-600 space-y-1 max-h-24 overflow-y-auto">
              {displayFiles.map((file, index) => (
                <p key={index} className="truncate" title={file.name}>{file.name}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileUploadField;