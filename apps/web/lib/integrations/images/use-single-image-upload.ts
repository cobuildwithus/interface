"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { uploadImage, validateImageFile } from "@/lib/integrations/images/upload-client";
import {
  handleUploadImageError,
  revokeTrackedObjectUrl,
} from "@/lib/integrations/images/upload-flow";

type UseSingleImageUploadOptions = {
  initialImageUrl?: string | null;
  uploadSuccessMessage?: string | null;
  authErrorMessage?: string | null;
  onAuthError?: () => void;
};

export function useSingleImageUpload({
  initialImageUrl = null,
  uploadSuccessMessage = null,
  authErrorMessage,
  onAuthError,
}: UseSingleImageUploadOptions = {}) {
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const trackedPreviewUrlRef = useRef<string | null>(null);
  const trackedObjectUrlsRef = useRef(new Set<string>());

  const clearPreview = useCallback(() => {
    const trackedPreviewUrl = trackedPreviewUrlRef.current;
    if (trackedPreviewUrl) {
      revokeTrackedObjectUrl(trackedPreviewUrl, trackedObjectUrlsRef.current);
      trackedPreviewUrlRef.current = null;
    }
    setPreviewUrl(null);
  }, []);

  useEffect(() => {
    const trackedObjectUrls = trackedObjectUrlsRef.current;

    return () => {
      clearPreview();
      for (const url of trackedObjectUrls) {
        URL.revokeObjectURL(url);
      }
      trackedObjectUrls.clear();
    };
  }, [clearPreview]);

  const uploadFile = useCallback(
    async (file: File) => {
      if (isUploading) {
        return { isAuthError: false, uploaded: false };
      }

      const validation = validateImageFile(file);
      if (!validation.ok) {
        toast.error(validation.message);
        return { isAuthError: false, uploaded: false };
      }

      clearPreview();

      const nextPreviewUrl = URL.createObjectURL(file);
      trackedPreviewUrlRef.current = nextPreviewUrl;
      trackedObjectUrlsRef.current.add(nextPreviewUrl);
      setPreviewUrl(nextPreviewUrl);
      setIsUploading(true);

      try {
        const uploadedUrl = await uploadImage(file);
        setImageUrl(uploadedUrl);
        clearPreview();

        if (uploadSuccessMessage) {
          toast.success(uploadSuccessMessage);
        }

        return { isAuthError: false, uploaded: true, url: uploadedUrl };
      } catch (error) {
        const handled = handleUploadImageError(error, {
          onAuthError,
          authErrorMessage,
          fallbackMessage: "Upload failed.",
          onToastError: toast.error,
        });
        clearPreview();
        return { isAuthError: handled.isAuthError, uploaded: false };
      } finally {
        setIsUploading(false);
      }
    },
    [authErrorMessage, clearPreview, isUploading, onAuthError, uploadSuccessMessage]
  );

  const clearImage = useCallback(() => {
    setImageUrl(null);
    clearPreview();
  }, [clearPreview]);

  return {
    clearImage,
    imageUrl,
    isUploading,
    previewSrc: previewUrl ?? imageUrl ?? null,
    setImageUrl,
    uploadFile,
  };
}
