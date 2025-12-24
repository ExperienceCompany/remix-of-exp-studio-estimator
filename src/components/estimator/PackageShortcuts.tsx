import { usePackages } from '@/hooks/useEstimatorData';
import { useEstimator } from '@/contexts/EstimatorContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Package } from 'lucide-react';

export function PackageShortcuts() {
  const { data: packages, isLoading } = usePackages();
  const { applyPackage } = useEstimator();

  if (isLoading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-10 w-40 flex-shrink-0" />
        ))}
      </div>
    );
  }

  if (!packages?.length) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Package className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Quick Packages</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {packages.map(pkg => (
          <Button
            key={pkg.id}
            variant="outline"
            size="sm"
            className="whitespace-nowrap text-xs"
            onClick={() => applyPackage(pkg.preset_json)}
          >
            {pkg.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
