"use client";

import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import Sidebar from "@/components/layout/sidebar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { LogOut, User, Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Topbar({
  user,
}: {
  user: { name?: string; role: string };
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const scrollContainer = document.getElementById("main-scroll-container");
    if (!scrollContainer) return;

    const handleScroll = () => {
      const currentScrollY = scrollContainer.scrollTop;

      // Threshold to prevent jitter
      if (Math.abs(currentScrollY - lastScrollY) < 10) return;

      if (currentScrollY > 50) { // Only trigger after some scrolling
        if (currentScrollY > lastScrollY) {
          // Scrolling DOWN
          setIsVisible(false);
        } else {
          // Scrolling UP
          setIsVisible(true);
        }
      } else {
        // At the top
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    scrollContainer.addEventListener("scroll", handleScroll);
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <header
      className={`h-16 print:hidden shrink-0 border-b border-white/90 bg-white/30 backdrop-blur-xl flex items-center justify-between px-4 sm:px-8 sticky top-0 z-50 shadow-sm transition-transform duration-500 ease-in-out ${isVisible ? "translate-y-0" : "-translate-y-full md:translate-y-0"
        }`}
    >

      <div className="flex items-center gap-4">
        {/* Mobile Menu Trigger */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden -ml-2">
              <Menu className="h-6 w-6 text-slate-600" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 border-r-0">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            {/* Sidebar inside Sheet */}
            <Sidebar role={user.role} onNavigate={() => setMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Left: Welcome Message */}
        <div className="flex flex-col gap-0.5">
          <h2 className="text-sm font-medium text-slate-500">Selamat Datang,</h2>
          <div className="text-base font-bold text-slate-900 flex items-center gap-2">
            {user.name}
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-extrabold border border-blue-200 uppercase tracking-wide">
              {user.role}
            </span>
          </div>
        </div>
      </div>

      {/* Right: User Actions */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="text-red-500 hover:text-red-600 hover:bg-red-50"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
}
