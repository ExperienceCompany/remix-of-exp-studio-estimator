import { useEstimator } from '@/contexts/EstimatorContext';
import { useServices, useStudios, useEditingMenu } from '@/hooks/useEstimatorData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { SERVICE_LABELS, ServiceType, StudioType } from '@/types/estimator';
import { Mic, Video, Music, Camera, ArrowLeft, ArrowRight, Check } from 'lucide-react';

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

// Follow-up question helpers
const getFollowUpQuestion = (serviceType: ServiceType): string => {
  switch (serviceType) {
    case 'photoshoot':
      return 'Do you want photo editing included?';
    case 'vodcast':
      return 'Do you want video editing included?';
    case 'recording_session':
      return 'Need any post-production?';
    case 'audio_podcast':
      return 'Need any post-production?';
    default:
      return 'Need any post-production services?';
  }
};

const getNoEditOption = (serviceType: ServiceType): { label: string; description: string } => {
  switch (serviceType) {
    case 'photoshoot':
      return { 
        label: 'Just unedited photos', 
        description: "I'll edit myself or don't need edits" 
      };
    case 'vodcast':
      return { 
        label: 'Just raw recording', 
        description: "I'll handle editing myself" 
      };
    default:
      return { 
        label: 'No, just the session', 
        description: "I'll handle post-production myself" 
      };
  }
};

const getYesEditOption = (serviceType: ServiceType): { label: string; description: string } => {
  switch (serviceType) {
    case 'photoshoot':
      return { 
        label: 'Include photo editing', 
        description: 'Starting at $10/edit, 5 edit minimum' 
      };
    case 'vodcast':
      return { 
        label: 'Include video editing', 
        description: 'Add editing services (configured in add-ons)' 
      };
    default:
      return { 
        label: 'Yes, show me options', 
        description: 'Add post-production services' 
      };
  }
};

export function StepService() {
  const { selection, updateSelection, setCurrentStep } = useEstimator();
  const { data: services, isLoading } = useServices();
  const { data: studios } = useStudios();
  const { data: editingMenu } = useEditingMenu();

  const handleSelect = (service: any) => {
    const serviceType = service.type as ServiceType;
    
    const updates: any = {
      serviceId: service.id,
      serviceType: serviceType,
      cameraCount: service.type === 'vodcast' ? 1 : 1,
      wantsEditing: null, // Reset when service changes
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

  const handleEditingChoice = (wantsEditing: boolean) => {
    const updates: any = { wantsEditing };
    
    // When user says "yes", immediately add editing items so they show in running total
    if (wantsEditing && editingMenu) {
      // For photoshoot: auto-add Simple Retouch Edit with 5 edits (regular serviced flow minimum)
      if (selection.serviceType === 'photoshoot') {
        const simpleRetouchItem = editingMenu.find(item => item.name === 'Simple Retouch Edit');
        if (simpleRetouchItem) {
          updates.editingItems = [
            {
              id: simpleRetouchItem.id,
              name: simpleRetouchItem.name,
              category: simpleRetouchItem.category,
              quantity: 5, // 5 edit minimum for regular serviced photoshoot
              basePrice: Number(simpleRetouchItem.base_price),
              customerPrice: Number(simpleRetouchItem.customer_price || simpleRetouchItem.base_price * 2),
              incrementPrice: null,
            },
          ];
        }
      }
      
      // For vodcast: auto-add long form simple editing
      if (selection.serviceType === 'vodcast') {
        const longFormItem = editingMenu.find(item => item.category === 'long_form_simple');
        if (longFormItem) {
          const sessionDurationSeconds = selection.hours * 3600;
          updates.editingItems = [
            {
              id: longFormItem.id,
              name: longFormItem.name,
              category: longFormItem.category,
              quantity: Math.max(900, sessionDurationSeconds),
              basePrice: Number(longFormItem.base_price),
              customerPrice: Number(longFormItem.customer_price),
              incrementPrice: longFormItem.increment_price ? Number(longFormItem.increment_price) : null,
              crewLevel: 'lv2',
            },
          ];
        }
      }
    } else if (!wantsEditing) {
      // Clear editing items when user says "no"
      updates.editingItems = [];
    }
    
    updateSelection(updates);
  };

  const handleNext = () => {
    if (selection.serviceType && selection.wantsEditing !== null) {
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

  const noEditOption = selection.serviceType ? getNoEditOption(selection.serviceType) : null;
  const yesEditOption = selection.serviceType ? getYesEditOption(selection.serviceType) : null;

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

      {/* Follow-up question about editing */}
      {selection.serviceType && noEditOption && yesEditOption && (
        <Card className="border-primary/20 bg-muted/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {getFollowUpQuestion(selection.serviceType)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* No editing option */}
            <div 
              className={cn(
                "p-3 rounded-lg border cursor-pointer transition-all",
                selection.wantsEditing === false 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/50"
              )}
              onClick={() => handleEditingChoice(false)}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                  selection.wantsEditing === false 
                    ? "border-primary bg-primary" 
                    : "border-muted-foreground"
                )}>
                  {selection.wantsEditing === false && (
                    <Check className="h-3 w-3 text-primary-foreground" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm">{noEditOption.label}</p>
                  <p className="text-xs text-muted-foreground">{noEditOption.description}</p>
                </div>
              </div>
            </div>

            {/* Yes editing option */}
            <div 
              className={cn(
                "p-3 rounded-lg border cursor-pointer transition-all",
                selection.wantsEditing === true 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/50"
              )}
              onClick={() => handleEditingChoice(true)}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                  selection.wantsEditing === true 
                    ? "border-primary bg-primary" 
                    : "border-muted-foreground"
                )}>
                  {selection.wantsEditing === true && (
                    <Check className="h-3 w-3 text-primary-foreground" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm">{yesEditOption.label}</p>
                  <p className="text-xs text-muted-foreground">{yesEditOption.description}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(0)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleNext} disabled={!selection.serviceType || selection.wantsEditing === null}>
          Next
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
