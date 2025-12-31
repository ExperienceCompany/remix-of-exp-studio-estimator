import { useEstimator } from '@/contexts/EstimatorContext';
import { useTimeSlots, useDiyRates, useProviderLevels } from '@/hooks/useEstimatorData';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { TimeSlotType, PROVIDER_LEVEL_LABELS, EditingItem } from '@/types/estimator';
import { Sun, Moon, ArrowLeft, ArrowRight } from 'lucide-react';

const formatTime12Hour = (time24: string): string => {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

// Video editing config for duration-based pricing
const VIDEO_EDITING_CONFIG: Record<string, { baseDuration: number; incrementDuration: number }> = {
  'social': { baseDuration: 30, incrementDuration: 30 },
  'general_basic': { baseDuration: 30, incrementDuration: 30 },
  'general_advanced': { baseDuration: 30, incrementDuration: 30 },
  'long_form_simple': { baseDuration: 900, incrementDuration: 900 },
  'long_form_advanced': { baseDuration: 900, incrementDuration: 900 },
};

const EDITING_CREW_MULTIPLIERS: Record<string, number> = { lv1: 0.75, lv2: 1, lv3: 1.25 };

// Calculate video editing item price with duration-based pricing and crew multiplier
const calculateEditingItemTotal = (item: EditingItem): number => {
  const config = VIDEO_EDITING_CONFIG[item.category];
  
  if (config) {
    // Video editing: duration-based pricing
    const duration = item.quantity;
    let baseItemTotal: number;
    
    if (duration <= config.baseDuration) {
      baseItemTotal = item.customerPrice || item.basePrice;
    } else {
      const additionalIncrements = Math.ceil((duration - config.baseDuration) / config.incrementDuration);
      baseItemTotal = (item.customerPrice || item.basePrice) + (additionalIncrements * (item.incrementPrice || 0));
    }
    
    const crewLevel = item.crewLevel || 'lv2';
    const multiplier = EDITING_CREW_MULTIPLIERS[crewLevel] || 1;
    return Math.round(baseItemTotal * multiplier);
  } else {
    // Photo editing: simple quantity × price
    return (item.customerPrice || item.basePrice) * item.quantity;
  }
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

  // Calculate running total from session add-ons, editing items, and provider
  const calculateRunningTotal = () => {
    let total = 0;
    
    // Session add-ons (flat fees only - hourly addons depend on duration)
    selection.sessionAddons.forEach(addon => {
      if (!addon.isHourly) {
        total += addon.flatAmount;
      }
    });
    
    // Editing items with proper calculation
    selection.editingItems.forEach(item => {
      total += calculateEditingItemTotal(item);
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
      // DIY: TimeSlot is step 2 → Duration is step 3
      // Serviced: TimeSlot is step 3 → Duration is step 4
      const nextStep = selection.sessionType === 'diy' ? 3 : 4;
      setCurrentStep(nextStep);
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
                <span className="text-sm font-medium">+${calculateEditingItemTotal(item)}</span>
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
            
            {/* Studio time - show when time slot is selected */}
            {selection.timeSlotId && (() => {
              const selectedSlot = timeSlots?.find(s => s.id === selection.timeSlotId);
              const selectedRate = selection.timeSlotType ? getRate(selection.timeSlotType) : null;
              if (!selectedRate) return null;
              return (
                <div className="flex justify-between items-center py-2 border-b last:border-b-0">
                  <span className="text-sm">
                    Studio Time
                    <span className="text-xs text-muted-foreground ml-1">
                      ({selectedSlot?.name || 'Selected'})
                    </span>
                  </span>
                  <span className="text-sm font-medium">+${selectedRate}/hr</span>
                </div>
              );
            })()}
            
            {/* Subtotal footer */}
            <div className="pt-3 mt-2 border-t">
              {(() => {
                const selectedRate = selection.timeSlotType ? getRate(selection.timeSlotType) : null;
                const totalHourly = (isServiced && providerRate > 0 ? providerRate : 0) + (selectedRate || 0);
                
                return (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Subtotal</span>
                      <span className="font-semibold">
                        ${runningTotal}
                        {totalHourly > 0 && (
                          <span className="font-normal text-muted-foreground"> + ${totalHourly}/hr</span>
                        )}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedRate 
                        ? '(hourly rates apply to session duration)'
                        : '+ studio time (select below)'}
                    </p>
                    {selectedRate && totalHourly > 0 && (
                      <div className="flex justify-between items-center mt-3 pt-3 border-t">
                        <span className="text-sm font-semibold">Estimate Grand Total for 1 hr</span>
                        <span className="font-bold text-primary text-lg">${runningTotal + totalHourly}</span>
                      </div>
                    )}
                  </>
                );
              })()}
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

      {dayGroups.map((group, index) => (
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
          {index < dayGroups.length - 1 && (
            <Separator className="mt-6 bg-border" />
          )}
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
