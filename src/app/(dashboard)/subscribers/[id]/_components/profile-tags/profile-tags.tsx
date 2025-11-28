"use client";

import { useState, useOptimistic, startTransition } from "react";
import { X, Plus, Tag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ProfileTag } from "../../types";

interface ProfileTagsProps {
  tags: ProfileTag[];
  userId: string;
  onAddTag: (tag: string) => Promise<void>;
  onRemoveTag: (tagId: string) => Promise<void>;
}

export function ProfileTags({
  tags,
  userId,
  onAddTag,
  onRemoveTag,
}: ProfileTagsProps) {
  const [optimisticTags, setOptimisticTags] = useOptimistic(tags);
  const [inputValue, setInputValue] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAddTag = async () => {
    const trimmedTag = inputValue.trim();

    // Validate
    if (!trimmedTag) return;

    // Check for duplicates
    if (
      optimisticTags.some(
        (t) => t.tag.toLowerCase() === trimmedTag.toLowerCase(),
      )
    ) {
      return;
    }

    // Create optimistic tag
    const optimisticTag: ProfileTag = {
      id: `temp-${Date.now()}`,
      userProfileId: userId,
      tag: trimmedTag,
      createdAt: new Date(),
    };

    // Optimistic update
    startTransition(() => {
      setOptimisticTags([...optimisticTags, optimisticTag]);
    });

    // Clear input immediately for better UX
    setInputValue("");
    setIsAdding(true);

    // Call server action
    try {
      await onAddTag(trimmedTag);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    // Optimistic update
    startTransition(() => {
      setOptimisticTags(optimisticTags.filter((t) => t.id !== tagId));
    });

    // Call server action
    await onRemoveTag(tagId);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-primary" />
          Key Information
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Track important details from calls and interactions to personalise
          their skincare journey
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Input row */}
        <div className="flex gap-2">
          <Input
            placeholder="e.g., Allergic to fragrance, Prefers natural products..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isAdding}
            className="flex-1"
          />
          <Button
            onClick={handleAddTag}
            disabled={!inputValue.trim() || isAdding}
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>

        {/* Tags display */}
        {optimisticTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {optimisticTags.map((tag) => (
              <Badge
                key={tag.id}
                variant="secondary"
                className="flex items-center gap-1 px-3 py-1"
              >
                {tag.tag}
                <button
                  onClick={() => handleRemoveTag(tag.id)}
                  className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5 transition-colors"
                  aria-label={`Remove ${tag.tag}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
