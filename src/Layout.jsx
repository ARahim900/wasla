
import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  FileText,
  Settings,
  Home,
  LogOut,
  ChevronDown,
  Sun,
  Moon,
  Menu,
  X
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { User } from "@/api/entities";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";
import MobileTabBar, { BOTTOM_NAV_HEIGHT } from "@/components/navigation/MobileTabBar";

const initialThemeFromStorage = () => {
  if (typeof window === "undefined") return false;
  // Source of truth is the class set by the bootstrap script in index.html,
  // which already considered localStorage and prefers-color-scheme.
  return document.documentElement.classList.contains("dark");
};

const navigationItems = [
  { title: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard },
  { title: "Inspections", url: createPageUrl("Inspections"), icon: ClipboardList },
  { title: "Clients", url: createPageUrl("Clients"), icon: Users },
  { title: "Properties", url: createPageUrl("Properties"), icon: Home },
  { title: "Invoices", url: createPageUrl("Invoices"), icon: FileText },
  { title: "Settings", url: createPageUrl("Settings"), icon: Settings }
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user, patchUser } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  // Dark mode — initialize from localStorage; sync with user prefs once they load
  const [isDark, setIsDark] = useState(initialThemeFromStorage);

  React.useEffect(() => {
    if (!user) return;
    if (typeof user.darkMode === "boolean") setIsDark(user.darkMode);
    else if (user.theme) setIsDark(user.theme === "dark");
  }, [user]);

  // Close mobile menu whenever route changes
  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  React.useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  const toggleTheme = async () => {
    const next = !isDark;
    setIsDark(next);
    patchUser({ darkMode: next, theme: next ? "dark" : "light" });
    try {
      await User.updateMe({ darkMode: next, theme: next ? "dark" : "light" });
    } catch (err) {
      // Silently ignore - theme change still works locally
      console.debug('Theme save failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:text-sm focus:font-medium"
      >
        Skip to content
      </a>
      {/* Header with Logo, Controls, and Navigation */}
      <header className="app-header bg-card sticky top-0 z-50">
        {/* Top Bar - Logo and Controls */}
        <div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center min-h-[60px]">
              {/* Logo + Brand Name */}
              <Link to="/" className="flex items-center gap-2.5 group">
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68b44f73a9997833d114376d/f255c3751_image.png"
                  alt="Wasla Logo"
                  className="w-14 h-14 object-contain"
                />
                <span className="text-xl font-bold text-primary tracking-tight">
                  Wasla
                </span>
              </Link>

              {/* Right side controls */}
              <div className="flex items-center space-x-4 space-x-reverse">
                {/* Theme toggle */}
                <Button variant="ghost" size="icon" onClick={toggleTheme} className="min-h-[44px] min-w-[44px] hover:bg-accent" aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}>
                  {isDark ? 
                    <Sun className="w-5 h-5 text-muted-foreground" /> : 
                    <Moon className="w-5 h-5 text-muted-foreground" />
                  }
                </Button>

                {/* User dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-3 space-x-reverse hover:bg-accent p-2 rounded-lg min-h-[44px]" aria-label="User menu">
                      <Avatar className="w-10 h-10 border border-border">
                        <AvatarImage src={user?.avatar} />
                        <AvatarFallback className="bg-accent text-muted-foreground font-semibold">
                          {user?.full_name?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="hidden sm:flex flex-col items-start text-start">
                        <span className="text-sm font-semibold text-foreground truncate max-w-[20ch]">
                          {user?.full_name || 'User'}
                        </span>
                        <span className="text-xs text-muted-foreground capitalize">
                          {user?.role || 'user'}
                        </span>
                      </div>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem className="min-h-[44px]" onClick={() => navigate(createPageUrl("Settings"))}>
                      <Settings className="w-4 h-4 me-2" /> Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem className="min-h-[44px]" onClick={() => logout()}>
                      <LogOut className="w-4 h-4 me-2" /> Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Mobile menu button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden min-h-[44px] min-w-[44px] hover:bg-accent"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  aria-label="Toggle navigation menu"
                >
                  {isMobileMenuOpen ? 
                    <X className="w-6 h-6" /> : 
                    <Menu className="w-6 h-6" />
                  }
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Bar */}
        <div className="border-t border-border bg-muted/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-1 space-x-reverse py-1.5">
              {navigationItems.map((item) => {
                const isActive = location.pathname === item.url || (item.url === '/Dashboard' && location.pathname === '/');
                return (
                  <Link
                    key={item.title}
                    to={item.url}
                    className={cn(
                      "px-4 py-2 min-h-[44px] text-sm font-semibold text-center inline-flex items-center rounded-lg transition-colors duration-200",
                      isActive
                        ? "text-primary bg-primary/8"
                        : "text-muted-foreground hover:text-accent-foreground hover:bg-accent"
                    )}
                  >
                    <item.icon className="w-4 h-4 me-2" />
                    {item.title}
                  </Link>
                );
              })}
            </nav>

            {/* Mobile Navigation */}
            {isMobileMenuOpen && (
              <div className="md:hidden py-3 border-t border-border">
                <div className="space-y-1">
                  {navigationItems.map((item) => {
                    const isActive = location.pathname === item.url || (item.url === '/Dashboard' && location.pathname === '/');
                    return (
                    <Link
                      key={item.title}
                      to={item.url}
                      className={cn(
                        "flex items-center px-4 py-3 min-h-[44px] rounded-lg text-sm font-medium transition-colors duration-200",
                        isActive
                          ? "bg-accent text-foreground"
                          : "text-muted-foreground hover:text-accent-foreground hover:bg-accent"
                      )}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <item.icon className="w-5 h-5 me-3" />
                      {item.title}
                    </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content - padding-bottom on mobile for bottom nav */}
      <main
        id="main-content"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        style={{ paddingBottom: isMobile ? `${BOTTOM_NAV_HEIGHT + 32}px` : undefined }}
      >
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <MobileTabBar />
    </div>
  );
}
