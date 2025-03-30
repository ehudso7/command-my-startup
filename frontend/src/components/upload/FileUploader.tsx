'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useUpload } from '@/contexts/UploadContext';
import FilePreview from './FilePreview';

interface FileUploaderProps {
  maxFiles?: number;
  maxSize?: number; // in bytes
  acceptedTypes?: Record<string, string[]>;
  onUploadComplete?: (urls: string[]) => void;
  path: string;
  metadata?: Record<string, any>;
  className?: string;
}

export default function FileUploader({
  maxFiles = 10,
  maxSize = 10 * 1024 * 1024, // 10MB
  acceptedTypes,
  onUploadComplete,
  path,
  metadata,
  className = ''
}: FileUploaderProps) {
  const { files, addFiles, removeFile, clearFiles, uploadFiles, isUploading } = useUpload();
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      // Handle rejected files
      if (rejectedFiles.length > 0) {
        const errors = rejectedFiles.map(rejected => {
          const error = rejected.errors[0];
          return `${rejected.file.name}: ${error.message}`;
        });
        
        setError(errors.join(', '));
        return;
      }
      
      // Check if adding these files would exceed maxFiles
      if (files.length + acceptedFiles.length > maxFiles) {
        setError(`You can only upload up to ${maxFiles} files at a time.`);
        return;
      }
      
      setError(null);
      addFiles(acceptedFiles);
    },
    [files.length, maxFiles, addFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize,
    maxFiles: maxFiles - files.length,
    accept: acceptedTypes,
    disabled: isUploading
  });

  const handleUpload = async () => {
    try {
      if (files.length === 0) {
        setError('Please add at least one file');
        return;
      }
      
      setError(null);
      const urls = await uploadFiles(path, { metadata });
      
      if (onUploadComplete) {
        onUploadComplete(urls);
      }
      
      clearFiles();
    } catch (error: any) {
      setError(error.message);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${
          isDragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900 dark:border-blue-500'
            : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
        } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center py-4">
          <svg
            className="w-10 h-10 text-gray-400 dark:text-gray-500 mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          
          {isDragActive ? (
            <p className="text-lg font-medium">Drop the files here...</p>
          ) : (
            <div>
              <p className="text-lg font-medium">
                Drag & drop files, or <span className="text-blue-600 dark:text-blue-400">browse</span>
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Upload up to {maxFiles} files (max {(maxSize / (1024 * 1024)).toFixed(0)}MB each)
              </p>
            </div>
          )}
        </div>
      </div>
      
      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 rounded">
          {error}
        </div>
      )}
      
      {files.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            {files.map(file => (
              <FilePreview
                key={file.id}
                file={file}
                onRemove={() => removeFile(file.id)}
                disabled={isUploading}
              />
            ))}
          </div>
          
          <div className="flex justify-between">
            <button
              type="button"
              onClick={clearFiles}
              disabled={isUploading}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear All
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={files.length === 0 || isUploading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Uploading...' : 'Upload Files'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
