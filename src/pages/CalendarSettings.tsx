import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, AlertCircle, RefreshCw } from 'lucide-react';
import { RatesEditor } from '@/components/admin/RatesEditor';
import { CalendarSettingsEditor } from '@/components/admin/CalendarSettingsEditor';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';

export default function CalendarSettings() {
  const { isAdmin, isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

      {/* Content */}
      <section className="container py-6 space-y-8">
        {/* DIY Rates Section */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>DIY Rates</CardTitle>
              <CardDescription>Configure studio rates by time slot</CardDescription>
            </CardHeader>
            <CardContent>
              <RatesEditor />
            </CardContent>
          </Card>
        </div>

        {/* Calendar Settings Section */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Studio Calendar Settings</CardTitle>
              <CardDescription>Configure operating hours, booking limits, and blocked dates per studio</CardDescription>
            </CardHeader>
            <CardContent>
              <CalendarSettingsEditor />
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
