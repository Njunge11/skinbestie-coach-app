"use client";

import { useState } from "react";
import { MessageSquare, Calendar, Edit2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Client, EditableClientData } from "../types";

interface ProfileHeaderProps {
  client: Client;
  onUpdate: (data: EditableClientData) => void;
}

export function ProfileHeader({ client, onUpdate }: ProfileHeaderProps) {
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState<EditableClientData>({
    occupation: client.occupation,
    bio: client.bio,
  });

  const handleEdit = () => {
    setEditedData({ occupation: client.occupation, bio: client.bio });
    setEditMode(true);
  };

  const handleSave = () => {
    onUpdate(editedData);
    setEditMode(false);
  };

  const handleCancel = () => {
    setEditMode(false);
  };

  return (
    <Card className="overflow-hidden py-0">
      <div className="h-32 bg-gradient-to-r from-violet-100 via-pink-100 to-orange-100" />
      <CardContent className="pt-0">
        <div className="flex items-start gap-6 -mt-16 pb-6">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-4xl font-bold ring-4 ring-white">
            {client.name.charAt(0)}
          </div>

          <div className="flex-1 pt-20">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  {client.name}
                </h2>

                {editMode ? (
                  <Input
                    placeholder="Occupation"
                    value={editedData.occupation}
                    onChange={(e) =>
                      setEditedData((prev) => ({
                        ...prev,
                        occupation: e.target.value,
                      }))
                    }
                    className="mb-2 max-w-md"
                  />
                ) : client.occupation ? (
                  <p className="text-gray-600 mb-2">{client.occupation}</p>
                ) : (
                  <p className="text-gray-400 italic text-sm mb-2">
                    No occupation set
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                {editMode ? (
                  <>
                    <Button key="save" size="sm" onClick={handleSave}>
                      <Check className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button key="cancel" size="sm" variant="outline" onClick={handleCancel}>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button key="edit" size="sm" variant="outline" onClick={handleEdit}>
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button key="schedule" size="sm" variant="outline">
                      <Calendar className="w-4 h-4 mr-2" />
                      Schedule
                    </Button>
                    <Button key="message" size="sm" variant="outline">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Message
                    </Button>
                  </>
                )}
              </div>
            </div>

            {editMode ? (
              <Textarea
                placeholder="Bio"
                value={editedData.bio}
                onChange={(e) =>
                  setEditedData((prev) => ({ ...prev, bio: e.target.value }))
                }
                rows={3}
                className="mb-4"
              />
            ) : client.bio ? (
              <p className="text-gray-700 mb-4">{client.bio}</p>
            ) : (
              <p className="text-gray-400 italic text-sm mb-4">No bio added</p>
            )}

            <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
              <span>{client.email}</span>
              <span>•</span>
              <span>{client.mobile}</span>
              {client.hasRoutine && (
                <>
                  <span>•</span>
                  <span>
                    Week {client.currentWeek} of {client.planWeeks}
                  </span>
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-sm">
                {client.age} years old
              </Badge>
              <Badge variant="secondary" className="text-sm">
                {client.skinType}
              </Badge>
              {client.concerns.map((concern) => (
                <Badge key={concern} variant="outline" className="text-sm">
                  {concern}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
