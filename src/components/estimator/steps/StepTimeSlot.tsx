import { useEstimator } from '@/contexts/EstimatorContext';
import { useTimeSlots, useDiyRates } from '@/hooks/useEstimatorData';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { TimeSlotType } from '@/types/estimator';
import { Sun, Moon, ArrowLeft, ArrowRight, Check, Camera, Sparkles } from 'lucide-react';

const formatTime12Hour = (time24: string): string => {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

export function StepTimeSlot() {
  const { selection, updateSelection, setCurrentStep } = useEstimator();
  const { data: timeSlots, isLoading } = useTimeSlots();
  const { data: rates } = useDiyRates();

  const getRate = (timeSlotType: string) => {
    if (!rates || !selection.studioType) return null;
    const rate = rates.find(
      r => r.studios?.type === selection.studioType && r.time_slots?.type === timeSlotType
    );
    return rate ? Number(rate.first_hour_rate) : null;
  };

  // Get the min/max rates for context message
  const getRateRange = () => {
    if (!rates || !selection.studioType) return null;
    const studioRates = rates.filter(r => r.studios?.type === selection.studioType);
    if (!studioRates.length) return null;
    const min = Math.min(...studioRates.map(r => Number(r.first_hour_rate)));
    const max = Math.max(...studioRates.map(r => Number(r.first_hour_rate)));
    return { min, max };
  };

  const rateRange = getRateRange();
  const isServiced = selection.sessionType === 'serviced';

  // Calculate running total from session add-ons and editing items
  const calculateRunningTotal = () => {
    let total = 0;
    
    // Session add-ons
    selection.sessionAddons.forEach(addon => {
      total += addon.flatAmount;
    });
    
    // Editing items
    selection.editingItems.forEach(item => {
      total += item.quantity * (item.customerPrice || item.basePrice);
    });
    
    return total;
  };

  const runningTotal = calculateRunningTotal();

  // Separate included (auto-added) vs optional add-ons
  const includedAddons = selection.sessionAddons.filter(addon => 
    addon.name.toLowerCase().includes('setup') || addon.name.toLowerCase().includes('set design')
  );
  const optionalAddons = selection.sessionAddons.filter(addon => 
    !addon.name.toLowerCase().includes('setup') && !addon.name.toLowerCase().includes('set design')
  );

  const handleSelect = (slot: any) => {
    updateSelection({
      timeSlotId: slot.id,
      timeSlotType: slot.type as TimeSlotType,
    });
  };

  const handleNext = () => {
    if (selection.timeSlotType) {
      setCurrentStep(4);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  // Group by day range
  const dayGroups = [
    { label: 'Mon-Wed', slots: timeSlots?.filter(s => s.type.startsWith('mon_wed')) || [] },
    { label: 'Thu-Fri', slots: timeSlots?.filter(s => s.type.startsWith('thu_fri')) || [] },
    { label: 'Sat-Sun', slots: timeSlots?.filter(s => s.type.startsWith('sat_sun')) || [] },
  ];

  return (
    <div className="space-y-6">
      {/* Running Total Summary Section */}
      {runningTotal > 0 && (
        <div className="space-y-4">
          {/* Included with Session */}
          {includedAddons.length > 0 && (
            <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-amber-800 dark:text-amber-200">
                  <Check className="h-4 w-4" />
                  Included with Session
                </CardTitle>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Automatically included with your selected service
                </p>
              </CardHeader>
              <CardContent className="pt-0 space-y-1">
                {includedAddons.map(addon => (
                  <div key={addon.id} className="flex justify-between items-center py-2 border-t border-amber-200 dark:border-amber-800 first:border-t-0">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <span className="text-sm text-amber-800 dark:text-amber-200">{addon.name}</span>
                    </div>
                    <span className="font-medium text-amber-800 dark:text-amber-200">+${addon.flatAmount}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Optional Add-ons */}
          {optionalAddons.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Session Add-ons
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-1">
                {optionalAddons.map(addon => (
                  <div key={addon.id} className="flex justify-between items-center py-2 border-t first:border-t-0">
                    <span className="text-sm">{addon.name}</span>
                    <span className="font-medium">+${addon.flatAmount}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Photo/Video Editing */}
          {selection.wantsEditing && selection.editingItems.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  {selection.serviceType === 'photoshoot' ? 'Photo Editing' : 'Video Editing'}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Selected editing services
                </p>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {selection.editingItems.map(item => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-t first:border-t-0">
                    <div>
                      <span className="text-sm font-medium">{item.name}</span>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} {selection.serviceType === 'photoshoot' ? 'edits' : 'sec'} × ${item.customerPrice || item.basePrice}/{selection.serviceType === 'photoshoot' ? 'edit' : 'unit'}
                      </p>
                    </div>
                    <span className="font-medium">= ${item.quantity * (item.customerPrice || item.basePrice)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Running Total Banner */}
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-center">
            <p className="text-lg font-semibold">
              Estimate so far: ${runningTotal}
            </p>
            <p className="text-sm text-muted-foreground">
              + studio reservation time (select below)
            </p>
          </div>
        </div>
      )}

      {/* Contextual info banner */}
      {rateRange && (
        <div className="bg-muted/50 border rounded-lg p-3 text-sm">
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">
              Base Rate: ${rateRange.min}{rateRange.max > rateRange.min ? `–$${rateRange.max}` : ''}/hr
            </span>
            {isServiced ? (
              <span className="ml-1">(space only – service & crew additional)</span>
            ) : (
              <span className="ml-1">(space & equipment)</span>
            )}
          </p>
        </div>
      )}

      {dayGroups.map(group => (
        <div key={group.label}>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">{group.label}</h3>
          <div className="grid grid-cols-2 gap-3">
            {group.slots.map(slot => {
              const rate = getRate(slot.type);
              const isEvening = slot.type.includes('eve');
              const Icon = isEvening ? Moon : Sun;
              
              return (
                <Card 
                  key={slot.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    selection.timeSlotId === slot.id && "ring-2 ring-primary"
                  )}
                  onClick={() => handleSelect(slot)}
                >
                  <CardHeader className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-sm font-medium">
                          {isEvening ? 'Evening' : 'Day'}
                        </CardTitle>
                      </div>
                      {rate && (
                        <span className="text-sm font-semibold text-primary">
                          ${rate}/hr
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatTime12Hour(slot.start_time)} - {formatTime12Hour(slot.end_time)}
                    </p>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(selection.sessionType === 'diy' ? 1 : 2)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleNext} disabled={!selection.timeSlotType}>
          Next
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
