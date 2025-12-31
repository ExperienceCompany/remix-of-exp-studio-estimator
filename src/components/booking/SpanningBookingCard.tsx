import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { getBookingDisplayText } from '@/lib/bookingDisplayUtils';
import { BookingHoverContent } from './BookingHoverContent';
import { BookingContextMenu } from './BookingContextMenu';
import type { StudioBooking } from '@/hooks/useStudioBookings';

interface SpanningBookingCardProps {
  booking: {
    id: string;
    booking_type: 'customer' | 'internal' | 'unavailable';
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    customer_name: string | null;
    session_type: string | null;
    title: string | null;
    start_time: string;
    end_time: string;
  };
  top: number;
  height: number;
  onClick?: () => void;
  studioName?: string;
  isStaffOrAdmin?: boolean;
  onDuplicate?: (booking: StudioBooking) => void;
  onCancel?: (booking: StudioBooking, scope: 'occurrence' | 'from_here' | 'series') => void;
}

const formatTime = (time: string) => {
  const [hour, min] = time.split(':').map(Number);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${min.toString().padStart(2, '0')} ${ampm}`;
};

const calculateDuration = (startTime: string, endTime: string): string => {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
  const hours = totalMinutes / 60;
  if (hours === 1) return '1 hr';
  if (hours % 1 === 0) return `${hours} hrs`;
  return `${hours.toFixed(1)} hrs`;
};

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

export function SpanningBookingCard({ 
  booking, 
  top, 
  height,
  onClick,
  studioName,
  isStaffOrAdmin = false,
  onDuplicate,
  onCancel,
}: SpanningBookingCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const borderColor = getBookingTypeBorderColor(booking.booking_type, booking.status);
  const displayText = getBookingDisplayText(booking, isStaffOrAdmin);
  const isCancelled = booking.status === 'cancelled';
  const isShort = height < 40;
  const timeDisplay = `${formatTime(booking.start_time)} - ${formatTime(booking.end_time)} (${calculateDuration(booking.start_time, booking.end_time)})`;

  const cardContent = (
    <div
      className={cn(
        'absolute left-0 right-0 mx-0.5 bg-card border-l-4 rounded-r overflow-hidden cursor-pointer hover:bg-muted/50 transition-colors border border-border/30 shadow-sm z-10',
        borderColor
      )}
      style={{ top: `${top}px`, height: `${height}px` }}
      onClick={(e) => {
        e.stopPropagation();
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
            <>
              <span className={cn(
                'text-[10px] text-muted-foreground truncate',
                isCancelled && 'line-through'
              )}>
                {booking.session_type === 'serviced' ? 'EXP Session' : 'DIY Session'}
              </span>
              <span className={cn(
                'text-[10px] text-muted-foreground truncate',
                isCancelled && 'line-through'
              )}>
                {timeDisplay}
              </span>
            </>
          )}
        </div>
        <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
      </div>
    </div>
  );

  // Wrap with context menu and hover card for staff/admin
  if (isStaffOrAdmin) {
    return (
      <HoverCard openDelay={300} open={isMenuOpen ? false : undefined}>
        <HoverCardTrigger>
          <BookingContextMenu
            booking={booking as StudioBooking}
            onViewEdit={() => onClick?.()}
            onDuplicate={() => onDuplicate?.(booking as StudioBooking)}
            onCancel={(scope) => onCancel?.(booking as StudioBooking, scope)}
            onOpenChange={setIsMenuOpen}
          >
            {cardContent}
          </BookingContextMenu>
        </HoverCardTrigger>
        <HoverCardContent 
          className="w-72" 
          side="right" 
          align="start"
          sideOffset={8}
          avoidCollisions={true}
          collisionPadding={16}
        >
          <BookingHoverContent booking={booking as StudioBooking} studioName={studioName} />
        </HoverCardContent>
      </HoverCard>
    );
  }

  return cardContent;
}
