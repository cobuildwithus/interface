"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ImagePlus } from "lucide-react";
import {
  useDropzone,
  type DropzoneInputProps,
  type DropzoneRootProps,
  type FileRejection,
} from "react-dropzone";
import {
  IMAGE_ACCEPT_ATTRIBUTE,
  MAX_IMAGE_SIZE_BYTES,
  getImageRejectionMessage,
  validateImageFile,
} from "@/lib/integrations/images/upload-client";

type ImageDropzoneRenderProps = {
  rootProps: DropzoneRootProps;
  inputProps: DropzoneInputProps;
  open: () => void;
  isDragActive: boolean;
};

type ImageDropzoneProps = {
  disabled?: boolean;
  multiple?: boolean;
  maxFiles?: number;
  onDropFile?: (file: File) => void | Promise<void>;
  onDropFiles?: (files: File[]) => void | Promise<void>;
  onDropRejected?: (message: string | null) => void;
  globalDrop?: boolean;
  children: (props: ImageDropzoneRenderProps) => ReactNode;
};

type ImageDropzoneOverlayProps = {
  active: boolean;
  title: string;
  description: string;
};

const formatMaxFilesMessage = (maxFiles: number) => {
  const label = maxFiles === 1 ? "image" : "images";
  return `You can attach up to ${maxFiles} ${label}.`;
};

export function ImageDropzoneOverlay({ active, title, description }: ImageDropzoneOverlayProps) {
  if (!active) return null;

  return (
    <div className="bg-background/70 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
      <div className="border-border bg-card/90 w-full max-w-md rounded-3xl border px-10 py-8 text-center shadow-xl">
        <div className="bg-muted mx-auto mb-4 grid size-14 place-items-center rounded-2xl">
          <ImagePlus className="text-foreground size-6" />
        </div>
        <p className="text-lg font-semibold">{title}</p>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      </div>
    </div>
  );
}

export function ImageDropzone({
  disabled,
  multiple,
  maxFiles,
  onDropFile,
  onDropFiles,
  onDropRejected,
  globalDrop = false,
  children,
}: ImageDropzoneProps) {
  const [isGlobalDragActive, setIsGlobalDragActive] = useState(false);
  const dragCounterRef = useRef(0);

  const allowMultiple = Boolean(multiple);
  const resolvedMaxFiles = allowMultiple ? maxFiles : 1;

  const handleFileList = useCallback(
    (files: File[]) => {
      if (!files.length) return;
      if (resolvedMaxFiles && files.length > resolvedMaxFiles) {
        onDropRejected?.(formatMaxFilesMessage(resolvedMaxFiles));
      }

      const candidates = resolvedMaxFiles ? files.slice(0, resolvedMaxFiles) : files;
      const validFiles = candidates.filter((file) => {
        const validation = validateImageFile(file);
        if (!validation.ok) {
          onDropRejected?.(getImageRejectionMessage(validation.code) ?? validation.message ?? null);
          return false;
        }
        return true;
      });

      if (!validFiles.length) return;
      if (onDropFiles) {
        void onDropFiles(validFiles);
        return;
      }
      const file = validFiles[0];
      if (file && onDropFile) {
        void onDropFile(file);
      }
    },
    [onDropFile, onDropFiles, onDropRejected, resolvedMaxFiles]
  );

  const handleDrop = useCallback(
    (acceptedFiles: File[]) => {
      handleFileList(acceptedFiles);
    },
    [handleFileList]
  );

  const handleDropRejected = useCallback(
    (rejections: FileRejection[]) => {
      if (!onDropRejected) return;
      const errorCode = rejections[0]?.errors?.[0]?.code;
      let errorMessage = getImageRejectionMessage(errorCode);
      if (errorCode === "too-many-files" && maxFiles) {
        errorMessage = formatMaxFilesMessage(maxFiles);
      }
      onDropRejected(errorMessage);
    },
    [maxFiles, onDropRejected]
  );
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: handleDrop,
    onDropRejected: handleDropRejected,
    accept: { "image/*": [] },
    multiple: allowMultiple,
    maxFiles: resolvedMaxFiles,
    maxSize: MAX_IMAGE_SIZE_BYTES,
    noClick: true,
    noKeyboard: true,
    disabled,
  });

  useEffect(() => {
    if (!globalDrop || disabled) return;

    const hasFiles = (event: DragEvent) => event.dataTransfer?.types?.includes("Files");
    const handleDragEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragCounterRef.current += 1;
      setIsGlobalDragActive(true);
    };
    const handleDragOver = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
    };
    const handleDragLeave = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
      if (dragCounterRef.current === 0) {
        setIsGlobalDragActive(false);
      }
    };
    const handleDropEvent = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragCounterRef.current = 0;
      setIsGlobalDragActive(false);
      if (disabled) return;
      handleFileList(Array.from(event.dataTransfer?.files ?? []));
    };

    document.addEventListener("dragenter", handleDragEnter);
    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("dragleave", handleDragLeave);
    document.addEventListener("drop", handleDropEvent);

    return () => {
      document.removeEventListener("dragenter", handleDragEnter);
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("dragleave", handleDragLeave);
      document.removeEventListener("drop", handleDropEvent);
    };
  }, [disabled, globalDrop, handleFileList]);

  const rootProps = getRootProps();
  const inputProps = getInputProps({ accept: IMAGE_ACCEPT_ATTRIBUTE, multiple: allowMultiple });
  const active = isDragActive || isGlobalDragActive;

  return children({ rootProps, inputProps, open, isDragActive: active });
}
