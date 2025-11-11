"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { InviteBookingModal } from "@/app/(dashboard)/_components/invite-booking-modal";
import type { Client } from "../types";

interface ProfileHeaderProps {
  client: Client;
}

export function ProfileHeader({ client }: ProfileHeaderProps) {
  const [showInviteModal, setShowInviteModal] = useState(false);

  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text);
    toast.success(message);
  };

  // Format phone number for WhatsApp (remove leading +)
  const getWhatsAppLink = () => {
    const phoneNumber = client.mobile.replace(/^\+/, "");
    return `https://wa.me/${phoneNumber}`;
  };

  return (
    <Card
      className="overflow-hidden"
      style={{ backgroundColor: "var(--color-skinbestie-primary-light)" }}
    >
      <CardContent className="py-6">
        <div className="flex flex-row items-start gap-4 xl:gap-6">
          <div className="w-20 h-20 flex-shrink-0 rounded-full bg-primary flex items-center justify-center text-white text-3xl font-bold">
            {client.name.charAt(0)}
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {client.nickname ? (
                  <div className="flex flex-col">
                    <h2 className="text-xl xl:text-2xl font-bold">
                      {client.nickname}
                    </h2>
                    <span className="text-sm text-muted-foreground">
                      ({client.name})
                    </span>
                  </div>
                ) : (
                  <h2 className="text-xl xl:text-2xl font-bold">
                    {client.name}
                  </h2>
                )}
              </div>

              {/* Desktop buttons - hidden on mobile/tablet */}
              <div className="hidden xl:flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowInviteModal(true)}
                >
                  Booking Link
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <a
                    href={getWhatsAppLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Message
                  </a>
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
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

            {/* Mobile/Tablet buttons - shown only on mobile/tablet at the bottom */}
            <div className="flex xl:hidden gap-2 pt-4 mt-4 border-t">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowInviteModal(true)}
                className="flex-1"
              >
                Booking Link
              </Button>
              <Button size="sm" variant="outline" className="flex-1" asChild>
                <a
                  href={getWhatsAppLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Message
                </a>
              </Button>
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
