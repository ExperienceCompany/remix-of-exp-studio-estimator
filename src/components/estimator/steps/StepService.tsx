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

  const handleSelect = (service: any) => {
    updateSelection({
      serviceId: service.id,
      serviceType: service.type as ServiceType,
      cameraCount: service.type === 'vodcast' ? 1 : 1,
    });
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
                    <CardDescription className="text-sm">{service.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

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
