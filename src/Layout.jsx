
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
import useWindowSize from "@/components/hooks/useWindowSize";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { User } from "@/api/entities";
import { cn } from "@/lib/utils";
import MobileTabBar, { BOTTOM_NAV_HEIGHT } from "@/components/navigation/MobileTabBar";

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
  const [user, setUser] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { width } = useWindowSize();
  const isMobile = (width || 0) < 768; // md breakpoint

  // Dark mode support
  const [isDark, setIsDark] = useState(() => {
    const lsTheme = localStorage.getItem("theme");
    return lsTheme === "dark";
  });

  // Load user data + theme preference in a single call
  React.useEffect(() => {
    User.me()
      .then((me) => {
        if (me) {
          setUser(me);
          if (typeof me.darkMode === "boolean") setIsDark(me.darkMode);
          else if (me.theme) setIsDark(me.theme === "dark");
        }
      })
      .catch(() => setUser(null));
  }, []);

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
    try {
      await User.updateMe({ darkMode: next, theme: next ? "dark" : "light" });
    } catch (err) {
      // Silently ignore - theme change still works locally
      console.debug('Theme save failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Enhanced Header with Logo and Controls */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50 shadow-md">
        {/* Top Bar - Logo and Controls */}
        <div className="bg-gradient-to-r from-emerald-50 to-white dark:from-slate-800 dark:to-slate-700 border-b border-slate-100 dark:border-slate-600">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Enhanced Logo Section with Transparent Background */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center bg-transparent rounded-lg p-2">
                  <img
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68b44f73a9997833d114376d/f255c3751_image.png"
                    alt="Wasla Logo"
                    className="w-12 h-12 object-contain opacity-90"
                    style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                  />
                  <div className="ml-3 hidden sm:block">
                    <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      Wasla
                    </span>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                      Property Solutions
                    </p>
                  </div>
                </div>
              </div>

              {/* Right side controls */}
              <div className="flex items-center space-x-4">
                {/* Theme toggle */}
                <Button variant="ghost" size="icon" onClick={toggleTheme} className="hover:bg-emerald-100 dark:hover:bg-slate-600">
                  {isDark ? 
                    <Sun className="w-5 h-5 text-yellow-400" /> : 
                    <Moon className="w-5 h-5 text-slate-600" />
                  }
                </Button>

                {/* User dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-3 hover:bg-emerald-100 dark:hover:bg-slate-600 p-2 rounded-lg">
                      <Avatar className="w-10 h-10 border-2 border-emerald-200 dark:border-emerald-700">
                        <AvatarImage src={user?.avatar} />
                        <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 font-semibold">
                          {user?.full_name?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="hidden sm:flex flex-col items-start">
                        <span className="text-sm font-semibold text-slate-700 dark:text-white truncate max-w-[20ch]">
                          {user?.full_name || 'User'}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                          {user?.role || 'user'}
                        </span>
                      </div>
                      <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-300" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => navigate(createPageUrl("Settings"))}>
                      <Settings className="w-4 h-4 mr-2" /> Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => User.logout()}>
                      <LogOut className="w-4 h-4 mr-2" /> Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Mobile menu button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden hover:bg-emerald-100 dark:hover:bg-slate-600"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
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

        {/* Navigation Bar - Separated Below */}
        <div className="bg-white dark:bg-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-1 py-3">
              {navigationItems.map((item) => (
                <Link
                  key={item.title}
                  to={item.url}
                  className="text-[#151414] px-4 py-2 text-sm font-semibold text-center inline-flex items-center rounded-lg transition-all duration-200 hover:text-emerald-700 hover:bg-emerald-50 dark:text-slate-300 dark:hover:text-emerald-400 dark:hover:bg-slate-700"
                >
                  <item.icon className="w-4 h-4 mr-2" />
                  {item.title}
                </Link>
              ))}
            </nav>

            {/* Mobile Navigation */}
            {isMobileMenuOpen && (
              <div className="md:hidden py-3 border-t border-slate-200 dark:border-slate-600">
                <div className="space-y-1">
                  {navigationItems.map((item) => (
                    <Link
                      key={item.title}
                      to={item.url}
                      className={cn(
                        "flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                        location.pathname === item.url
                          ? "bg-emerald-600 text-white shadow-md"
                          : "text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-slate-300 dark:hover:text-emerald-400 dark:hover:bg-slate-700"
                      )}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <item.icon className="w-5 h-5 mr-3" />
                      {item.title}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content - padding-bottom on mobile for bottom nav */}
      <main
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        style={{ paddingBottom: isMobile ? `${BOTTOM_NAV_HEIGHT + 32}px` : undefined }}
      >
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <MobileTabBar />

      {/* Enhanced Global styles with improved dark mode visibility */}
      <style>{`
        html, body { 
          width: 100%; 
          max-width: 100vw; 
          overflow-x: hidden; 
        }

        /* Enhanced Dark Mode Styling for Better Visibility */
        .dark html, .dark body { 
          background-color: #0f172a !important; 
        }

        /* Improved Card and Background Colors */
        .dark .bg-white,
        .dark .bg-slate-50,
        .dark .bg-slate-100,
        .dark .bg-gray-50,
        .dark .bg-zinc-100 { 
          background-color: #1e293b !important; 
        }

        /* Enhanced Text Contrast for Better Readability */
        .dark .text-slate-900, 
        .dark .text-slate-800, 
        .dark .text-slate-700,
        .dark .text-gray-900,
        .dark .text-gray-800,
        .dark .text-gray-700 { 
          color: #f1f5f9 !important; /* Lighter text for better contrast */
        }

        .dark .text-slate-600,
        .dark .text-gray-600 {
          color: #cbd5e1 !important; /* Improved mid-tone text */
        }

        .dark .text-slate-500,
        .dark .text-gray-500 {
          color: #94a3b8 !important; /* Better secondary text contrast */
        }

        .dark .text-slate-400,
        .dark .text-gray-400 {
          color: #64748b !important; /* Enhanced muted text */
        }

        /* Enhanced Border Colors for Better Definition */
        .dark .border, 
        .dark .border-b, 
        .dark .border-t, 
        .dark .border-l, 
        .dark .border-r,
        .dark .border-slate-200,
        .dark .border-gray-200 { 
          border-color: #475569 !important; /* More visible borders */
        }

        /* Improved Input Field Styling */
        .dark input, 
        .dark textarea, 
        .dark select {
          background-color: #1e293b !important;
          color: #f1f5f9 !important;
          border-color: #475569 !important;
        }

        .dark input::placeholder,
        .dark textarea::placeholder {
          color: #94a3b8 !important; /* Better placeholder visibility */
        }

        /* Enhanced Card Styling for Better Visual Separation */
        .dark .card, 
        .dark .shadcn-card, 
        .dark [role="dialog"],
        .dark .bg-white {
          background-color: #1e293b !important;
          color: #f1f5f9 !important;
          border-color: #475569 !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2) !important;
        }

        /* Improved Button Styling */
        .dark button {
          color: #f1f5f9 !important;
        }

        .dark .bg-slate-100 {
          background-color: #334155 !important;
        }

        .dark .hover\\:bg-slate-50:hover {
          background-color: #475569 !important;
        }

        /* Enhanced Badge Colors */
        .dark .bg-blue-100 {
          background-color: #1e40af !important;
          color: #dbeafe !important;
        }

        .dark .bg-green-100 {
          background-color: #166534 !important;
          color: #dcfce7 !important;
        }

        .dark .bg-yellow-100 {
          background-color: #ca8a04 !important;
          color: #fef3c7 !important;
        }

        .dark .bg-red-100 {
          background-color: #dc2626 !important;
          color: #fecaca !important;
        }

        .dark .bg-gray-100 {
          background-color: #374151 !important;
          color: #f3f4f6 !important;
        }

        /* Enhanced Status Badge Text Colors */
        .dark .text-blue-800 {
          color: #dbeafe !important;
        }

        .dark .text-green-800 {
          color: #dcfce7 !important;
        }

        .dark .text-yellow-800 {
          color: #fef3c7 !important;
        }

        .dark .text-red-800 {
          color: #fecaca !important;
        }

        .dark .text-gray-800 {
          color: #f3f4f6 !important;
        }

        /* Better Hover States for Interactive Elements */
        .dark .hover\\:border-emerald-500\\/50:hover {
          border-color: rgba(16, 185, 129, 0.6) !important;
        }

        /* Enhanced Search Input Styling */
        .dark input[type="search"] {
          background-color: #334155 !important;
          border-color: #475569 !important;
          color: #f1f5f9 !important;
        }

        /* Improved Dropdown Menu Styling */
        .dark .bg-white[role="menu"] {
          background-color: #1e293b !important;
          border-color: #475569 !important;
        }

        /* Enhanced Icon Colors */
        .dark .text-slate-300 {
          color: #cbd5e1 !important;
        }

        .dark .text-slate-400 {
          color: #94a3b8 !important;
        }

        /* Mobile-Specific Enhancements */
        @media (max-width: 768px) {
          .dark {
            background-color: #0f172a !important;
          }
          
          .dark .card,
          .dark .bg-white {
            background-color: #1e293b !important;
            border: 1px solid #475569 !important;
          }
          
          .dark button {
            min-height: 44px; /* Better touch targets on mobile */
            font-weight: 500;
          }
          
          .dark input,
          .dark select {
            min-height: 44px;
            font-size: 16px; /* Prevent zoom on iOS */
          }
        }

        /* Enhanced shadow effects for better depth perception */
        header {
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        
        .dark header {
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3);
        }

        /* Smooth transitions for interactive elements */
        button, a, input, select {
          transition: all 0.2s ease-in-out;
        }

        /* Improved Focus States for Accessibility */
        .dark button:focus,
        .dark input:focus,
        .dark select:focus {
          outline: 2px solid #10b981;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}
