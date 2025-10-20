"use client";

import { useState } from "react";
import { MessageSquare, Calendar, Edit2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { InviteBookingModal } from "@/app/(dashboard)/_components/invite-booking-modal";
import type { Client, EditableClientData } from "../types";

interface ProfileHeaderProps {
  client: Client;
  onUpdate: (data: EditableClientData) => void;
}

export function ProfileHeader({ client, onUpdate }: ProfileHeaderProps) {
  const [editMode, setEditMode] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
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

  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text);
    toast.success(message);
  };

  // Format phone number for WhatsApp (remove leading +)
  const getWhatsAppLink = () => {
    const phoneNumber = client.mobile.replace(/^\+/, '');
    return `https://wa.me/${phoneNumber}`;
  };

  return (
    <Card className="overflow-hidden py-0">
      <div className="h-24 xl:h-32 bg-gradient-to-r from-primary/70 to-primary/90" />
      <CardContent className="pt-0">
        <div className="flex flex-col xl:flex-row items-start gap-4 xl:gap-6 -mt-12 xl:-mt-16 pb-6">
          <div className="w-24 h-24 xl:w-32 xl:h-32 flex-shrink-0 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-3xl xl:text-4xl font-bold ring-4 ring-white">
            {client.name.charAt(0)}
          </div>

          <div className="flex-1 pt-0 xl:pt-20 w-full">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-xl xl:text-2xl font-bold text-gray-900 mb-1">
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

              {/* Desktop buttons - hidden on mobile/tablet */}
              <div className="hidden xl:flex gap-2">
                {editMode ? (
                  <>
                    <Button key="save" size="sm" onClick={handleSave}>
                      <Check className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button
                      key="cancel"
                      size="sm"
                      variant="outline"
                      onClick={handleCancel}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      key="edit"
                      size="sm"
                      variant="outline"
                      onClick={handleEdit}
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      key="booking-link"
                      size="sm"
                      variant="outline"
                      onClick={() => setShowInviteModal(true)}
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Booking Link
                    </Button>
                    <Button key="message" size="sm" variant="outline" asChild>
                      <a
                        href={getWhatsAppLink()}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Message
                      </a>
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

            <div className="flex items-center gap-4 text-sm text-gray-600 mb-4 flex-wrap">
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

            <div className="flex flex-wrap gap-2 mb-4 xl:mb-0">
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

            {/* Mobile/Tablet buttons - shown only on mobile/tablet at the bottom */}
            <div className="flex xl:hidden gap-2 pt-4 border-t border-border">
              {editMode ? (
                <>
                  <Button
                    key="save-mobile"
                    size="sm"
                    onClick={handleSave}
                    className="flex-1"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                  <Button
                    key="cancel-mobile"
                    size="sm"
                    variant="outline"
                    onClick={handleCancel}
                    className="flex-1"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    key="edit-mobile"
                    size="sm"
                    variant="outline"
                    onClick={handleEdit}
                    className="flex-1"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    key="booking-link-mobile"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowInviteModal(true)}
                    className="flex-1"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Booking Link
                  </Button>
                  <Button
                    key="message-mobile"
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    asChild
                  >
                    <a
                      href={getWhatsAppLink()}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Message
                    </a>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>

      <InviteBookingModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onCopyLink={copyToClipboard}
      />
    </Card>
  );
}
