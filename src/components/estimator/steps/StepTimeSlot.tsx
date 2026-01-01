import { useEstimator } from '@/contexts/EstimatorContext';
import { useTimeSlots, useDiyRates, useProviderLevels } from '@/hooks/useEstimatorData';
import { GradientButton } from '@/components/ui/gradient-button';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { PriceCounter } from '@/components/ui/price-counter';
import { cn } from '@/lib/utils';
import { TimeSlotType, PROVIDER_LEVEL_LABELS, EditingItem } from '@/types/estimator';
import { Sun, Moon, ArrowLeft, ArrowRight, Sparkles, TrendingUp } from 'lucide-react';

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

  const getProviderRate = () => {
    if (!selection.providerLevel || !providerLevels) return 0;
    const provider = providerLevels.find(p => p.level === selection.providerLevel);
    return provider ? Number(provider.hourly_rate) : 0;
  };

  const providerRate = getProviderRate();

  const calculateRunningTotal = () => {
    let total = 0;
    selection.sessionAddons.forEach(addon => {
      if (!addon.isHourly) {
        total += addon.flatAmount;
      }
    });
    selection.editingItems.forEach(item => {
      total += calculateEditingItemTotal(item);
    });
    return total;
  };

  const runningTotal = calculateRunningTotal();

  const includedAddons = selection.sessionAddons.filter(addon => 
    addon.name.toLowerCase().includes('setup') || addon.name.toLowerCase().includes('set design')
  );
  
  const optionalAddons = selection.sessionAddons.filter(addon => {
    if (addon.name.toLowerCase().includes('setup') || addon.name.toLowerCase().includes('set design')) {
      return false;
    }
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

  const dayGroups = [
    { label: 'Mon-Wed', badge: 'Best Value', slots: timeSlots?.filter(s => s.type.startsWith('mon_wed')) || [] },
    { label: 'Thu-Fri', badge: null, slots: timeSlots?.filter(s => s.type.startsWith('thu_fri')) || [] },
    { label: 'Sat-Sun', badge: 'Premium', slots: timeSlots?.filter(s => s.type.startsWith('sat_sun')) || [] },
  ];

  return (
    <div className="space-y-6">
      {/* Running Total Summary */}
      {(runningTotal > 0 || providerRate > 0 || includedAddons.length > 0) && (
        <Card className="bg-gradient-to-br from-muted/50 to-muted/30 border-muted-foreground/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Your Selections So Far
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {includedAddons.map(addon => (
              <div key={addon.id} className="flex justify-between items-center py-2 border-b border-border/50 last:border-b-0">
                <span className="text-sm">
                  {addon.name}
                  <Badge variant="secondary" className="ml-2 text-xs">Included</Badge>
                </span>
                <span className="text-sm font-medium">+${addon.flatAmount}</span>
              </div>
            ))}
            
            {optionalAddons.map(addon => (
              <div key={addon.id} className="flex justify-between items-center py-2 border-b border-border/50 last:border-b-0">
                <span className="text-sm">{addon.name}</span>
                <span className="text-sm font-medium">+${addon.flatAmount}</span>
              </div>
            ))}
            
            {selection.wantsEditing && selection.editingItems.map(item => (
              <div key={item.id} className="flex justify-between items-center py-2 border-b border-border/50 last:border-b-0">
                <span className="text-sm">
                  {item.name}
                  <span className="text-xs text-muted-foreground ml-1">
                    ({item.quantity} {selection.serviceType === 'photoshoot' ? 'edits' : 'sec'})
                  </span>
                </span>
                <span className="text-sm font-medium">+${calculateEditingItemTotal(item)}</span>
              </div>
            ))}
            
            {isServiced && selection.providerLevel && providerRate > 0 && (
              <div className="flex justify-between items-center py-2 border-b border-border/50 last:border-b-0">
                <span className="text-sm">
                  Production Crew
                  <span className="text-xs text-muted-foreground ml-1">({PROVIDER_LEVEL_LABELS[selection.providerLevel]})</span>
                </span>
                <span className="text-sm font-medium">+${providerRate}/hr</span>
              </div>
            )}
            
            {selection.timeSlotId && (() => {
              const selectedSlot = timeSlots?.find(s => s.id === selection.timeSlotId);
              const selectedRate = selection.timeSlotType ? getRate(selection.timeSlotType) : null;
              if (!selectedRate) return null;
              return (
                <div className="flex justify-between items-center py-2 border-b border-border/50 last:border-b-0">
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
            
            <div className="pt-3 mt-2 border-t border-border">
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
                    {selectedRate && totalHourly > 0 && (
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-border">
                        <span className="text-sm font-semibold">Estimate (1 hr)</span>
                        <PriceCounter value={runningTotal + totalHourly} size="md" />
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rate info banner */}
      {rateRange && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm flex items-center gap-3">
          <TrendingUp className="h-5 w-5 text-primary shrink-0" />
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">
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

      {/* Time slot groups */}
      {dayGroups.map((group, index) => (
        <div key={group.label} className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{group.label}</h3>
            {group.badge && (
              <Badge variant={group.badge === 'Best Value' ? 'secondary' : 'default'} className="text-xs">
                {group.badge}
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {group.slots.map(slot => {
              const rate = getRate(slot.type);
              const isEvening = slot.type.includes('eve');
              const Icon = isEvening ? Moon : Sun;
              const isSelected = selection.timeSlotId === slot.id;
              
              return (
                <Card 
                  key={slot.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1",
                    isSelected && "rainbow-border rainbow-border-slow shadow-lg"
                  )}
                  onClick={() => handleSelect(slot)}
                >
                  <CardHeader className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "h-8 w-8 rounded-lg flex items-center justify-center transition-all",
                          isSelected 
                            ? "bg-gradient-to-br from-[hsl(0,85%,60%)] to-[hsl(270,85%,60%)] text-white" 
                            : "bg-muted text-muted-foreground"
                        )}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <CardTitle className="text-sm font-medium">
                          {isEvening ? 'Evening' : 'Day'}
                        </CardTitle>
                      </div>
                      {rate && (
                        <span className={cn(
                          "text-sm font-bold transition-colors",
                          isSelected ? "text-primary" : "text-foreground"
                        )}>
                          ${rate}/hr
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTime12Hour(slot.start_time)} - {formatTime12Hour(slot.end_time)}
                    </p>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => setCurrentStep(selection.sessionType === 'diy' ? 1 : 2)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <GradientButton onClick={handleNext} disabled={!selection.timeSlotType}>
          Next
          <ArrowRight className="h-4 w-4 ml-2" />
        </GradientButton>
      </div>
    </div>
  );
}
