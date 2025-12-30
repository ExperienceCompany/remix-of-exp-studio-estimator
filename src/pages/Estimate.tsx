import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { EstimatorProvider, useEstimator } from '@/contexts/EstimatorContext';
import { EstimatorStepper } from '@/components/estimator/EstimatorStepper';
import { usePackages } from '@/hooks/useEstimatorData';

function EstimateContent() {
  const [searchParams] = useSearchParams();
  const packageId = searchParams.get('package');
  const { data: packages } = usePackages();
  const { applyPackage } = useEstimator();

  useEffect(() => {
    if (packageId && packages) {
      const pkg = packages.find(p => p.id === packageId);
      if (pkg) {
        applyPackage(pkg.preset_json, pkg);
      }
    }
  }, [packageId, packages, applyPackage]);

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
            <span className="font-semibold">Get Your Estimate</span>
          </div>
          <div className="w-16" />
        </div>
      </header>

      {/* Stepper */}
      <section className="container py-6 pb-16">
        <EstimatorStepper />
      </section>
    </div>
  );
}

export default function Estimate() {
  return (
    <EstimatorProvider>
      <EstimateContent />
    </EstimatorProvider>
  );
}
