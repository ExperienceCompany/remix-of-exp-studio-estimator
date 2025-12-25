import { useEstimator } from '@/contexts/EstimatorContext';
import { useServices, useProviderLevels } from '@/hooks/useEstimatorData';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { SERVICE_LABELS, ServiceType, CrewAllocation } from '@/types/estimator';
import { Mic, Video, Music, Camera, ArrowLeft, ArrowRight, Minus, Plus, Users } from 'lucide-react';

const SERVICE_ICONS: Record<ServiceType, typeof Mic> = {
  audio_podcast: Mic,
  vodcast: Video,
  recording_session: Music,
  photoshoot: Camera,
};

export function StepService() {
  const { selection, updateSelection, setCurrentStep } = useEstimator();
  const { data: services, isLoading } = useServices();
  const { data: providerLevels } = useProviderLevels();

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
    updateSelection({
      serviceId: service.id,
      serviceType: service.type as ServiceType,
      cameraCount: service.type === 'vodcast' ? 1 : 1,
    });
  };

  const updateCrewLevel = (level: keyof CrewAllocation, delta: number) => {
    const current = selection.crewAllocation[level];
    const newValue = Math.max(0, current + delta);
    updateSelection({
      crewAllocation: {
        ...selection.crewAllocation,
        [level]: newValue,
      },
    });
  };

  const handleNext = () => {
    if (selection.serviceType) {
      setCurrentStep(3);
    }
  };

  // Calculate total crew and cost
  const { lv1, lv2, lv3 } = selection.crewAllocation;
  const totalCrew = lv1 + lv2 + lv3;
  const lv1Rate = providerLevels?.find(p => p.level === 'lv1')?.hourly_rate || 20;
  const lv2Rate = providerLevels?.find(p => p.level === 'lv2')?.hourly_rate || 30;
  const lv3Rate = providerLevels?.find(p => p.level === 'lv3')?.hourly_rate || 40;
  const totalCrewCostPerHour = lv1 * Number(lv1Rate) + lv2 * Number(lv2Rate) + lv3 * Number(lv3Rate);

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

      {/* Production Crew Level Selector (only for serviced sessions) */}
      {selection.sessionType === 'serviced' && selection.serviceType && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Production Crew
            </CardTitle>
            <CardDescription>
              Select the number of crew members at each level
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Level 1 */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium">Level 1 - Entry</p>
                <p className="text-xs text-muted-foreground">+${lv1Rate}/hr per crew</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateCrewLevel('lv1', -1)}
                  disabled={lv1 <= 0}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center font-medium">{lv1}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateCrewLevel('lv1', 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Level 2 */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium">Level 2 - Experienced</p>
                <p className="text-xs text-muted-foreground">+${lv2Rate}/hr per crew</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateCrewLevel('lv2', -1)}
                  disabled={lv2 <= 0}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center font-medium">{lv2}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateCrewLevel('lv2', 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Level 3 */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium">Level 3 - Expert</p>
                <p className="text-xs text-muted-foreground">+${lv3Rate}/hr per crew</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateCrewLevel('lv3', -1)}
                  disabled={lv3 <= 0}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center font-medium">{lv3}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateCrewLevel('lv3', 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Summary */}
            {totalCrew > 0 && (
              <div className="pt-3 border-t flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Crew: {totalCrew}</span>
                <span className="text-sm font-medium">+${totalCrewCostPerHour}/hr</span>
              </div>
            )}
          </CardContent>
        </Card>
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
