import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, Users, Settings, LogIn } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function Index() {
  const { isAuthenticated, isStaff, isAdmin, signOut, user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">EXP</span>
            </div>
            <span className="font-bold text-xl">Studio Estimator</span>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
                <Button variant="outline" size="sm" onClick={() => signOut()}>
                  Sign Out
                </Button>
              </>
            ) : (
              <Button asChild variant="outline" size="sm">
                <Link to="/auth">
                  <LogIn className="h-4 w-4 mr-2" />
                  Staff Login
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          EXP Studio Ultimate Estimator
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Get instant quotes for studio sessions, production crew, and editing services.
        </p>
      </section>

      {/* Mode Cards */}
      <section className="container pb-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {/* Customer Estimate */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Calculator className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Customer Estimate</CardTitle>
              <CardDescription>
                Get a quick quote for your studio session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to="/estimate">Start Estimate</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Internal Ops */}
          {isStaff && (
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Internal Ops</CardTitle>
                <CardDescription>
                  View margins and manage quotes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="secondary" className="w-full">
                  <Link to="/internal">Open Dashboard</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Admin */}
          {isAdmin && (
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <Settings className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Admin Panel</CardTitle>
                <CardDescription>
                  Manage rates and system settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/admin">Manage Rates</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Footer note for staff */}
      {!isAuthenticated && (
        <section className="container pb-8 text-center">
          <p className="text-sm text-muted-foreground">
            Staff members can <Link to="/auth" className="text-primary hover:underline">sign in</Link> to access internal tools and rate management.
          </p>
        </section>
      )}
    </div>
  );
}
