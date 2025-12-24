import { useEstimator } from '@/contexts/EstimatorContext';
import { 
  STUDIO_LABELS, 
  SERVICE_LABELS, 
  TIME_SLOT_LABELS, 
  PROVIDER_LEVEL_LABELS,
  StudioType,
  ServiceType,
  TimeSlotType,
  ProviderLevel
} from '@/types/estimator';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Building2, 
  Mic, 
  Clock, 
  Timer, 
  UserCheck, 
  Camera 
} from 'lucide-react';

function formatDuration(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)} min`;
  }
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) {
    return `${h} hour${h > 1 ? 's' : ''}`;
  }
  return `${h}h ${m}m`;
}

export function SelectionSummary() {
  const { selection, currentStep } = useEstimator();

  // Don't show on first step
  if (currentStep === 0) return null;

  const items: { icon: React.ReactNode; label: string; value: string }[] = [];

  // Session Type
  if (selection.sessionType) {
    items.push({
      icon: <Users className="h-3 w-3" />,
      label: 'Session',
      value: selection.sessionType === 'diy' ? 'DIY' : 'EXP'
    });
  }

  // Studio
  if (selection.studioType) {
    items.push({
      icon: <Building2 className="h-3 w-3" />,
      label: 'Studio',
      value: STUDIO_LABELS[selection.studioType as StudioType]
    });
  }

  // Service
  if (selection.serviceType) {
    items.push({
      icon: <Mic className="h-3 w-3" />,
      label: 'Service',
      value: SERVICE_LABELS[selection.serviceType as ServiceType]
    });
  }

  // Time Slot
  if (selection.timeSlotType) {
    items.push({
      icon: <Clock className="h-3 w-3" />,
      label: 'Time',
      value: TIME_SLOT_LABELS[selection.timeSlotType as TimeSlotType]
    });
  }

  // Duration (show after step 4)
  if (currentStep > 4 && selection.hours) {
    items.push({
      icon: <Timer className="h-3 w-3" />,
      label: 'Duration',
      value: formatDuration(selection.hours)
    });
  }

  // Provider Level (only for serviced sessions)
  if (selection.sessionType === 'serviced' && selection.providerLevel) {
    items.push({
      icon: <UserCheck className="h-3 w-3" />,
      label: 'Provider',
      value: PROVIDER_LEVEL_LABELS[selection.providerLevel as ProviderLevel].replace(' (+$', ' (').replace('/hr)', ')')
    });
  }

  // Camera Count (only for vodcast with multiple cameras)
  if (selection.serviceType === 'vodcast' && selection.cameraCount > 1) {
    items.push({
      icon: <Camera className="h-3 w-3" />,
      label: 'Cameras',
      value: `${selection.cameraCount} cameras`
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 justify-center mb-6 px-4">
      {items.map((item, index) => (
        <Badge 
          key={index} 
          variant="secondary" 
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs"
        >
          {item.icon}
          <span className="text-muted-foreground">{item.label}:</span>
          <span className="font-medium">{item.value}</span>
        </Badge>
      ))}
    </div>
  );
}
