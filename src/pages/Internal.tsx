import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, TrendingUp, DollarSign, Percent, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { EstimatorProvider, useEstimator } from '@/contexts/EstimatorContext';
import { PackageShortcuts } from '@/components/estimator/PackageShortcuts';
import { EstimatorStepper } from '@/components/estimator/EstimatorStepper';

function InternalDashboard() {
  const { internalTotals, selection } = useEstimator();

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Estimator */}
      <div className="lg:col-span-2">
        <PackageShortcuts />
        <div className="mt-6">
          <EstimatorStepper />
        </div>
      </div>

      {/* Margin Dashboard */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Internal Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Customer Total */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Customer Total</span>
              </div>
              <span className="font-semibold">${internalTotals.customerTotal.toFixed(2)}</span>
            </div>

            <Separator />

            {/* Provider Payout Breakdown - Per Crew */}
            {selection.sessionType === 'serviced' && internalTotals.crewPayoutBreakdown.length > 0 && (
              <>
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Provider Payout</p>
                  
                  {/* Individual crew payouts */}
                  {internalTotals.crewPayoutBreakdown.map((crew) => (
                    <div key={crew.level} className="border rounded-lg p-3 space-y-1.5 bg-muted/30">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">
                          {crew.level.toUpperCase()} × {crew.count}
                        </span>
                        <span className="font-semibold">${crew.totalPayout.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Hourly ({selection.hours}hr × ${crew.hourlyRate})</span>
                        <span>${crew.hourlyPayout.toFixed(2)}</span>
                      </div>
                      {crew.baseSplit > 0 && (
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Base Split ({crew.count}/{internalTotals.crewPayoutBreakdown.reduce((sum, c) => sum + c.count, 0)})</span>
                          <span>${crew.baseSplit.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Editor payout if any */}
                  {internalTotals.editorPayout > 0 && (
                    <div className="border rounded-lg p-3 bg-muted/30">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">Editor</span>
                        <span className="font-semibold">${internalTotals.editorPayout.toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Editing items payout</p>
                    </div>
                  )}

                  {/* Total payout */}
                  <div className="flex justify-between font-medium pt-2 border-t">
                    <span>Total Payout</span>
                    <span className="text-destructive">-${internalTotals.providerPayout.toFixed(2)}</span>
                  </div>
                </div>

                <Separator />
              </>
            )}

            {/* Margin Metrics */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-success" />
                  <span className="text-sm">Gross Margin</span>
                </div>
                <span className="font-bold text-success">
                  ${internalTotals.grossMargin.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Margin/Hour</span>
                </div>
                <span className="font-medium">
                  ${internalTotals.marginPerHour.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Margin %</span>
                </div>
                <span className="font-medium">
                  {internalTotals.marginPercent.toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ops Note */}
        <Card className="bg-muted/50">
          <CardContent className="pt-4">
            <div className="flex gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-1">Ops Notes</p>
                <ul className="space-y-1">
                  <li>• EXP Sessions include buffer time (not billed separately)</li>
                  <li>• Fixed costs (rent/overhead) not included in margin</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function Internal() {
  const { isStaff, isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

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

  if (!isStaff) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              You need staff or admin privileges to access this page.
            </p>
            <Button asChild>
              <Link to="/">Back to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <EstimatorProvider>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-card sticky top-0 z-50">
          <div className="container flex h-14 items-center">
            <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
            <div className="flex-1 text-center">
              <span className="font-semibold">Internal Ops Estimator</span>
            </div>
            <div className="w-16" />
          </div>
        </header>

        {/* Content */}
        <section className="container py-6">
          <InternalDashboard />
        </section>
      </div>
    </EstimatorProvider>
  );
}
