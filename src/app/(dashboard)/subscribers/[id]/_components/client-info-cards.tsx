"use client";

import { Heart, Droplet, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Client } from "../types";

interface ClientInfoCardsProps {
  client: Client;
}

export function ClientInfoCards({ client }: ClientInfoCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Age Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-2">Age</p>
              <Badge variant="secondary" className="text-sm font-normal">
                {client.age} years
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skin Type Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Droplet className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-2">Skin Type</p>
              <Badge variant="secondary" className="text-sm font-normal">
                {client.skinType}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skin Concerns Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Heart className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-2">
                Skin Concerns
              </p>
              <div className="flex flex-wrap gap-2">
                {client.concerns.length > 0 ? (
                  client.concerns.map((concern) => (
                    <Badge
                      key={concern}
                      variant="secondary"
                      className="text-sm font-normal"
                    >
                      {concern}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No concerns listed
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
