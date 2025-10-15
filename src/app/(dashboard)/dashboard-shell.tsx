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
    avatar?: string | null;
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

        <main className="bg-gray-50 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
