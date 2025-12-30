import { useEstimator } from '@/contexts/EstimatorContext';
import { useServices, useStudios } from '@/hooks/useEstimatorData';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { SERVICE_LABELS, ServiceType, StudioType } from '@/types/estimator';
import { Mic, Video, Music, Camera, ArrowLeft, ArrowRight } from 'lucide-react';

const SERVICE_ICONS: Record<ServiceType, typeof Mic> = {
  audio_podcast: Mic,
  vodcast: Video,
  recording_session: Music,
  photoshoot: Camera,
};

// Services with only one valid studio option - auto-select and skip studio step
const SINGLE_STUDIO_SERVICES: Record<string, StudioType> = {
  photoshoot: 'multimedia_studio',
  recording_session: 'audio_studio',
  audio_podcast: 'podcast_room',
};

// Services with multiple studio options - require studio selection
const MULTI_STUDIO_SERVICES: Record<string, StudioType[]> = {
  vodcast: ['multimedia_studio', 'full_studio_buyout'],
};

export function StepService() {
  const { selection, updateSelection, setCurrentStep } = useEstimator();
  const { data: services, isLoading } = useServices();
  const { data: studios } = useStudios();

  const handleSelect = (service: any) => {
    const serviceType = service.type as ServiceType;
    
    const updates: any = {
      serviceId: service.id,
      serviceType: serviceType,
      cameraCount: service.type === 'vodcast' ? 1 : 1,
    };
    
    // Auto-include Photoshoot setup fee for photoshoots
    if (service.type === 'photoshoot') {
      updates.sessionAddons = [
        {
          id: 'set-design-photoshoot',
          name: 'Photoshoot setup fee',
          flatAmount: 60,
          isHourly: false,
          isAutoIncluded: true,
        },
      ];
    } else {
      // Clear auto-included addons when switching away from photoshoot
      updates.sessionAddons = selection.sessionAddons.filter(a => !a.isAutoIncluded);
    }
    
    // If single-studio service, auto-select the studio
    if (SINGLE_STUDIO_SERVICES[serviceType]) {
      const studioType = SINGLE_STUDIO_SERVICES[serviceType];
      const studio = studios?.find(s => s.type === studioType);
      if (studio) {
        updates.studioId = studio.id;
        updates.studioType = studioType;
      }
    } else {
      // Clear studio selection for multi-studio services so user must choose
      updates.studioId = null;
      updates.studioType = null;
    }
    
    updateSelection(updates);
  };

  const handleNext = () => {
    if (selection.serviceType) {
      // If single-studio service, skip studio step and go to Day & Time (step 3)
      if (SINGLE_STUDIO_SERVICES[selection.serviceType]) {
        setCurrentStep(3);
      } else {
        // Multi-studio service - go to studio selection (step 2)
        setCurrentStep(2);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        {services?.map(service => {
          const Icon = SERVICE_ICONS[service.type as ServiceType] || Mic;
          
          return (
          <Card 
            key={service.id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              selection.serviceId === service.id && "ring-2 ring-primary"
            )}
            onClick={() => handleSelect(service)}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">{service.name}</CardTitle>
                  <CardDescription className="text-sm">
                    {service.type === 'vodcast' 
                      ? 'Recording only – editing available as add-on'
                      : service.type === 'photoshoot'
                        ? 'Unedited photos only – editing add-on sold separately'
                        : service.description}
                  </CardDescription>
                </div>
              </div>
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
        <Button onClick={handleNext} disabled={!selection.serviceType}>
          Next
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
