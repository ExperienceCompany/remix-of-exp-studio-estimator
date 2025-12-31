import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { StudioBooking } from '@/hooks/useStudioBookings';

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
    title: string | null;
  };
  studioName?: string;
  compact?: boolean;
  onClick?: (e?: React.MouseEvent) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, booking: StudioBooking) => void;
}

const formatTime = (time: string) => {
  const [hour, min] = time.split(':').map(Number);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${min.toString().padStart(2, '0')} ${ampm}`;
};

const getBookingTypeDotColor = (type: string, status: string) => {
  if (status === 'cancelled') return 'bg-muted-foreground';
  switch (type) {
    case 'customer':
      return 'bg-foreground';
    case 'internal':
      return 'bg-[#f2a643]';
    case 'unavailable':
      return 'bg-destructive';
    default:
      return 'bg-muted-foreground';
  }
};

const getDisplayText = (booking: BookingCardProps['booking']) => {
  return booking.title || booking.customer_name || booking.booking_type;
};

export function BookingCard({ 
  booking, 
  studioName, 
  compact = false, 
  onClick,
  draggable = false,
  onDragStart,
}: BookingCardProps) {
  const dotColor = getBookingTypeDotColor(booking.booking_type, booking.status);
  const displayText = getDisplayText(booking);
  const isCancelled = booking.status === 'cancelled';

  const handleDragStart = (e: React.DragEvent) => {
    if (onDragStart) {
      onDragStart(e, booking as StudioBooking);
    }
  };

  if (compact) {
    return (
      <div
        className={cn(
          'text-xs px-1 py-0.5 rounded truncate cursor-pointer bg-card border border-border/50 hover:bg-muted/50 transition-colors flex items-center gap-1.5'
        )}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(e);
        }}
        draggable={draggable}
        onDragStart={handleDragStart}
        title={`${displayText} - ${formatTime(booking.start_time)}`}
      >
        <span className={cn('w-2 h-2 rounded-full shrink-0', dotColor)} />
        <span className={cn('truncate', isCancelled && 'line-through text-muted-foreground')}>
          {formatTime(booking.start_time)} {displayText}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'p-2 rounded-md border border-border/50 bg-card cursor-pointer transition-all hover:bg-muted/50 hover:shadow-sm'
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      draggable={draggable}
      onDragStart={handleDragStart}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', dotColor)} />
          <span className={cn('font-medium text-sm truncate', isCancelled && 'line-through text-muted-foreground')}>
            {displayText}
          </span>
        </div>
        <Badge variant="secondary" className="text-xs shrink-0">
          {booking.session_type === 'serviced' ? 'EXP' : 'DIY'}
        </Badge>
      </div>
      <div className={cn('text-xs mt-1 text-muted-foreground pl-4.5', isCancelled && 'line-through')}>
        {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
      </div>
      {studioName && (
        <div className={cn('text-xs mt-0.5 text-muted-foreground pl-4.5', isCancelled && 'line-through')}>
          {studioName}
        </div>
      )}
    </div>
  );
}
