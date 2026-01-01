import { useEstimator } from '@/contexts/EstimatorContext';
import { useStudios, useDiyRates, useTimeSlots } from '@/hooks/useEstimatorData';
import { GradientButton } from '@/components/ui/gradient-button';
import { Button } from '@/components/ui/button';
import { SelectionCard } from '@/components/ui/selection-card';
import { Skeleton } from '@/components/ui/skeleton';
import { StudioType } from '@/types/estimator';
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
    if (isDiy) return true;
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
      const nextStep = selection.sessionType === 'diy' ? 2 : 3;
      setCurrentStep(nextStep);
    }
  };

  const handleBack = () => {
    if (isDiy) {
      setCurrentStep(0);
    } else {
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
            <SelectionCard 
              key={studio.id}
              title={studio.name}
              description={studio.description || undefined}
              icon={<Icon className="h-6 w-6" />}
              isSelected={selection.studioId === studio.id}
              price={startingPrice ? `From $${startingPrice}/hr` : undefined}
              onClick={() => handleSelect(studio)}
            />
          );
        })}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <GradientButton onClick={handleNext} disabled={!selection.studioType}>
          Next
          <ArrowRight className="h-4 w-4 ml-2" />
        </GradientButton>
      </div>
    </div>
  );
}
