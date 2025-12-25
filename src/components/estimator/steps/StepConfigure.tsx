import { useEstimator } from '@/contexts/EstimatorContext';
import { useEditingMenu } from '@/hooks/useEstimatorData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, ArrowRight, Settings2 } from 'lucide-react';

// Video editing config with duration-based pricing
export const VIDEO_EDITING_CONFIG: Record<string, {
  minDuration: number;
  maxDuration: number;
  baseDuration: number;
  incrementDuration: number;
  formatDuration: (seconds: number) => string;
}> = {
  social: {
    minDuration: 1,
    maxDuration: 10,
    baseDuration: 1,
    incrementDuration: 1,
    formatDuration: (buckets: number) => `${buckets} revision bucket${buckets > 1 ? 's' : ''}`,
  },
  general_basic: {
    minDuration: 15,
    maxDuration: 360,
    baseDuration: 15,
    incrementDuration: 15,
    formatDuration: (seconds: number) => seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`,
  },
  general_advanced: {
    minDuration: 15,
    maxDuration: 360,
    baseDuration: 15,
    incrementDuration: 15,
    formatDuration: (seconds: number) => seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`,
  },
  long_form_simple: {
    minDuration: 900,
    maxDuration: 14400,
    baseDuration: 900,
    incrementDuration: 900,
    formatDuration: (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      if (mins < 60) return `${mins} min`;
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
    },
  },
  long_form_advanced: {
    minDuration: 900,
    maxDuration: 14400,
    baseDuration: 900,
    incrementDuration: 900,
    formatDuration: (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      if (mins < 60) return `${mins} min`;
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
    },
  },
};

export function StepConfigure() {
  const { selection, updateSelection, setCurrentStep, totals } = useEstimator();
  const { data: editingMenu } = useEditingMenu();

  // Get video editing items that need duration configuration
  const videoEditingItems = selection.editingItems.filter(item => {
    const menuItem = editingMenu?.find(m => m.id === item.id);
    return menuItem && menuItem.category !== 'photo_editing';
  });


  const calculateVideoEditPrice = (category: string, baseCustomerPrice: number, incrementPrice: number | null, duration: number): number => {
    const config = VIDEO_EDITING_CONFIG[category];
    if (!config) return baseCustomerPrice;
    
    const baseDuration = config.baseDuration;
    if (duration <= baseDuration) return baseCustomerPrice;
    
    const customerIncrementPrice = incrementPrice || 0;
    const additionalIncrements = Math.ceil((duration - baseDuration) / config.incrementDuration);
    return baseCustomerPrice + (additionalIncrements * customerIncrementPrice);
  };

  const updateEditingQuantity = (itemId: string, newQuantity: number, category: string) => {
    const config = VIDEO_EDITING_CONFIG[category];
    const minQuantity = config?.minDuration || 1;
    const quantity = Math.max(minQuantity, newQuantity);
    
    updateSelection({
      editingItems: selection.editingItems.map(e => 
        e.id === itemId ? { ...e, quantity } : e
      ),
    });
  };

  const handleNext = () => {
    setCurrentStep(7);
  };

  const handleBack = () => {
    setCurrentStep(5);
  };

  // If no video editing items to configure, this step shouldn't be shown
  // But we still render it in case user navigates here
  if (videoEditingItems.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No items to configure. Click next to view summary.
            </p>
          </CardContent>
        </Card>
        
        <div className="flex justify-between">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button onClick={handleNext}>
            View Summary
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="h-4 w-4" />
            Configure Video Editing
          </CardTitle>
          <CardDescription>
            Set the duration for each selected editing service
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {videoEditingItems.map(item => {
            const menuItem = editingMenu?.find(m => m.id === item.id);
            if (!menuItem) return null;
            
            const config = VIDEO_EDITING_CONFIG[menuItem.category];
            if (!config) return null;
            
            const duration = item.quantity;
            const itemTotal = calculateVideoEditPrice(
              menuItem.category,
              item.customerPrice,
              item.incrementPrice,
              duration
            );
            
            return (
              <div key={item.id} className="space-y-3 pb-4 border-b last:border-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{menuItem.description}</p>
                  </div>
                  <span className="text-lg font-bold">${itemTotal}</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="font-medium">{config.formatDuration(duration)}</span>
                  </div>
                  <Slider
                    value={[duration]}
                    min={config.minDuration}
                    max={config.maxDuration}
                    step={config.incrementDuration}
                    onValueChange={([val]) => updateEditingQuantity(item.id, val, menuItem.category)}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{config.formatDuration(config.minDuration)}</span>
                    <span>{config.formatDuration(config.maxDuration)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Running Total */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Running Total</span>
            <span className="text-xl font-bold">${totals.customerTotal.toFixed(0)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleNext}>
          View Summary
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
