'use client';

import { useState, useRef, useCallback } from 'react';
import { useNotification } from '@/components/Notification';

interface FileUploadProps {
  taskId: number;
  onUploadSuccess: (attachment: any) => void;
  onUploadError: (error: string) => void;
}

interface UploadProgress {
  file: File;
  progress: number;
  uploading: boolean;
  error?: string;
}

export default function FileUpload({ taskId, onUploadSuccess, onUploadError }: FileUploadProps) {
  const { notify } = useNotification();
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  }, []);

  const handleFiles = useCallback((files: File[]) => {
    files.forEach(file => {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        onUploadError(`File "${file.name}" is too large (max 10MB)`);
        return;
      }

      uploadFile(file);
    });
  }, [taskId, onUploadSuccess, onUploadError]);

  const uploadFile = async (file: File) => {
    const uploadId = Math.random().toString(36).substr(2, 9);

    // Add to uploads state
    setUploads(prev => [...prev, {
      file,
      progress: 0,
      uploading: true
    }]);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploads(prev => prev.map(upload =>
            upload.file === file ? { ...upload, progress } : upload
          ));
        }
      };

      // Handle completion
      xhr.onload = () => {
        if (xhr.status === 201) {
          const attachment = JSON.parse(xhr.responseText);
          onUploadSuccess(attachment);

          // Remove from uploads after success
          setUploads(prev => prev.filter(upload => upload.file !== file));
          notify(`File "${file.name}" uploaded successfully!`, { type: 'success' });
        } else {
          const error = JSON.parse(xhr.responseText);
          setUploads(prev => prev.map(upload =>
            upload.file === file ? {
              ...upload,
              uploading: false,
              error: error.error || 'Upload failed'
            } : upload
          ));
          notify(`Failed to upload "${file.name}"`, { type: 'error' });
        }
      };

      // Handle errors
      xhr.onerror = () => {
        setUploads(prev => prev.map(upload =>
          upload.file === file ? {
            ...upload,
            uploading: false,
            error: 'Upload failed'
          } : upload
        ));
        notify(`Failed to upload "${file.name}"`, { type: 'error' });
      };

      xhr.open('POST', `/api/tasks/${taskId}/attachments`);
      xhr.send(formData);

    } catch (error) {
      console.error('Upload error:', error);
      setUploads(prev => prev.map(upload =>
        upload.file === file ? {
          ...upload,
          uploading: false,
          error: 'Upload failed'
        } : upload
      ));
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const removeUpload = (file: File) => {
    setUploads(prev => prev.filter(upload => upload.file !== file));
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          accept="*/*"
        />

        <div className="flex flex-col items-center">
          <svg
            className="w-8 h-8 text-gray-400 mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="text-sm text-gray-600 mb-1">
            <span className="font-medium text-blue-600 cursor-pointer hover:underline">
              Click to upload
            </span>{' '}
            or drag and drop
          </p>
          <p className="text-xs text-gray-500">Max file size: 10MB</p>
        </div>
      </div>

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Uploading files...</h4>
          {uploads.map((upload, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700 truncate">
                    {upload.file.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({formatFileSize(upload.file.size)})
                  </span>
                </div>

                <button
                  onClick={() => removeUpload(upload.file)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {upload.uploading ? (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Uploading...</span>
                    <span>{upload.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${upload.progress}%` }}
                    ></div>
                  </div>
                </div>
              ) : upload.error ? (
                <div className="text-xs text-red-600">
                  Error: {upload.error}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}