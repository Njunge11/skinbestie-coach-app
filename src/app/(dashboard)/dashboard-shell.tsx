"use client";

import { useState, type ReactNode } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Header from "./header";
import Sidebar from "./sidebar";

interface DashboardShellProps {
  children: ReactNode;
  user: {
    name: string;
    email: string;
    role: string;
    avatar?: string;
  };
}

export default function DashboardShell({
  children,
  user,
}: DashboardShellProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async (): Promise<void> => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        onLogout={handleLogout}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      <div className="md:pl-64">
        <Header
          user={user}
          onLogout={handleLogout}
          onMenuClick={() => setIsMobileOpen(!isMobileOpen)}
        />

        <main className="bg-gray-50 min-h-[calc(100vh-4rem)] px-4 py-4 md:px-6 md:py-6 lg:px-32 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
