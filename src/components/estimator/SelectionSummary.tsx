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
  Camera,
  Film,
  Package
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

  // Crew Allocation (show each level with crew)
  if (selection.sessionType === 'serviced') {
    const { lv1, lv2, lv3 } = selection.crewAllocation;
    if (lv1 > 0) {
      items.push({ icon: <UserCheck className="h-3 w-3" />, label: 'Lv1 Crew', value: `${lv1}` });
    }
    if (lv2 > 0) {
      items.push({ icon: <UserCheck className="h-3 w-3" />, label: 'Lv2 Crew', value: `${lv2}` });
    }
    if (lv3 > 0) {
      items.push({ icon: <UserCheck className="h-3 w-3" />, label: 'Lv3 Crew', value: `${lv3}` });
    }
  }

  // Camera Count (only for vodcast with multiple cameras)
  if (selection.serviceType === 'vodcast' && selection.cameraCount > 1) {
    items.push({
      icon: <Camera className="h-3 w-3" />,
      label: 'Cameras',
      value: `${selection.cameraCount} cameras`
    });
  }

  // Editing Items
  const formatEditDuration = (seconds: number, category: string) => {
    if (category === 'social') return `${seconds} buckets`;
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}min`;
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hrs}h${remainingMins > 0 ? ` ${remainingMins}m` : ''}`;
  };

  selection.editingItems.forEach(item => {
    const durationStr = formatEditDuration(item.quantity, item.category);
    const crewParts: string[] = [];
    if (item.assignedCrew?.lv1) {
      crewParts.push(item.assignedCrew.lv1 > 1 ? `Lv1 x${item.assignedCrew.lv1}` : 'Lv1');
    }
    if (item.assignedCrew?.lv2) {
      crewParts.push(item.assignedCrew.lv2 > 1 ? `Lv2 x${item.assignedCrew.lv2}` : 'Lv2');
    }
    if (item.assignedCrew?.lv3) {
      crewParts.push(item.assignedCrew.lv3 > 1 ? `Lv3 x${item.assignedCrew.lv3}` : 'Lv3');
    }
    const crewStr = crewParts.length > 0 ? ` • ${crewParts.join(', ')}` : '';
    items.push({
      icon: <Film className="h-3 w-3" />,
      label: item.name.split(' ')[0],
      value: `${durationStr}${crewStr}`
    });
  });

  // Session Add-ons
  selection.sessionAddons.forEach(addon => {
    const valueStr = addon.hours ? `${addon.hours}hr` : addon.name;
    items.push({
      icon: <Package className="h-3 w-3" />,
      label: addon.name === 'Revisions' ? 'Revisions' : 'Add-on',
      value: valueStr
    });
  });

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
