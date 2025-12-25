import { useEstimator } from '@/contexts/EstimatorContext';
import { useServices } from '@/hooks/useEstimatorData';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { SERVICE_LABELS, ServiceType } from '@/types/estimator';
import { Mic, Video, Music, Camera, ArrowLeft, ArrowRight } from 'lucide-react';

const SERVICE_ICONS: Record<ServiceType, typeof Mic> = {
  audio_podcast: Mic,
  vodcast: Video,
  recording_session: Music,
  photoshoot: Camera,
};

export function StepService() {
  const { selection, updateSelection, setCurrentStep } = useEstimator();
  const { data: services, isLoading } = useServices();

  // Service to Studio restrictions:
  // - photoshoot -> multimedia_studio
  // - recording_session -> audio_studio
  // - audio_podcast -> podcast_room
  // - vodcast -> multimedia_studio
  const SERVICE_STUDIO_MAP: Record<string, string> = {
    photoshoot: 'multimedia_studio',
    recording_session: 'audio_studio',
    audio_podcast: 'podcast_room',
    vodcast: 'multimedia_studio',
  };

  const availableServices = services?.filter(service => {
    // Full Studio Buyout has access to ALL services (includes all spaces)
    if (selection.studioType === 'full_studio_buyout') {
      return true;
    }
    const requiredStudio = SERVICE_STUDIO_MAP[service.type];
    if (requiredStudio && selection.studioType !== requiredStudio) {
      return false;
    }
    return true;
  });

  const getRestrictionMessage = () => {
    // No restrictions for Full Studio Buyout - all spaces included
    if (selection.studioType === 'full_studio_buyout') {
      return [];
    }
    const messages: string[] = [];
    if (selection.studioType !== 'multimedia_studio') {
      messages.push('Photoshoot & Vodcast available in Multimedia Studio only');
    }
    if (selection.studioType !== 'audio_studio') {
      messages.push('Recording Sessions available in Audio Studio only');
    }
    if (selection.studioType !== 'podcast_room') {
      messages.push('Podcasts available in Podcast Room only');
    }
    return messages.filter(m => {
      // Only show relevant restrictions for current studio
      if (selection.studioType === 'multimedia_studio') return m.includes('Recording') || m.includes('Podcast');
      if (selection.studioType === 'audio_studio') return m.includes('Photoshoot') || m.includes('Podcast');
      if (selection.studioType === 'podcast_room') return m.includes('Photoshoot') || m.includes('Recording');
      return true;
    }).slice(0, 2);
  };

  const restrictionMessages = getRestrictionMessage();

  const handleSelect = (service: any) => {
    const updates: any = {
      serviceId: service.id,
      serviceType: service.type as ServiceType,
      cameraCount: service.type === 'vodcast' ? 1 : 1,
    };
    
    // Auto-include Set Design + Lv1 Props Access for photoshoots
    if (service.type === 'photoshoot') {
      updates.sessionAddons = [
        {
          id: 'set-design-photoshoot',
          name: 'Set Design + Lv1 Props Access',
          flatAmount: 60,
          isHourly: false,
          isAutoIncluded: true,
        },
      ];
    } else {
      // Clear auto-included addons when switching away from photoshoot
      updates.sessionAddons = selection.sessionAddons.filter(a => !a.isAutoIncluded);
    }
    
    updateSelection(updates);
  };

  const handleNext = () => {
    if (selection.serviceType) {
      setCurrentStep(3);
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
        {availableServices?.map(service => {
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
                      : service.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
          );
        })}
      </div>

      {restrictionMessages.length > 0 && (
        <div className="text-sm text-muted-foreground text-center space-y-1">
          {restrictionMessages.map((msg, i) => (
            <p key={i}>💡 {msg}</p>
          ))}
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(1)}>
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
