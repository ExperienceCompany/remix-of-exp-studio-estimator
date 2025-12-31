import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  STUDIO_LABELS, 
  SERVICE_LABELS, 
  TIME_SLOT_LABELS,
  StudioType,
  ServiceType,
  TimeSlotType,
} from '@/types/estimator';
import type { EstimatorSelection } from '@/types/estimator';
import { Package, Film, Users, Calendar, Clock, User, UserCircle } from 'lucide-react';

interface SessionBreakdownProps {
  selection: EstimatorSelection | null;
}

const formatTime12hr = (time: string): string => {
  if (!time) return '';
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
};

const getSessionDuration = (sel: any): number | string => {
  if (sel.hours) return sel.hours;
  
  const start = sel.startTime;
  const end = sel.endTime;
  if (start && end) {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;
    const diffHours = (endMins - startMins) / 60;
    return diffHours > 0 ? diffHours : '-';
  }
  return '-';
};

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

  // Safe destructuring with defaults
  const crewAllocation = selection.crewAllocation || { lv1: 0, lv2: 0, lv3: 0 };
  const { lv1, lv2, lv3 } = crewAllocation;
  const crewParts: string[] = [];
  if (lv1 > 0) crewParts.push(lv1 > 1 ? `Lv1 ×${lv1}` : 'Lv1');
  if (lv2 > 0) crewParts.push(lv2 > 1 ? `Lv2 ×${lv2}` : 'Lv2');
  if (lv3 > 0) crewParts.push(lv3 > 1 ? `Lv3 ×${lv3}` : 'Lv3');
  const crewDisplay = crewParts.length > 0 ? crewParts.join(', ') : null;

  // Cast for booking-derived fields
  const sel = selection as any;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Session Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Title (for booking-created sessions) */}
        {sel.title && (
          <div className="border-b pb-3">
            <p className="font-semibold text-lg">{sel.title}</p>
          </div>
        )}

        {/* Holder (creator or customer) */}
        {(sel.holderName || sel.creatorName || sel.customerName) && (
          <div className="pb-3 border-b space-y-1">
            <div className="flex items-center gap-2">
              <UserCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Holder:</span>
              <span className="font-medium">{sel.holderName || sel.creatorName || sel.customerName}</span>
              {(sel.holderRole || sel.creatorRole) && (
                <Badge 
                  variant={
                    (sel.holderRole || sel.creatorRole) === 'admin' ? 'destructive' : 
                    (sel.holderRole || sel.creatorRole) === 'staff' ? 'default' : 
                    (sel.holderRole || sel.creatorRole) === 'customer' ? 'outline' : 'secondary'
                  }
                  className={`text-xs ${(sel.holderRole || sel.creatorRole) === 'customer' ? 'border-green-500 text-green-600' : ''}`}
                >
                  {(sel.holderRole || sel.creatorRole) === 'admin' ? 'Admin' : 
                   (sel.holderRole || sel.creatorRole) === 'staff' ? 'Staff' : 
                   (sel.holderRole || sel.creatorRole) === 'customer' ? 'Customer' : 'User'}
                </Badge>
              )}
            </div>
            {(sel.holderEmail || sel.customerEmail) && (
              <div className="text-sm text-muted-foreground ml-6">
                📧 {sel.holderEmail || sel.customerEmail}
              </div>
            )}
            {(sel.holderPhone || sel.customerPhone) && (
              <div className="text-sm text-muted-foreground ml-6">
                📞 {sel.holderPhone || sel.customerPhone}
              </div>
            )}
          </div>
        )}

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
              {sel.studioName || (selection.studioType ? STUDIO_LABELS[selection.studioType as StudioType] : '-')}
            </p>
          </div>

          {/* Booking Date */}
          {sel.bookingDate && (
            <div>
              <p className="text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Date
              </p>
              <p className="font-medium">{sel.bookingDate}</p>
            </div>
          )}

          {/* Time Range */}
          {sel.startTime && sel.endTime && (
            <div>
              <p className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Time
              </p>
              <p className="font-medium">
                {formatTime12hr(sel.startTime)} - {formatTime12hr(sel.endTime)}
              </p>
            </div>
          )}

          {selection.serviceType && (
            <div>
              <p className="text-muted-foreground">Service</p>
              <p className="font-medium">
                {SERVICE_LABELS[selection.serviceType as ServiceType]}
              </p>
            </div>
          )}

          {selection.timeSlotType && (
            <div>
              <p className="text-muted-foreground">Time Slot</p>
              <p className="font-medium">
                {TIME_SLOT_LABELS[selection.timeSlotType as TimeSlotType]}
              </p>
            </div>
          )}

          <div>
            <p className="text-muted-foreground">Duration</p>
            <p className="font-medium">{getSessionDuration(selection)} hour(s)</p>
          </div>

          {/* Customer Name */}
          {sel.customerName && (
            <div>
              <p className="text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" /> Customer
              </p>
              <p className="font-medium">{sel.customerName}</p>
            </div>
          )}

          {/* People Count */}
          {sel.peopleCount && sel.peopleCount > 1 && (
            <div>
              <p className="text-muted-foreground">People</p>
              <p className="font-medium">{sel.peopleCount}</p>
            </div>
          )}

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

          {/* Estimated Total */}
          {sel.estimatedTotal && (
            <div>
              <p className="text-muted-foreground">Estimated Total</p>
              <p className="font-medium">${Number(sel.estimatedTotal).toFixed(2)}</p>
            </div>
          )}
        </div>

        {/* Details */}
        {sel.details && (
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground mb-1">Details</p>
            <p className="text-sm">{sel.details}</p>
          </div>
        )}

        {/* Notes (internal) */}
        {sel.notes && (
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground mb-1">Notes</p>
            <p className="text-sm italic text-muted-foreground">{sel.notes}</p>
          </div>
        )}

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
