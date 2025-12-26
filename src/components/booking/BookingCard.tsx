import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface BookingCardProps {
  booking: {
    id: string;
    studio_id: string;
    booking_date: string;
    start_time: string;
    end_time: string;
    booking_type: 'customer' | 'internal' | 'unavailable';
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    customer_name: string | null;
    session_type: string | null;
  };
  studioName?: string;
  compact?: boolean;
  onClick?: () => void;
}

const formatTime = (time: string) => {
  const [hour, min] = time.split(':').map(Number);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${min.toString().padStart(2, '0')} ${ampm}`;
};

const getBookingTypeColor = (type: string, status: string) => {
  if (status === 'cancelled') return 'bg-muted text-muted-foreground line-through';
  switch (type) {
    case 'customer':
      return 'bg-primary text-primary-foreground border-primary shadow-sm';
    case 'internal':
      return 'bg-accent text-accent-foreground border-accent shadow-sm';
    case 'unavailable':
      return 'bg-destructive text-destructive-foreground border-destructive shadow-sm';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export function BookingCard({ booking, studioName, compact = false, onClick }: BookingCardProps & { onClick?: (e?: React.MouseEvent) => void }) {
  const colorClass = getBookingTypeColor(booking.booking_type, booking.status);

  if (compact) {
    return (
      <div
        className={cn(
          'text-xs px-1 py-0.5 rounded truncate cursor-pointer border',
          colorClass
        )}
        onClick={onClick}
        title={`${booking.customer_name || booking.booking_type} - ${formatTime(booking.start_time)}`}
      >
        {formatTime(booking.start_time)} {booking.customer_name || booking.booking_type}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'p-2 rounded-md border cursor-pointer hover:opacity-80 transition-opacity',
        colorClass
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-sm truncate">
          {booking.customer_name || booking.booking_type}
        </span>
        <Badge variant="secondary" className="text-xs shrink-0">
          {booking.session_type === 'serviced' ? 'EXP' : 'DIY'}
        </Badge>
      </div>
      <div className="text-xs mt-1 opacity-90">
        {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
      </div>
      {studioName && (
        <div className="text-xs mt-0.5 opacity-80">{studioName}</div>
      )}
    </div>
  );
}
