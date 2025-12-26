import { useMemo, useState } from 'react';
import { format, parseISO, isToday, isTomorrow, startOfDay, addDays } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { StudioBooking } from '@/hooks/useStudioBookings';

interface ListViewProps {
  currentDate: Date;
  bookings: StudioBooking[];
  studios: { id: string; name: string }[];
  onBookingClick?: (booking: StudioBooking) => void;
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
}: ListViewProps) {
  const [startDate, setStartDate] = useState<Date>(startOfDay(currentDate));
  const [endDate, setEndDate] = useState<Date>(addDays(startOfDay(currentDate), 14));

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
                  "w-[180px] justify-start text-left font-normal",
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
                onSelect={(date) => date && setStartDate(date)}
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
                  "w-[180px] justify-start text-left font-normal",
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
                onSelect={(date) => date && setEndDate(date)}
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
                {groupedBookings[dateStr].map((booking) => (
                  <div
                    key={booking.id}
                    className={cn(
                      'flex items-center gap-4 p-3 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity',
                      getBookingTypeColor(booking.booking_type, booking.status)
                    )}
                    onClick={() => onBookingClick?.(booking)}
                  >
                    <div className="w-24 font-mono text-sm">
                      {formatTime(booking.start_time)}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">
                        {booking.customer_name || booking.booking_type}
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
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
