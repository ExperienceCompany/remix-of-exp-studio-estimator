import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { getBookingDisplayText } from '@/lib/bookingDisplayUtils';
import { BookingHoverContent } from './BookingHoverContent';
import { MoreVertical, Pencil, Copy, Trash2 } from 'lucide-react';
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
    repeat_series_id?: string | null;
  };
  studioName?: string;
  compact?: boolean;
  onClick?: (e?: React.MouseEvent) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, booking: StudioBooking) => void;
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

export function BookingCard({ 
  booking, 
  studioName, 
  compact = false, 
  onClick,
  draggable = false,
  onDragStart,
  isStaffOrAdmin = false,
  onDuplicate,
  onCancel,
}: BookingCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const dotColor = getBookingTypeDotColor(booking.booking_type, booking.status);
  const displayText = getBookingDisplayText(booking, isStaffOrAdmin);
  const isCancelled = booking.status === 'cancelled';
  const isRepeatBooking = !!(booking as StudioBooking).repeat_series_id;

  const handleDragStart = (e: React.DragEvent) => {
    if (onDragStart) {
      onDragStart(e, booking as StudioBooking);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(e);
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Menu content for staff/admin
  const menuContent = isStaffOrAdmin ? (
    <DropdownMenu onOpenChange={setIsMenuOpen}>
      <DropdownMenuTrigger asChild>
        <button 
          className="p-0.5 rounded hover:bg-muted/80 transition-colors shrink-0"
          onClick={handleMenuClick}
        >
          <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem onClick={() => onClick?.()}>
          <Pencil className="h-4 w-4 mr-2" />
          View/edit details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDuplicate?.(booking as StudioBooking)}>
          <Copy className="h-4 w-4 mr-2" />
          Duplicate
        </DropdownMenuItem>
        
        {!isCancelled && (
          <>
            <DropdownMenuSeparator />
            
            {isRepeatBooking ? (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-destructive focus:text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove...
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem 
                    onClick={() => onCancel?.(booking as StudioBooking, 'occurrence')}
                    className="text-destructive focus:text-destructive"
                  >
                    ...this occurrence
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onCancel?.(booking as StudioBooking, 'from_here')}
                    className="text-destructive focus:text-destructive"
                  >
                    ...this and following
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onCancel?.(booking as StudioBooking, 'series')}
                    className="text-destructive focus:text-destructive"
                  >
                    ...the full series
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ) : (
              <DropdownMenuItem 
                onClick={() => onCancel?.(booking as StudioBooking, 'occurrence')}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null;

  const compactCardContent = (
    <div
      className={cn(
        'text-xs px-1 py-0.5 rounded truncate cursor-pointer bg-card border border-border/50 hover:bg-muted/50 transition-colors flex items-center gap-1.5'
      )}
      onClick={handleCardClick}
      draggable={draggable}
      onDragStart={handleDragStart}
      title={`${displayText} - ${formatTime(booking.start_time)}`}
    >
      <span className={cn('w-2 h-2 rounded-full shrink-0', dotColor)} />
      <span className={cn('truncate flex-1', isCancelled && 'line-through text-muted-foreground')}>
        {formatTime(booking.start_time)} {displayText}
      </span>
      {menuContent}
    </div>
  );

  const fullCardContent = (
    <div
      className={cn(
        'p-2 rounded-md border border-border/50 bg-card cursor-pointer transition-all hover:bg-muted/50 hover:shadow-sm'
      )}
      onClick={handleCardClick}
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
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant="secondary" className="text-xs">
            {booking.session_type === 'serviced' ? 'EXP' : 'DIY'}
          </Badge>
          {menuContent}
        </div>
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

  const cardContent = compact ? compactCardContent : fullCardContent;

  // Wrap with hover card for staff/admin
  if (isStaffOrAdmin) {
    return (
      <HoverCard openDelay={300} open={isMenuOpen ? false : undefined}>
        <HoverCardTrigger asChild>
          {cardContent}
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
