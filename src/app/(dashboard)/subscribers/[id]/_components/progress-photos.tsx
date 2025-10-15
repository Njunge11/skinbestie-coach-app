"use client";

import { useState } from "react";
import Image from "next/image";
import { CheckCircle2, GitCompare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PhotoDetailModal } from "./photo-detail-modal";
import { ComparePhotosModal } from "./compare-photos-modal";
import type { Photo } from "../types";

interface ProgressPhotosProps {
  photos: Photo[];
  onUpdateFeedback: (id: number, feedback: string) => void;
  isCompareMode: boolean;
  selectedPhotos: Photo[];
  onPhotoSelect: (photo: Photo) => void;
  onToggleCompareMode: () => void;
}

export function ProgressPhotos({
  photos,
  onUpdateFeedback,
  isCompareMode,
  selectedPhotos,
  onPhotoSelect,
  onToggleCompareMode,
}: ProgressPhotosProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  const handlePhotoClick = (photo: Photo) => {
    if (isCompareMode) {
      onPhotoSelect(photo);
    } else {
      setSelectedPhoto(photo);
    }
  };

  const isSelected = (photoId: number) => {
    return selectedPhotos.some((p) => p.id === photoId);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Progress Photos</CardTitle>
          <Button
            variant={isCompareMode ? "default" : "outline"}
            size="sm"
            onClick={onToggleCompareMode}
          >
            <GitCompare className="w-4 h-4 mr-2" />
            {isCompareMode ? "Cancel Compare" : "Compare Photos"}
          </Button>
        </CardHeader>
        <CardContent>
          {isCompareMode && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                Select 2 photos to compare ({selectedPhotos.length}/2 selected)
              </p>
            </div>
          )}
          <div className="grid grid-cols-4 gap-4">
            {photos.map((photo) => (
              <button
                key={photo.id}
                className="group cursor-pointer text-left relative"
                onClick={() => handlePhotoClick(photo)}
              >
                <div
                  className={`aspect-[3/4] bg-gray-100 rounded-lg border-2 overflow-hidden mb-2 transition-all relative ${
                    isSelected(photo.id)
                      ? "border-blue-500 ring-2 ring-blue-200"
                      : "border-gray-200 group-hover:border-gray-300"
                  }`}
                >
                  <Image
                    src={photo.image}
                    alt={photo.month}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                  />
                  {isSelected(photo.id) && (
                    <div className="absolute top-2 right-2 bg-blue-500 rounded-full p-1">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-0.5">
                    {photo.month}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(photo.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <PhotoDetailModal
        photo={selectedPhoto}
        isOpen={!!selectedPhoto && !isCompareMode}
        onClose={() => setSelectedPhoto(null)}
        onSave={onUpdateFeedback}
      />

      <ComparePhotosModal
        photos={selectedPhotos}
        isOpen={selectedPhotos.length === 2}
        onClose={onToggleCompareMode}
      />
    </>
  );
}
