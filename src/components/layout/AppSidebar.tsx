import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Home,
  CalendarDays,
  Package,
  Calculator,
  Scissors,
  Timer,
  Layers,
  DollarSign,
  Settings,
  CalendarCog,
  Users,
  ChevronLeft,
  ChevronRight,
  LogOut,
  LogIn,
  Moon,
  Sun,
} from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: ("admin" | "staff" | "user" | "affiliate" | "public")[];
}

const publicNav: NavItem[] = [
  { title: "Dashboard", href: "/", icon: Home, roles: ["admin", "staff", "user", "affiliate"] },
  { title: "Book a Studio", href: "/book", icon: CalendarDays, roles: ["public", "admin", "staff", "user", "affiliate"] },
  { title: "Packages", href: "/packages", icon: Package, roles: ["public", "admin", "staff", "user", "affiliate"] },
  { title: "Estimate", href: "/estimate", icon: Calculator, roles: ["public", "admin", "staff", "user", "affiliate"] },
  { title: "Post-Production", href: "/services", icon: Scissors, roles: ["public", "admin", "staff", "user", "affiliate"] },
];

const staffNav: NavItem[] = [
  { title: "Sessions", href: "/sessions", icon: Timer, roles: ["admin", "staff"] },
  { title: "Projects", href: "/projects", icon: Layers, roles: ["admin", "staff"] },
  { title: "Internal Ops", href: "/internal", icon: Users, roles: ["admin", "staff"] },
];

const adminNav: NavItem[] = [
  { title: "Payouts", href: "/payouts", icon: DollarSign, roles: ["admin"] },
  { title: "Calendar Settings", href: "/calendar-settings", icon: CalendarCog, roles: ["admin"] },
  { title: "Admin Panel", href: "/admin", icon: Settings, roles: ["admin"] },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const location = useLocation();
  const { user, isAuthenticated, isStaff, isAdmin, signOut, role } = useAuth();

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  const canAccess = (item: NavItem) => {
    if (!item.roles) return true;
    if (item.roles.includes("public")) return true;
    if (!isAuthenticated) return false;
    if (isAdmin && item.roles.includes("admin")) return true;
    if (isStaff && item.roles.includes("staff")) return true;
    if (item.roles.includes("user")) return true;
    if (role === "affiliate" && item.roles.includes("affiliate")) return true;
    return false;
  };

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href);
  };

  const userInitials = user?.email?.slice(0, 2).toUpperCase() || "?";

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen sidebar-bg flex flex-col sidebar-transition",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-background/10">
        {!collapsed && (
          <Link to="/" className="flex items-center gap-2">
            <div className="rainbow-border rainbow-border-slow h-8 w-8 rounded flex items-center justify-center bg-background">
              <span className="text-foreground font-bold text-sm">EXP</span>
            </div>
            <span className="font-bold text-lg">Studio</span>
          </Link>
        )}
        {collapsed && (
          <Link to="/" className="mx-auto">
            <div className="rainbow-border rainbow-border-slow h-8 w-8 rounded flex items-center justify-center bg-background">
              <span className="text-foreground font-bold text-sm">EXP</span>
            </div>
          </Link>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
        {/* Public section */}
        <div className="space-y-1">
          {!collapsed && (
            <span className="px-3 text-xs font-semibold text-background/50 uppercase tracking-wider">
              Menu
            </span>
          )}
          {publicNav.filter(canAccess).map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive(item.href)
                  ? "bg-background text-foreground"
                  : "text-background/70 hover:bg-background/10 hover:text-background",
                collapsed && "justify-center px-2"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          ))}
        </div>

        {/* Staff section */}
        {isStaff && staffNav.filter(canAccess).length > 0 && (
          <div className="space-y-1">
            {!collapsed && (
              <span className="px-3 text-xs font-semibold text-background/50 uppercase tracking-wider">
                Operations
              </span>
            )}
            {staffNav.filter(canAccess).map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive(item.href)
                    ? "bg-background text-foreground"
                    : "text-background/70 hover:bg-background/10 hover:text-background",
                  collapsed && "justify-center px-2"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.title}</span>}
              </Link>
            ))}
          </div>
        )}

        {/* Admin section */}
        {isAdmin && adminNav.filter(canAccess).length > 0 && (
          <div className="space-y-1">
            {!collapsed && (
              <span className="px-3 text-xs font-semibold text-background/50 uppercase tracking-wider">
                Admin
              </span>
            )}
            {adminNav.filter(canAccess).map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive(item.href)
                    ? "bg-background text-foreground"
                    : "text-background/70 hover:bg-background/10 hover:text-background",
                  collapsed && "justify-center px-2"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.title}</span>}
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-background/10 p-3 space-y-2">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className={cn(
            "w-full justify-start text-background/70 hover:text-background hover:bg-background/10",
            collapsed && "justify-center px-2"
          )}
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          {!collapsed && <span className="ml-3">{isDark ? "Light Mode" : "Dark Mode"}</span>}
        </Button>

        {/* Collapse toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "w-full justify-start text-background/70 hover:text-background hover:bg-background/10",
            collapsed && "justify-center px-2"
          )}
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          {!collapsed && <span className="ml-3">Collapse</span>}
        </Button>

        {/* User menu */}
        {isAuthenticated ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "w-full justify-start text-background/70 hover:text-background hover:bg-background/10",
                  collapsed && "justify-center px-2"
                )}
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <span className="ml-3 truncate max-w-[140px]">{user?.email}</span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem className="text-muted-foreground text-xs">
                {role?.toUpperCase() || "USER"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            asChild
            variant="ghost"
            size="sm"
            className={cn(
              "w-full justify-start text-background/70 hover:text-background hover:bg-background/10",
              collapsed && "justify-center px-2"
            )}
          >
            <Link to="/auth">
              <LogIn className="h-5 w-5" />
              {!collapsed && <span className="ml-3">Sign In</span>}
            </Link>
          </Button>
        )}
      </div>
    </aside>
  );
}
