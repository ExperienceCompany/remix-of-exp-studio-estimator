import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, ArrowRight, Package } from 'lucide-react';
import { usePackages } from '@/hooks/useEstimatorData';

export default function Packages() {
  const { data: packages, isLoading } = usePackages();
  const navigate = useNavigate();

  const handlePackageSelect = (packageId: string) => {
    navigate(`/estimate?package=${packageId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container flex h-14 items-center">
          <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
          <div className="flex-1 text-center">
            <span className="font-semibold">Quick Packages</span>
          </div>
          <div className="w-16" />
        </div>
      </header>

      {/* Content */}
      <section className="container py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Choose a Package</h1>
          <p className="text-muted-foreground">
            Pre-configured studio packages to get started quickly
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {packages?.map(pkg => (
              <Card 
                key={pkg.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => handlePackageSelect(pkg.id)}
              >
                <CardHeader className="pb-2">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{pkg.name}</CardTitle>
                  {pkg.description && (
                    <CardDescription className="text-xs line-clamp-2">
                      {pkg.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                  >
                    Select
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Custom Estimate Link */}
        <div className="mt-8 text-center">
          <p className="text-muted-foreground mb-3">Need something custom?</p>
          <Button asChild variant="outline">
            <Link to="/estimate">
              Start a Custom Estimate
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
