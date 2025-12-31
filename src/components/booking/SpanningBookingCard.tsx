import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

interface SpanningBookingCardProps {
  booking: {
    id: string;
    booking_type: 'customer' | 'internal' | 'unavailable';
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    customer_name: string | null;
    session_type: string | null;
    title: string | null;
  };
  top: number;
  height: number;
  onClick?: () => void;
}

const getBookingTypeBorderColor = (type: string, status: string) => {
  if (status === 'cancelled') return 'border-l-muted-foreground';
  switch (type) {
    case 'customer':
      return 'border-l-foreground';
    case 'internal':
      return 'border-l-[#f2a643]';
    case 'unavailable':
      return 'border-l-destructive';
    default:
      return 'border-l-muted-foreground';
  }
};

const getDisplayText = (booking: SpanningBookingCardProps['booking']) => {
  return booking.title || booking.customer_name || booking.booking_type;
};

export function SpanningBookingCard({ 
  booking, 
  top, 
  height,
  onClick,
}: SpanningBookingCardProps) {
  const borderColor = getBookingTypeBorderColor(booking.booking_type, booking.status);
  const displayText = getDisplayText(booking);
  const isCancelled = booking.status === 'cancelled';
  const isShort = height < 40;

  return (
    <div
      className={cn(
        'absolute left-0 right-0 mx-0.5 bg-card border-l-4 rounded-r overflow-hidden cursor-pointer hover:bg-muted/50 transition-colors border border-border/30 shadow-sm z-10',
        borderColor
      )}
      style={{ top: `${top}px`, height: `${height}px` }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <div className={cn(
        'p-1.5 flex items-start justify-between h-full',
        isShort && 'items-center py-0.5'
      )}>
        <div className="flex flex-col min-w-0 flex-1">
          <span className={cn(
            'font-medium text-xs truncate',
            isCancelled && 'line-through text-muted-foreground'
          )}>
            {displayText}
          </span>
          {!isShort && (
            <span className={cn(
              'text-[10px] text-muted-foreground truncate',
              isCancelled && 'line-through'
            )}>
              {booking.session_type === 'serviced' ? 'EXP Session' : 'DIY Session'}
            </span>
          )}
        </div>
        <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
      </div>
    </div>
  );
}
