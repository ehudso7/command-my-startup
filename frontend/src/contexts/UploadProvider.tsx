"use client";

import React from "react";
import { createContext, useContext, useState } from "react";

interface UploadContextType {
  // Define your upload state and methods here
  isUploading: boolean;
  uploadProgress: number;
  startUpload: () => void;
  completeUpload: () => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const startUpload = () => setIsUploading(true);
  const completeUpload = () => {
    setIsUploading(false);
    setUploadProgress(0);
  };

  return (
    <UploadContext.Provider
      value={{ isUploading, uploadProgress, startUpload, completeUpload }}
    >
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error("useUpload must be used within an UploadProvider");
  }
  return context;
}
