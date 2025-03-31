"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/lib/supabase/client";

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: "idle" | "uploading" | "success" | "error";
  url?: string;
  error?: string;
}

type FileCategory =
  | "image"
  | "document"
  | "archive"
  | "video"
  | "audio"
  | "other";

interface UploadContextType {
  files: UploadFile[];
  addFiles: (files: File[]) => void;
  removeFile: (id: string) => void;
  clearFiles: () => void;
  uploadFiles: (
    path: string,
    options?: {
      onProgress?: (progress: number, fileId: string) => void;
      metadata?: Record<string, any>;
    },
  ) => Promise<string[]>;
  getFileCategory: (file: File) => FileCategory;
  isUploading: boolean;
}

const UploadContext = createContext<UploadContextType>({
  files: [],
  addFiles: () => {},
  removeFile: () => {},
  clearFiles: () => {},
  uploadFiles: async () => [],
  getFileCategory: () => "other",
  isUploading: false,
});

export function UploadProvider({ children }: { children: ReactNode }) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const addFiles = (newFiles: File[]) => {
    const uploadFiles = newFiles.map((file) => ({
      id: uuidv4(),
      file,
      progress: 0,
      status: "idle" as const,
    }));

    setFiles((prevFiles) => [...prevFiles, ...uploadFiles]);
  };

  const removeFile = (id: string) => {
    setFiles((prevFiles) => prevFiles.filter((file) => file.id !== id));
  };

  const clearFiles = () => {
    setFiles([]);
  };

  const getFileCategory = (file: File): FileCategory => {
    const type = file.type.split("/")[0];

    switch (type) {
      case "image":
        return "image";
      case "application":
        if (
          file.type.includes("pdf") ||
          file.type.includes("document") ||
          file.type.includes("sheet") ||
          file.type.includes("presentation")
        ) {
          return "document";
        } else if (
          file.type.includes("zip") ||
          file.type.includes("rar") ||
          file.type.includes("tar") ||
          file.type.includes("gzip")
        ) {
          return "archive";
        }
        return "other";
      case "video":
        return "video";
      case "audio":
        return "audio";
      default:
        return "other";
    }
  };

  const uploadFiles = async (
    path: string,
    options?: {
      onProgress?: (progress: number, fileId: string) => void;
      metadata?: Record<string, any>;
    },
  ): Promise<string[]> => {
    setIsUploading(true);

    const uploadedUrls: string[] = [];

    try {
      // Process files one at a time for more reliable uploads
      for (const fileData of files) {
        if (fileData.status === "success") {
          // Skip already uploaded files
          if (fileData.url) {
            uploadedUrls.push(fileData.url);
          }
          continue;
        }

        // Update file status to uploading
        setFiles((prevFiles) =>
          prevFiles.map((f) =>
            f.id === fileData.id ? { ...f, status: "uploading" } : f,
          ),
        );

        // Create unique file path
        const fileExt = fileData.file.name.split(".").pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `${path}/${fileName}`;

        // Upload file to Supabase Storage
        const { error: uploadError, data } = await supabase.storage
          .from("files")
          .upload(filePath, fileData.file, {
            cacheControl: "3600",
            upsert: false,
            contentType: fileData.file.type,
            onUploadProgress: (event) => {
              const progress = (event.loaded / event.total) * 100;

              // Update file progress
              setFiles((prevFiles) =>
                prevFiles.map((f) =>
                  f.id === fileData.id ? { ...f, progress } : f,
                ),
              );

              if (options?.onProgress) {
                options.onProgress(progress, fileData.id);
              }
            },
          });

        if (uploadError) {
          throw new Error(`Error uploading file: ${uploadError.message}`);
        }

        // Get public URL for the uploaded file
        const {
          data: { publicUrl },
        } = supabase.storage.from("files").getPublicUrl(filePath);

        // Update file status to success
        setFiles((prevFiles) =>
          prevFiles.map((f) =>
            f.id === fileData.id
              ? { ...f, status: "success", url: publicUrl, progress: 100 }
              : f,
          ),
        );

        uploadedUrls.push(publicUrl);

        // Save file metadata to database if needed
        if (options?.metadata) {
          const { error: metadataError } = await supabase.from("files").insert({
            name: fileData.file.name,
            type: fileData.file.type,
            size: fileData.file.size,
            url: publicUrl,
            ...options.metadata,
          });

          if (metadataError) {
            console.error("Error saving file metadata:", metadataError);
          }
        }
      }

      return uploadedUrls;
    } catch (error: any) {
      // Update file status to error
      setFiles((prevFiles) =>
        prevFiles.map((f) =>
          f.status === "uploading"
            ? { ...f, status: "error", error: error.message }
            : f,
        ),
      );

      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <UploadContext.Provider
      value={{
        files,
        addFiles,
        removeFile,
        clearFiles,
        uploadFiles,
        getFileCategory,
        isUploading,
      }}
    >
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  return useContext(UploadContext);
}
