import { useMemo } from 'react';
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { BookingCard } from '../BookingCard';
import type { StudioBooking } from '@/hooks/useStudioBookings';

interface GridViewProps {
  currentDate: Date;
  bookings: StudioBooking[];
  studios: { id: string; name: string; type: string }[];
  onDateClick?: (date: Date, studioId?: string) => void;
  onBookingClick?: (booking: StudioBooking) => void;
}

export function GridView({
  currentDate,
  bookings,
  studios,
  onDateClick,
  onBookingClick,
}: GridViewProps) {
  const weekStart = startOfWeek(currentDate);
  
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const getBookingsForDateAndStudio = (date: Date, studioId: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return bookings.filter(
      (b) => b.booking_date === dateStr && b.studio_id === studioId
    );
  };

  return (
    <div className="border rounded-lg overflow-x-auto">
      <table className="w-full min-w-[900px]">
        <thead>
          <tr className="bg-muted">
            <th className="w-32 py-3 px-2 text-left text-sm font-medium text-muted-foreground border-b border-r">
              Studio
            </th>
            {weekDays.map((day) => (
              <th
                key={day.toISOString()}
                className={cn(
                  'py-3 px-2 text-center text-sm font-medium border-b border-r',
                  isToday(day) && 'bg-primary/10'
                )}
              >
                <div>{format(day, 'EEE')}</div>
                <div
                  className={cn(
                    'text-lg',
                    isToday(day) && 'text-primary font-bold'
                  )}
                >
                  {format(day, 'd')}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {studios.map((studio, studioIdx) => (
            <tr key={studio.id} className={cn(studioIdx % 2 === 0 && 'bg-muted/20')}>
              <td className="py-2 px-2 text-sm font-medium border-r">
                {studio.name}
              </td>
              {weekDays.map((day) => {
                const cellBookings = getBookingsForDateAndStudio(day, studio.id);
                
                return (
                  <td
                    key={day.toISOString()}
                    className={cn(
                      'py-1 px-1 border-r min-h-[80px] align-top cursor-pointer hover:bg-muted/50',
                      isToday(day) && 'bg-primary/5'
                    )}
                    onClick={() => onDateClick?.(day, studio.id)}
                  >
                    <div className="space-y-0.5 max-h-[100px] overflow-y-auto">
                      {cellBookings.slice(0, 2).map((booking) => (
                        <BookingCard
                          key={booking.id}
                          booking={booking}
                          compact
                          onClick={() => {
                            onBookingClick?.(booking);
                          }}
                        />
                      ))}
                      {cellBookings.length > 2 && (
                        <div className="text-xs text-muted-foreground px-1">
                          +{cellBookings.length - 2} more
                        </div>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
