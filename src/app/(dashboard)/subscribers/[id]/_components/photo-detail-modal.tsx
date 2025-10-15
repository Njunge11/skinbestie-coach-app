"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Check, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { Photo } from "../types";

interface PhotoDetailModalProps {
  photo: Photo | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: number, feedback: string) => void;
}

export function PhotoDetailModal({
  photo,
  isOpen,
  onClose,
  onSave,
}: PhotoDetailModalProps) {
  const [editingFeedback, setEditingFeedback] = useState("");

  useEffect(() => {
    if (photo) {
      setEditingFeedback(photo.feedback);
    }
  }, [photo]);

  const handleSave = () => {
    if (photo) {
      onSave(photo.id, editingFeedback);
      onClose();
    }
  };

  if (!photo) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">Photo Details</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-96 flex-shrink-0 max-w-full">
            <TransformWrapper
              initialScale={1}
              minScale={0.5}
              maxScale={4}
              wheel={{ step: 0.2 }}
              doubleClick={{ mode: "zoomIn" }}
              panning={{ disabled: false }}
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
                        src={photo.image}
                        alt={photo.month}
                        width={384}
                        height={512}
                        className="object-cover"
                        sizes="(max-width: 768px) 90vw, 384px"
                      />
                    </div>
                  </TransformComponent>
                </div>
              )}
            </TransformWrapper>
          </div>

          <div className="flex-1 min-w-0 space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-1">
                {photo.month}
              </h3>
              <p className="text-sm text-gray-500">
                {new Date(photo.date).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>

            <div className="flex-1">
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Coach Feedback
              </Label>
              <Textarea
                value={editingFeedback}
                onChange={(e) => setEditingFeedback(e.target.value)}
                placeholder="Add your observations and feedback..."
                rows={8}
                className="resize-none w-full md:min-h-[200px]"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave}>
                <Check className="w-4 h-4 mr-2" />
                Save Feedback
              </Button>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
