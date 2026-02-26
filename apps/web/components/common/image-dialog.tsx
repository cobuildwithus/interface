"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type ImageDialogProps = {
  images: string[];
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ImageDialog({ images, initialIndex = 0, open, onOpenChange }: ImageDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const hasMultiple = images.length > 1;

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      } else if (e.key === "ArrowLeft") {
        goToPrevious();
      } else if (e.key === "ArrowRight") {
        goToNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, goToPrevious, goToNext, onOpenChange]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicking directly on the backdrop, not on children
    if (e.target === e.currentTarget) {
      onOpenChange(false);
    }
  };

  if (!open || images.length === 0) return null;
  if (typeof document === "undefined") return null;

  const content = (
    // Single container that handles backdrop clicks
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={handleBackdropClick}
    >
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-50 rounded-full bg-white/10 text-white hover:bg-white/20"
        onClick={() => onOpenChange(false)}
      >
        <X className="size-5" />
      </Button>

      {/* Previous button */}
      {hasMultiple && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-1/2 left-4 z-50 -translate-y-1/2 rounded-full bg-white/10 text-white hover:bg-white/20"
          onClick={goToPrevious}
        >
          <ChevronLeft className="size-6" />
        </Button>
      )}

      {/* Image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={images[currentIndex]} alt="" className="max-h-[90vh] max-w-[90vw] object-contain" />

      {/* Next button */}
      {hasMultiple && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-1/2 right-4 z-50 -translate-y-1/2 rounded-full bg-white/10 text-white hover:bg-white/20"
          onClick={goToNext}
        >
          <ChevronRight className="size-6" />
        </Button>
      )}

      {/* Image counter */}
      {hasMultiple && (
        <div className="absolute bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm text-white">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  );

  return createPortal(content, document.body);
}

export function useImageDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [initialIndex, setInitialIndex] = useState(0);
  const [dialogKey, setDialogKey] = useState(0);

  const openImage = useCallback((imageUrls: string[], index = 0) => {
    setImages(imageUrls);
    setInitialIndex(index);
    setDialogKey((prev) => prev + 1);
    setIsOpen(true);
  }, []);

  const closeImage = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    images,
    initialIndex,
    dialogKey,
    openImage,
    closeImage,
    setIsOpen,
  };
}
