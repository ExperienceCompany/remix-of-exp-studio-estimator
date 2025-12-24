import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { EstimatorProvider } from '@/contexts/EstimatorContext';
import { EstimatorStepper } from '@/components/estimator/EstimatorStepper';
import { PackageShortcuts } from '@/components/estimator/PackageShortcuts';

export default function Estimate() {
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
              <span className="font-semibold">Get Your Estimate</span>
            </div>
            <div className="w-16" /> {/* Spacer for centering */}
          </div>
        </header>

        {/* Package Shortcuts */}
        <section className="container py-6">
          <PackageShortcuts />
        </section>

        {/* Stepper */}
        <section className="container pb-16">
          <EstimatorStepper />
        </section>
      </div>
    </EstimatorProvider>
  );
}
