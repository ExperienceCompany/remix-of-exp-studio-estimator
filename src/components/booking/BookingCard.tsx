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
  if (status === 'cancelled') return 'bg-muted text-muted-foreground';
  switch (type) {
    case 'customer':
      return 'bg-primary/10 text-primary border-primary/20';
    case 'internal':
      return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'unavailable':
      return 'bg-destructive/10 text-destructive border-destructive/20';
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
        <Badge variant="outline" className="text-xs shrink-0">
          {booking.session_type === 'serviced' ? 'EXP' : 'DIY'}
        </Badge>
      </div>
      <div className="text-xs opacity-80 mt-1">
        {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
      </div>
      {studioName && (
        <div className="text-xs opacity-60 mt-0.5">{studioName}</div>
      )}
    </div>
  );
}
