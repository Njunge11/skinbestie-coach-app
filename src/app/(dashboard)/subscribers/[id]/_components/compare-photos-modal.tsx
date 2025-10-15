"use client";

import Image from "next/image";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { ZoomIn, ZoomOut, RotateCcw, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Photo } from "../types";

interface ComparePhotosModalProps {
  photos: Photo[];
  isOpen: boolean;
  onClose: () => void;
}

export function ComparePhotosModal({
  photos,
  isOpen,
  onClose,
}: ComparePhotosModalProps) {
  if (photos.length !== 2) return null;

  const [photo1, photo2] = photos;

  // Calculate time difference
  const date1 = new Date(photo1.date);
  const date2 = new Date(photo2.date);
  const daysDiff = Math.abs(
    Math.floor((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24))
  );
  const weeksDiff = Math.floor(daysDiff / 7);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">
            Compare Progress Photos
          </DialogTitle>
          <p className="text-sm text-gray-500">
            {weeksDiff > 0
              ? `${weeksDiff} week${weeksDiff > 1 ? "s" : ""} apart`
              : `${daysDiff} day${daysDiff > 1 ? "s" : ""} apart`}
          </p>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          {/* Photo 1 - Date Header */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {photo1.month}
            </h3>
            <p className="text-sm text-gray-500">
              {date1.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>

          {/* Photo 2 - Date Header */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {photo2.month}
            </h3>
            <p className="text-sm text-gray-500">
              {date2.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>

          {/* Photo 1 - Image with Zoom */}
          <div>
            <TransformWrapper
              initialScale={1}
              minScale={0.5}
              maxScale={4}
              wheel={{ step: 0.2 }}
              doubleClick={{ mode: "zoomIn" }}
            >
              {({ zoomIn, zoomOut, resetTransform }) => (
                <div className="space-y-2">
                  <div className="flex gap-2 justify-start">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => zoomIn()}
                      aria-label="Zoom in"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => zoomOut()}
                      aria-label="Zoom out"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => resetTransform()}
                      aria-label="Reset zoom"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </div>
                  <TransformComponent>
                    <div className="bg-gray-100 rounded-lg border border-gray-200 overflow-hidden">
                      <Image
                        src={photo1.image}
                        alt={photo1.month}
                        width={450}
                        height={600}
                        className="object-cover"
                        sizes="450px"
                      />
                    </div>
                  </TransformComponent>
                </div>
              )}
            </TransformWrapper>
          </div>

          {/* Photo 2 - Image with Zoom */}
          <div>
            <TransformWrapper
              initialScale={1}
              minScale={0.5}
              maxScale={4}
              wheel={{ step: 0.2 }}
              doubleClick={{ mode: "zoomIn" }}
            >
              {({ zoomIn, zoomOut, resetTransform }) => (
                <div className="space-y-2">
                  <div className="flex gap-2 justify-start">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => zoomIn()}
                      aria-label="Zoom in"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => zoomOut()}
                      aria-label="Zoom out"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => resetTransform()}
                      aria-label="Reset zoom"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </div>
                  <TransformComponent>
                    <div className="bg-gray-100 rounded-lg border border-gray-200 overflow-hidden">
                      <Image
                        src={photo2.image}
                        alt={photo2.month}
                        width={450}
                        height={600}
                        className="object-cover"
                        sizes="450px"
                      />
                    </div>
                  </TransformComponent>
                </div>
              )}
            </TransformWrapper>
          </div>

          {/* Photo 1 - Feedback */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Coach Feedback
            </h4>
            <p className="text-sm text-gray-600">
              {photo1.feedback || "No feedback provided"}
            </p>
          </div>

          {/* Photo 2 - Feedback */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Coach Feedback
            </h4>
            <p className="text-sm text-gray-600">
              {photo2.feedback || "No feedback provided"}
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose}>Close Comparison</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
