import { useMemo } from 'react';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { getBookingDisplayText } from '@/lib/bookingDisplayUtils';
import { BookingHoverContent } from '../BookingHoverContent';
import { BookingContextMenu } from '../BookingContextMenu';
import type { StudioBooking } from '@/hooks/useStudioBookings';

interface ListViewProps {
  currentDate: Date;
  bookings: StudioBooking[];
  studios: { id: string; name: string }[];
  onBookingClick?: (booking: StudioBooking) => void;
  startDate: Date;
  endDate: Date;
  onDateRangeChange: (start: Date, end: Date) => void;
  onDuplicateBooking?: (booking: StudioBooking) => void;
  onCancelBooking?: (booking: StudioBooking, scope: 'occurrence' | 'from_here' | 'series') => void;
}

const formatTime = (time: string) => {
  const [hour, min] = time.split(':').map(Number);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${min.toString().padStart(2, '0')} ${ampm}`;
};

const getBookingTypeColor = (type: string, status: string) => {
  if (status === 'cancelled') return 'bg-muted';
  switch (type) {
    case 'customer':
      return 'bg-primary/10 border-primary/20';
    case 'internal':
      return 'bg-blue-500/10 border-blue-500/20';
    case 'unavailable':
      return 'bg-destructive/10 border-destructive/20';
    default:
      return 'bg-muted';
  }
};

export function ListView({
  currentDate,
  bookings,
  studios,
  onBookingClick,
  startDate,
  endDate,
  onDateRangeChange,
  onDuplicateBooking,
  onCancelBooking,
}: ListViewProps) {
  const { isStaff } = useAuth();

  const getStudioName = (studioId: string) => {
    return studios.find((s) => s.id === studioId)?.name || 'Unknown';
  };

  const groupedBookings = useMemo(() => {
    const filtered = bookings.filter((b) => {
      const bookingDate = parseISO(b.booking_date);
      return bookingDate >= startDate && bookingDate <= endDate;
    });

    const grouped: Record<string, StudioBooking[]> = {};
    
    filtered.forEach((booking) => {
      if (!grouped[booking.booking_date]) {
        grouped[booking.booking_date] = [];
      }
      grouped[booking.booking_date].push(booking);
    });

    // Sort each day's bookings by start time
    Object.keys(grouped).forEach((date) => {
      grouped[date].sort((a, b) => a.start_time.localeCompare(b.start_time));
    });

    return grouped;
  }, [bookings, startDate, endDate]);

  const sortedDates = Object.keys(groupedBookings).sort();

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEEE, MMMM d');
  };

  return (
    <div className="space-y-4">
      {/* Date Range Pickers */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/30 rounded-lg border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">From:</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[200px] justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(date) => date && onDateRangeChange(date, endDate)}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">To:</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[200px] justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={(date) => date && onDateRangeChange(startDate, date)}
                disabled={(date) => date < startDate}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <Badge variant="secondary" className="ml-auto">
          {sortedDates.reduce((acc, date) => acc + groupedBookings[date].length, 0)} bookings
        </Badge>
      </div>

      {/* Bookings List */}
      {sortedDates.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          No bookings in the selected date range
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((dateStr) => (
            <div key={dateStr}>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-semibold">{getDateLabel(dateStr)}</h3>
                <span className="text-sm text-muted-foreground">
                  {format(parseISO(dateStr), 'MMM d, yyyy')}
                </span>
                <Badge variant="secondary" className="ml-auto">
                  {groupedBookings[dateStr].length} booking{groupedBookings[dateStr].length !== 1 ? 's' : ''}
                </Badge>
              </div>
              <div className="space-y-2">
                {groupedBookings[dateStr].map((booking, idx) => {
                  const displayText = getBookingDisplayText(booking, isStaff);
                  const bookingItem = (
                    <div
                      className={cn(
                        'flex items-center gap-4 p-3 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity',
                        getBookingTypeColor(booking.booking_type, booking.status),
                        idx !== groupedBookings[dateStr].length - 1 && 'border-b border-muted-foreground/20'
                      )}
                    >
                      <div className="w-24 font-mono text-sm">
                        {formatTime(booking.start_time)}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">
                          {displayText}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {getStudioName(booking.studio_id)}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                      </div>
                      <Badge variant="outline">
                        {booking.session_type === 'serviced' ? 'EXP' : 'DIY'}
                      </Badge>
                      <Badge
                        variant={booking.status === 'confirmed' ? 'default' : 'secondary'}
                      >
                        {booking.status}
                      </Badge>
                    </div>
                  );

                  if (isStaff) {
                    return (
                      <HoverCard key={booking.id} openDelay={300}>
                        <HoverCardTrigger asChild>
                          <BookingContextMenu
                            booking={booking}
                            onViewEdit={() => onBookingClick?.(booking)}
                            onDuplicate={() => onDuplicateBooking?.(booking)}
                            onCancel={(scope) => onCancelBooking?.(booking, scope)}
                          >
                            {bookingItem}
                          </BookingContextMenu>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-72" side="right" align="start">
                          <BookingHoverContent booking={booking} studioName={getStudioName(booking.studio_id)} />
                        </HoverCardContent>
                      </HoverCard>
                    );
                  }

                  return <div key={booking.id} onClick={() => onBookingClick?.(booking)}>{bookingItem}</div>;
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
