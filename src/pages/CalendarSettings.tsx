import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, AlertCircle, RefreshCw, DollarSign, Settings } from 'lucide-react';
import { RatesEditor } from '@/components/admin/RatesEditor';
import { CalendarSettingsEditor } from '@/components/admin/CalendarSettingsEditor';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

const sections = [
  { id: 'diy-rates', label: 'DIY Rates', icon: DollarSign },
  { id: 'studio-settings', label: 'Studio Settings', icon: Settings },
];

export default function CalendarSettings() {
  const { isAdmin, isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState('diy-rates');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              You need admin privileges to access this page.
            </p>
            <Button asChild>
              <Link to="/">Back to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleRefresh = () => {
    queryClient.invalidateQueries();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
          <span className="font-semibold">Calendar Settings</span>
          <Button variant="ghost" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Content with Sidebar */}
      <div className="flex min-h-[calc(100vh-3.5rem)]">
        {/* Left Sidebar */}
        <aside className="w-56 border-r bg-card p-4 shrink-0">
          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  activeSection === section.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <section.icon className="h-4 w-4" />
                {section.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Right Content */}
        <main className="flex-1 p-6">
          {activeSection === 'diy-rates' && (
            <Card>
              <CardHeader>
                <CardTitle>DIY Rates</CardTitle>
                <CardDescription>Configure studio rates by time slot</CardDescription>
              </CardHeader>
              <CardContent>
                <RatesEditor />
              </CardContent>
            </Card>
          )}

          {activeSection === 'studio-settings' && (
            <Card>
              <CardHeader>
                <CardTitle>Studio Calendar Settings</CardTitle>
                <CardDescription>Configure operating hours, booking limits, and blocked dates per studio</CardDescription>
              </CardHeader>
              <CardContent>
                <CalendarSettingsEditor />
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
