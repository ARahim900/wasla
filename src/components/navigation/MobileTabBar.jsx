import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  Home,
  FileText,
  Settings,
  Users,
  MoreHorizontal,
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";

// All navigation items - same as Layout.jsx
const allNavigationItems = [
  { name: "Dashboard", icon: LayoutDashboard, to: createPageUrl("Dashboard") },
  { name: "Inspections", icon: ClipboardList, to: createPageUrl("Inspections") },
  { name: "Clients", icon: Users, to: createPageUrl("Clients") },
  { name: "Properties", icon: Home, to: createPageUrl("Properties") },
  { name: "Invoices", icon: FileText, to: createPageUrl("Invoices") },
  { name: "Settings", icon: Settings, to: createPageUrl("Settings") },
];

// Primary items shown in bottom bar (first 4)
const PRIMARY_ITEM_COUNT = 4;
const primaryItems = allNavigationItems.slice(0, PRIMARY_ITEM_COUNT);
const moreItems = allNavigationItems.slice(PRIMARY_ITEM_COUNT);

// Bottom bar height in pixels
const BOTTOM_NAV_HEIGHT = 64;

export default function MobileTabBar() {
  const location = useLocation();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  // Check if any "more" item is active
  const isMoreItemActive = moreItems.some(
    (item) => location.pathname === item.to
  );

  const handleItemClick = () => {
    setIsMoreOpen(false);
  };

  return (
    <>
      {/* Bottom Navigation Bar - only visible on mobile (< md breakpoint / 768px) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 w-full z-50 bg-card border-t border-border shadow-[0_-2px_10px_rgba(0,0,0,0.1)] dark:shadow-[0_-2px_10px_rgba(0,0,0,0.3)]"
        style={{
          height: `${BOTTOM_NAV_HEIGHT}px`,
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
        role="navigation"
        aria-label="Main navigation"
      >
        <ul className="flex h-full">
          {/* Primary navigation items */}
          {primaryItems.map((item) => {
            const active = location.pathname === item.to;
            const Icon = item.icon;
            return (
              <li key={item.name} className="flex-1">
                <Link
                  to={item.to}
                  aria-label={`Navigate to ${item.name}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center justify-center h-full min-h-[44px] gap-1 text-xs font-medium transition-colors duration-200",
                    "active:bg-accent",
                    "hover:bg-accent/50",
                    active
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-transform duration-200",
                      active && "scale-110"
                    )}
                  />
                  <span className="leading-none truncate px-1">{item.name}</span>
                </Link>
              </li>
            );
          })}

          {/* More button */}
          <li className="flex-1">
            <button
              onClick={() => setIsMoreOpen(true)}
              aria-label="More navigation options"
              aria-expanded={isMoreOpen}
              aria-haspopup="dialog"
              className={cn(
                "flex flex-col items-center justify-center w-full h-full min-h-[44px] gap-1 text-xs font-medium transition-colors duration-200",
                "active:bg-accent",
                "hover:bg-accent/50",
                isMoreItemActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <MoreHorizontal
                className={cn(
                  "h-5 w-5 transition-transform duration-200",
                  isMoreItemActive && "scale-110"
                )}
              />
              <span className="leading-none">More</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* More Items Drawer */}
      <Drawer open={isMoreOpen} onOpenChange={setIsMoreOpen}>
        <DrawerContent className="bg-card">
          <DrawerHeader className="border-b border-border">
            <DrawerTitle className="text-foreground">
              More Options
            </DrawerTitle>
          </DrawerHeader>
          <div className="p-4 pb-8">
            <ul className="space-y-2">
              {moreItems.map((item) => {
                const active = location.pathname === item.to;
                const Icon = item.icon;
                return (
                  <li key={item.name}>
                    <DrawerClose asChild>
                      <Link
                        to={item.to}
                        onClick={handleItemClick}
                        aria-label={`Navigate to ${item.name}`}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-4 px-4 py-3 rounded-lg min-h-[44px] transition-colors duration-200",
                          "active:bg-accent",
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-accent"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-5 w-5 flex-shrink-0",
                            active
                              ? "text-primary"
                              : "text-muted-foreground"
                          )}
                        />
                        <span className="font-medium">{item.name}</span>
                      </Link>
                    </DrawerClose>
                  </li>
                );
              })}
            </ul>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

// Export the height constant for use in Layout
export { BOTTOM_NAV_HEIGHT };
