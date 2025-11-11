"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, Droplet } from "lucide-react";
import { useState } from "react";

interface SkinProfileSectionProps {
  skinType: string[] | null;
  age: number;
  concerns: string[];
  startedJourney: string;
}

export function SkinProfileSection({
  skinType,
  age,
  concerns,
  startedJourney,
}: SkinProfileSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Format date to human readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Droplet className="w-5 h-5 text-primary" />
          Skin Profile
        </CardTitle>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {isCollapsed ? "Expand" : "Collapse"}
          <ChevronDown
            className={`w-4 h-4 transition-transform ${
              isCollapsed ? "rotate-180" : ""
            }`}
          />
        </button>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="space-y-4 pb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Skin Type</span>
            <span className="text-sm font-medium">
              {skinType && skinType.length > 0
                ? skinType.join(", ")
                : "Not specified"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Age</span>
            <span className="text-sm font-medium">{age}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Concerns</span>
            <span className="text-sm font-medium">
              {concerns && concerns.length > 0
                ? concerns.join(", ")
                : "Not specified"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Started Journey
            </span>
            <span className="text-sm font-medium">
              {formatDate(startedJourney)}
            </span>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
