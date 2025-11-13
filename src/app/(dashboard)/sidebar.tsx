"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Users, Calendar, LogOut, type LucideIcon } from "lucide-react";
import Image from "next/image";

interface SidebarProps {
  onLogout: () => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export default function Sidebar({
  onLogout,
  isMobileOpen,
  setIsMobileOpen,
}: SidebarProps) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { href: "/", label: "Home", icon: Home },
    { href: "/subscribers", label: "Subscribers", icon: Users },
    {
      href: "/routine-management",
      label: "Routine Management",
      icon: Calendar,
    },
  ];

  const handleLogout = (): void => {
    onLogout();
    setIsMobileOpen(false);
  };

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-64 border-r bg-background transition-transform duration-300 md:translate-x-0 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center border-b px-6">
            <Image
              src="/logo.svg"
              alt="Logo"
              width={139}
              height={40}
              priority
            />
          </div>

          <nav className="flex-1 space-y-2 px-3 py-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              // For home ("/"), use exact match. For other routes, match if pathname starts with href
              const isActive =
                item.href === "/"
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-4 text-sm font-medium transition-colors ${
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                  style={
                    isActive
                      ? {
                          backgroundColor:
                            "var(--color-skinbestie-primary-light)",
                        }
                      : undefined
                  }
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="border-t p-3">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <LogOut className="h-5 w-5" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
