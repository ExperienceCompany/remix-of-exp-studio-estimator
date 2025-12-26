import { useMemo } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { BookingCard } from '../BookingCard';
import type { StudioBooking } from '@/hooks/useStudioBookings';

interface DayViewProps {
  currentDate: Date;
  bookings: StudioBooking[];
  studios: { id: string; name: string; type: string }[];
  operatingStart?: string;
  operatingEnd?: string;
  onSlotClick?: (studioId: string, time: string) => void;
  onBookingClick?: (booking: StudioBooking) => void;
}

const generateTimeSlots = (start: string, end: string) => {
  const slots: string[] = [];
  const [startH] = start.split(':').map(Number);
  const [endH] = end.split(':').map(Number);
  
  for (let h = startH; h <= endH; h++) {
    slots.push(`${h.toString().padStart(2, '0')}:00`);
  }
  return slots;
};

const formatTime = (time: string) => {
  const [hour] = time.split(':').map(Number);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour} ${ampm}`;
};

export function DayView({
  currentDate,
  bookings,
  studios,
  operatingStart = '10:00',
  operatingEnd = '22:00',
  onSlotClick,
  onBookingClick,
}: DayViewProps) {
  const timeSlots = useMemo(
    () => generateTimeSlots(operatingStart, operatingEnd),
    [operatingStart, operatingEnd]
  );

  const dateStr = format(currentDate, 'yyyy-MM-dd');
  const dayBookings = bookings.filter((b) => b.booking_date === dateStr);

  const getBookingsForStudioAndHour = (studioId: string, hour: string) => {
    const hourNum = parseInt(hour.split(':')[0], 10);
    return dayBookings.filter((b) => {
      if (b.studio_id !== studioId) return false;
      const [bStartH] = b.start_time.split(':').map(Number);
      const [bEndH] = b.end_time.split(':').map(Number);
      return hourNum >= bStartH && hourNum < bEndH;
    });
  };

  const isSlotStart = (booking: StudioBooking, hour: string) => {
    const hourNum = parseInt(hour.split(':')[0], 10);
    const [bStartH] = booking.start_time.split(':').map(Number);
    return hourNum === bStartH;
  };

  return (
    <div className="border rounded-lg overflow-x-auto">
      <table className="w-full min-w-[800px]">
        <thead>
          <tr className="bg-muted">
            <th className="w-20 py-3 px-2 text-left text-sm font-medium text-muted-foreground border-b border-r">
              Time
            </th>
            {studios.map((studio) => (
              <th
                key={studio.id}
                className="py-3 px-2 text-left text-sm font-medium border-b border-r"
              >
                {studio.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timeSlots.map((time, idx) => (
            <tr key={time} className={cn(idx % 2 === 0 && 'bg-muted/20')}>
              <td className="py-2 px-2 text-sm text-muted-foreground border-r font-mono">
                {formatTime(time)}
              </td>
              {studios.map((studio) => {
                const slotBookings = getBookingsForStudioAndHour(studio.id, time);
                
                return (
                  <td
                    key={studio.id}
                    className="py-1 px-1 border-r min-h-[48px] relative cursor-pointer hover:bg-muted/50"
                    onClick={() => slotBookings.length === 0 && onSlotClick?.(studio.id, time)}
                  >
                    {slotBookings.map((booking) =>
                      isSlotStart(booking, time) ? (
                        <BookingCard
                          key={booking.id}
                          booking={booking}
                          compact
                          onClick={() => onBookingClick?.(booking)}
                        />
                      ) : null
                    )}
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
