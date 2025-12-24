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

  // Service to Studio restrictions
  const SERVICE_STUDIO_MAP: Record<string, string> = {
    photoshoot: 'multimedia_studio',
    recording_session: 'audio_studio',
    audio_podcast: 'podcast_room',
    vodcast: 'multimedia_studio',
  };

  const requiredStudioForService = selection.serviceType ? SERVICE_STUDIO_MAP[selection.serviceType] : null;

  const getDisabledMessage = (studioType: string) => {
    if (!requiredStudioForService || studioType === requiredStudioForService) return null;
    const serviceLabels: Record<string, string> = {
      photoshoot: 'Photoshoot',
      recording_session: 'Recording Session',
      audio_podcast: 'Podcast',
      vodcast: 'Vodcast',
    };
    const studioLabels: Record<string, string> = {
      multimedia_studio: 'Multimedia Studio',
      audio_studio: 'Audio Studio',
      podcast_room: 'Podcast Room',
      digital_edit_studio: 'Digital/Edit Studio',
    };
    return `${serviceLabels[selection.serviceType!]} requires ${studioLabels[requiredStudioForService]}`;
  };

  const handleSelect = (studio: any) => {
    const newStudioType = studio.type as StudioType;
    
    // Clear service if changing to incompatible studio
    const shouldClearService = requiredStudioForService && newStudioType !== requiredStudioForService;
    
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
          const disabledMessage = getDisabledMessage(studio.type);
          const isDisabled = !!disabledMessage;
          
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
                  {disabledMessage && (
                    <span className="block text-xs mt-1 text-destructive">
                      {disabledMessage}
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
