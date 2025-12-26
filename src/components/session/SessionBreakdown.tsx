import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  STUDIO_LABELS, 
  SERVICE_LABELS, 
  TIME_SLOT_LABELS,
  StudioType,
  ServiceType,
  TimeSlotType,
} from '@/types/estimator';
import type { EstimatorSelection } from '@/types/estimator';
import { Package, Film, Users } from 'lucide-react';

interface SessionBreakdownProps {
  selection: EstimatorSelection | null;
}

export function SessionBreakdown({ selection }: SessionBreakdownProps) {
  if (!selection) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Session Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No session details available</p>
        </CardContent>
      </Card>
    );
  }

  // Build crew display string
  const { lv1, lv2, lv3 } = selection.crewAllocation;
  const crewParts: string[] = [];
  if (lv1 > 0) crewParts.push(lv1 > 1 ? `Lv1 ×${lv1}` : 'Lv1');
  if (lv2 > 0) crewParts.push(lv2 > 1 ? `Lv2 ×${lv2}` : 'Lv2');
  if (lv3 > 0) crewParts.push(lv3 > 1 ? `Lv3 ×${lv3}` : 'Lv3');
  const crewDisplay = crewParts.length > 0 ? crewParts.join(', ') : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Session Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Session Type</p>
            <p className="font-medium">
              {selection.sessionType === 'diy' ? 'DIY' : 'EXP Session'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Studio</p>
            <p className="font-medium">
              {selection.studioType ? STUDIO_LABELS[selection.studioType as StudioType] : '-'}
            </p>
          </div>
          {selection.serviceType && (
            <div>
              <p className="text-muted-foreground">Service</p>
              <p className="font-medium">
                {SERVICE_LABELS[selection.serviceType as ServiceType]}
              </p>
            </div>
          )}
          <div>
            <p className="text-muted-foreground">Time Slot</p>
            <p className="font-medium">
              {selection.timeSlotType ? TIME_SLOT_LABELS[selection.timeSlotType as TimeSlotType] : '-'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Booked Duration</p>
            <p className="font-medium">{selection.hours} hour(s)</p>
          </div>
          {crewDisplay && (
            <div>
              <p className="text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" /> Crew
              </p>
              <p className="font-medium">{crewDisplay}</p>
            </div>
          )}
          {selection.serviceType === 'vodcast' && selection.cameraCount > 0 && (
            <div>
              <p className="text-muted-foreground">Cameras</p>
              <p className="font-medium">{selection.cameraCount}</p>
            </div>
          )}
        </div>

        {/* Editing Items */}
        {selection.editingItems && selection.editingItems.length > 0 && (
          <>
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <Film className="h-4 w-4" />
                Editing Add-ons
              </p>
              <div className="space-y-1">
                {selection.editingItems.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.name}</span>
                    <span>{item.quantity} unit(s)</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Session Add-ons */}
        {selection.sessionAddons && selection.sessionAddons.length > 0 && (
          <>
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Session Add-ons
              </p>
              <div className="space-y-1">
                {selection.sessionAddons.map((addon, i) => (
                  <div key={i} className="text-sm text-muted-foreground">
                    {addon.name}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
