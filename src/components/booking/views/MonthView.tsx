import { useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { BookingCard } from '../BookingCard';
import type { StudioBooking } from '@/hooks/useStudioBookings';

interface MonthViewProps {
  currentDate: Date;
  bookings: StudioBooking[];
  studios: { id: string; name: string }[];
  onDateClick?: (date: Date) => void;
  onSlotClick?: (date: Date) => void;
  onBookingClick?: (booking: StudioBooking) => void;
}

export function MonthView({
  currentDate,
  bookings,
  studios,
  onDateClick,
  onSlotClick,
  onBookingClick,
}: MonthViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = useMemo(
    () => eachDayOfInterval({ start: calendarStart, end: calendarEnd }),
    [calendarStart, calendarEnd]
  );

  const getBookingsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return bookings.filter((b) => b.booking_date === dateStr);
  };

  const getStudioName = (studioId: string) => {
    return studios.find((s) => s.id === studioId)?.name || 'Unknown';
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-7 bg-muted">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div
            key={day}
            className="py-2 text-center text-sm font-medium text-muted-foreground border-b"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const dayBookings = getBookingsForDate(day);
          const isCurrentMonth = isSameMonth(day, currentDate);

          return (
            <div
              key={idx}
              className={cn(
                'min-h-[120px] border-b border-r p-1 cursor-pointer hover:bg-muted/50 transition-colors',
                !isCurrentMonth && 'bg-muted/30',
                idx % 7 === 0 && 'border-l'
              )}
              onClick={() => onSlotClick?.(day)}
            >
              <div
                className={cn(
                  'text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full',
                  isToday(day) && 'bg-primary text-primary-foreground',
                  !isCurrentMonth && 'text-muted-foreground'
                )}
              >
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5 max-h-[80px] overflow-y-auto">
                {dayBookings.slice(0, 3).map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    studioName={getStudioName(booking.studio_id)}
                    compact
                    onClick={() => {
                      onBookingClick?.(booking);
                    }}
                  />
                ))}
                {dayBookings.length > 3 && (
                  <div className="text-xs text-muted-foreground px-1">
                    +{dayBookings.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
