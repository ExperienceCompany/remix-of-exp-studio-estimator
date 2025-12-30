import { useEstimator } from '@/contexts/EstimatorContext';
import { useTimeSlots, useDiyRates, useProviderLevels } from '@/hooks/useEstimatorData';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { TimeSlotType, PROVIDER_LEVEL_LABELS } from '@/types/estimator';
import { Sun, Moon, ArrowLeft, ArrowRight, Check, Camera, Sparkles, Users } from 'lucide-react';

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
  const { data: providerLevels } = useProviderLevels();

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

  // Get provider hourly rate if selected
  const getProviderRate = () => {
    if (!selection.providerLevel || !providerLevels) return 0;
    const provider = providerLevels.find(p => p.level === selection.providerLevel);
    return provider ? Number(provider.hourly_rate) : 0;
  };

  const providerRate = getProviderRate();

  // Calculate running total from session add-ons, editing items, and provider (note: provider is per hour, shown separately)
  const calculateRunningTotal = () => {
    let total = 0;
    
    // Session add-ons (flat fees only - hourly addons depend on duration)
    selection.sessionAddons.forEach(addon => {
      if (!addon.isHourly) {
        total += addon.flatAmount;
      }
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
  
  // Filter optional add-ons to only show those applicable to current studio
  // Event Setup & Breakdown only applies to full_studio_buyout or multimedia_studio
  const optionalAddons = selection.sessionAddons.filter(addon => {
    // Skip included addons
    if (addon.name.toLowerCase().includes('setup') || addon.name.toLowerCase().includes('set design')) {
      return false;
    }
    
    // Event Setup & Breakdown only for full studio or multimedia
    if (addon.name.toLowerCase().includes('event setup')) {
      return selection.studioType === 'full_studio_buyout' || selection.studioType === 'multimedia_studio';
    }
    
    return true;
  });

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
      {/* Consolidated Running Total Summary */}
      {(runningTotal > 0 || providerRate > 0 || includedAddons.length > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Your Selections So Far</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {/* Included items */}
            {includedAddons.map(addon => (
              <div key={addon.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                <span className="text-sm">
                  {addon.name}
                  <span className="text-xs text-muted-foreground ml-1">(included)</span>
                </span>
                <span className="text-sm font-medium">+${addon.flatAmount}</span>
              </div>
            ))}
            
            {/* Optional add-ons */}
            {optionalAddons.map(addon => (
              <div key={addon.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                <span className="text-sm">{addon.name}</span>
                <span className="text-sm font-medium">+${addon.flatAmount}</span>
              </div>
            ))}
            
            {/* Editing items */}
            {selection.wantsEditing && selection.editingItems.map(item => (
              <div key={item.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                <span className="text-sm">
                  {item.name}
                  <span className="text-xs text-muted-foreground ml-1">
                    ({item.quantity} {selection.serviceType === 'photoshoot' ? 'edits' : 'sec'})
                  </span>
                </span>
                <span className="text-sm font-medium">+${item.quantity * (item.customerPrice || item.basePrice)}</span>
              </div>
            ))}
            
            {/* Production crew */}
            {isServiced && selection.providerLevel && providerRate > 0 && (
              <div className="flex justify-between items-center py-2 border-b last:border-b-0">
                <span className="text-sm">
                  Production Crew
                  <span className="text-xs text-muted-foreground ml-1">({PROVIDER_LEVEL_LABELS[selection.providerLevel]})</span>
                </span>
                <span className="text-sm font-medium">+${providerRate}/hr</span>
              </div>
            )}
            
            {/* Subtotal footer */}
            <div className="pt-3 mt-2 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Subtotal</span>
                <span className="font-semibold">
                  ${runningTotal}
                  {isServiced && providerRate > 0 && (
                    <span className="font-normal text-muted-foreground"> + ${providerRate}/hr</span>
                  )}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">+ studio time (select below)</p>
            </div>
          </CardContent>
        </Card>
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
