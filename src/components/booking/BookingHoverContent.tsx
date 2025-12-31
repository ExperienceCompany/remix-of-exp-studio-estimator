import { Clock, MapPin, User, DollarSign, FileText, Users, ListChecks } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { StudioBooking } from '@/hooks/useStudioBookings';

interface BookingHoverContentProps {
  booking: StudioBooking;
  studioName?: string;
}

const formatTime = (time: string) => {
  const [hour, min] = time.split(':').map(Number);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${min.toString().padStart(2, '0')} ${ampm}`;
};

const getBookingTypeLabel = (type: string) => {
  switch (type) {
    case 'customer':
      return 'User booking';
    case 'internal':
      return 'Internal booking';
    case 'unavailable':
      return 'Unavailable';
    default:
      return type;
  }
};

export function BookingHoverContent({ booking, studioName }: BookingHoverContentProps) {
  const timeRange = `${formatTime(booking.start_time)}–${formatTime(booking.end_time)}`;
  
  return (
    <div className="space-y-3 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{getBookingTypeLabel(booking.booking_type)}</span>
        <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'} className="text-xs">
          {booking.status}
        </Badge>
      </div>

      {/* Details Grid */}
      <div className="space-y-2 text-sm">
        {/* Time */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4 shrink-0" />
          <span>{timeRange}</span>
        </div>

        {/* Studio */}
        {studioName && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            <span>{studioName}</span>
          </div>
        )}

        {/* Customer */}
        {booking.customer_name && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4 shrink-0" />
            <span>{booking.customer_name}</span>
          </div>
        )}

        {/* Session type */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <DollarSign className="h-4 w-4 shrink-0" />
          <span>{booking.session_type === 'serviced' ? 'EXP Session' : 'DIY Session'}</span>
        </div>

        {/* Title/Usage */}
        {booking.title && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileText className="h-4 w-4 shrink-0" />
            <span className="truncate">{booking.title}</span>
          </div>
        )}

        {/* Attendees */}
        {booking.people_count && booking.people_count > 0 && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4 shrink-0" />
            <span>{booking.people_count} attendee{booking.people_count !== 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Details/Notes */}
        {booking.details && (
          <div className="flex items-start gap-2 text-muted-foreground">
            <ListChecks className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="text-xs line-clamp-2">{booking.details}</span>
          </div>
        )}
      </div>
    </div>
  );
}
