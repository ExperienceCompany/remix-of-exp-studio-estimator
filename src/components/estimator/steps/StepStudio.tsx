import { useEstimator } from '@/contexts/EstimatorContext';
import { useStudios, useDiyRates, useTimeSlots } from '@/hooks/useEstimatorData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { STUDIO_LABELS, StudioType } from '@/types/estimator';
import { Mic, Music, Video, Monitor, ArrowLeft, ArrowRight, Building } from 'lucide-react';

const STUDIO_ICONS: Record<StudioType, typeof Mic> = {
  podcast_room: Mic,
  audio_studio: Music,
  multimedia_studio: Video,
  digital_edit_studio: Monitor,
  full_studio_buyout: Building,
};

// Services with multiple studio options
const SERVICE_STUDIO_OPTIONS: Record<string, StudioType[]> = {
  vodcast: ['multimedia_studio', 'full_studio_buyout'],
};

export function StepStudio() {
  const { selection, updateSelection, setCurrentStep } = useEstimator();
  const { data: studios, isLoading } = useStudios();
  const { data: rates } = useDiyRates();
  const { data: timeSlots } = useTimeSlots();

  const isDiy = selection.sessionType === 'diy';

  const getStartingPrice = (studioType: string) => {
    if (!rates || !timeSlots) return null;
    const studioRates = rates.filter(r => r.studios?.type === studioType);
    if (!studioRates.length) return null;
    const minRate = Math.min(...studioRates.map(r => Number(r.first_hour_rate)));
    return minRate;
  };

  // Filter studios based on context
  const filteredStudios = studios?.filter(studio => {
    // For DIY, show all studios
    if (isDiy) return true;
    
    // For serviced with a service selected, filter to valid options
    if (selection.serviceType && SERVICE_STUDIO_OPTIONS[selection.serviceType]) {
      return SERVICE_STUDIO_OPTIONS[selection.serviceType].includes(studio.type as StudioType);
    }
    
    return true;
  });

  const handleSelect = (studio: any) => {
    updateSelection({
      studioId: studio.id,
      studioType: studio.type as StudioType,
    });
  };

  const handleNext = () => {
    if (selection.studioType) {
      // Go to Day & Time (step 3)
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    if (isDiy) {
      // DIY: go back to Session Type (step 0)
      setCurrentStep(0);
    } else {
      // Serviced: go back to Service (step 1)
      setCurrentStep(1);
    }
  };

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        {filteredStudios?.map(studio => {
          const Icon = STUDIO_ICONS[studio.type as StudioType] || Mic;
          const startingPrice = getStartingPrice(studio.type);
          
          return (
            <Card 
              key={studio.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                selection.studioId === studio.id && "ring-2 ring-primary"
              )}
              onClick={() => handleSelect(studio)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  {startingPrice && (
                    <span className="text-sm text-muted-foreground">
                      From ${startingPrice}/hr
                    </span>
                  )}
                </div>
                <CardTitle className="text-lg">{studio.name}</CardTitle>
                <CardDescription>
                  {studio.description}
                </CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleNext} disabled={!selection.studioType}>
          Next
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
