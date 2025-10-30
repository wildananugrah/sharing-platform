// Common types to replace 'any' usage

export interface ApiError {
  field: string;
  message: string;
}

export interface FileUpload {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
}

export interface NotificationData {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  relatedTaskId?: string;
  actor?: {
    name: string;
    email: string;
    image?: string;
  };
}

export interface TaskUpdate {
  [key: string]: unknown;
}

export interface AttachmentData {
  id: string;
  filename: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: Date;
}
