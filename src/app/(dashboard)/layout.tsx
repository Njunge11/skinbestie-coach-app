import type { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardShell from "./dashboard-shell";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await auth();

  // Redirect to login if not authenticated (middleware should handle this, but this is a safeguard)
  if (!session?.user) {
    redirect("/login");
  }

  const user = {
    name: session.user.name || session.user.email || "User",
    email: session.user.email || "",
    role: "Admin",
    avatar: session.user.image,
  };

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
