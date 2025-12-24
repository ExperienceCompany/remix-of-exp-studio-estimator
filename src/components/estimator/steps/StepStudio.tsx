import { useEstimator } from '@/contexts/EstimatorContext';
import { useStudios, useDiyRates, useTimeSlots } from '@/hooks/useEstimatorData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { STUDIO_LABELS, StudioType } from '@/types/estimator';
import { Mic, Music, Video, Monitor, ArrowLeft, ArrowRight } from 'lucide-react';

const STUDIO_ICONS: Record<StudioType, typeof Mic> = {
  podcast_room: Mic,
  audio_studio: Music,
  multimedia_studio: Video,
  digital_edit_studio: Monitor,
};

export function StepStudio() {
  const { selection, updateSelection, setCurrentStep } = useEstimator();
  const { data: studios, isLoading } = useStudios();
  const { data: rates } = useDiyRates();
  const { data: timeSlots } = useTimeSlots();

  const getStartingPrice = (studioType: string) => {
    if (!rates || !timeSlots) return null;
    const studioRates = rates.filter(r => r.studios?.type === studioType);
    if (!studioRates.length) return null;
    const minRate = Math.min(...studioRates.map(r => Number(r.first_hour_rate)));
    return minRate;
  };

  // If photoshoot is selected, only multimedia_studio is available
  const isPhotoshootSelected = selection.serviceType === 'photoshoot';

  const handleSelect = (studio: any) => {
    const newStudioType = studio.type as StudioType;
    
    // If changing away from multimedia_studio and photoshoot was selected, clear service
    const shouldClearService = selection.serviceType === 'photoshoot' && newStudioType !== 'multimedia_studio';
    
    updateSelection({
      studioId: studio.id,
      studioType: newStudioType,
      ...(shouldClearService && { serviceId: null, serviceType: null }),
    });
  };

  const handleNext = () => {
    if (selection.studioType) {
      setCurrentStep(2);
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
        {studios?.map(studio => {
          const Icon = STUDIO_ICONS[studio.type as StudioType] || Mic;
          const startingPrice = getStartingPrice(studio.type);
          const isDisabled = isPhotoshootSelected && studio.type !== 'multimedia_studio';
          
          return (
            <Card 
              key={studio.id}
              className={cn(
                "transition-all",
                isDisabled 
                  ? "opacity-50 cursor-not-allowed" 
                  : "cursor-pointer hover:shadow-md",
                selection.studioId === studio.id && "ring-2 ring-primary"
              )}
              onClick={() => !isDisabled && handleSelect(studio)}
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
                  {isDisabled && (
                    <span className="block text-xs mt-1 text-destructive">
                      Photoshoot requires Multimedia Studio
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(0)}>
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
