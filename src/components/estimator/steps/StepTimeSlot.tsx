import { useEstimator } from '@/contexts/EstimatorContext';
import { useTimeSlots, useDiyRates } from '@/hooks/useEstimatorData';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { TimeSlotType } from '@/types/estimator';
import { Sun, Moon, ArrowLeft, ArrowRight } from 'lucide-react';

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
