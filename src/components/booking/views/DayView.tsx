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

const generateTimeSlots = (start: string, end: string, increment: number = 15) => {
  const slots: string[] = [];
  const [startH, startM = 0] = start.split(':').map(Number);
  const [endH, endM = 0] = end.split(':').map(Number);
  
  let currentMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  
  while (currentMinutes <= endMinutes) {
    const h = Math.floor(currentMinutes / 60);
    const m = currentMinutes % 60;
    slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    currentMinutes += increment;
  }
  return slots;
};

const formatTime = (time: string) => {
  const [hour, min] = time.split(':').map(Number);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${min.toString().padStart(2, '0')} ${ampm}`;
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

  const getBookingsForSlot = (studioId: string, slot: string) => {
    const [slotH, slotM] = slot.split(':').map(Number);
    const slotMinutes = slotH * 60 + slotM;
    return dayBookings.filter((b) => {
      if (b.studio_id !== studioId) return false;
      const [bStartH, bStartM = 0] = b.start_time.split(':').map(Number);
      const [bEndH, bEndM = 0] = b.end_time.split(':').map(Number);
      const startMinutes = bStartH * 60 + bStartM;
      const endMinutes = bEndH * 60 + bEndM;
      return slotMinutes >= startMinutes && slotMinutes < endMinutes;
    });
  };

  const isSlotStart = (booking: StudioBooking, slot: string) => {
    const [slotH, slotM] = slot.split(':').map(Number);
    const [bStartH, bStartM = 0] = booking.start_time.split(':').map(Number);
    return slotH === bStartH && slotM === bStartM;
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
          {timeSlots.map((time, idx) => {
            const isHourMark = time.endsWith(':00');
            return (
              <tr key={time} className={cn(
                "border-b border-muted-foreground/20",
                isHourMark && "border-t border-border"
              )}>
                <td className={cn(
                  "py-1 px-2 text-xs text-muted-foreground border-r font-mono",
                  isHourMark ? "font-medium" : "text-muted-foreground/60"
                )}>
                  {formatTime(time)}
                </td>
                {studios.map((studio) => {
                  const slotBookings = getBookingsForSlot(studio.id, time);
                  
                  return (
                    <td
                      key={studio.id}
                      className="py-0.5 px-1 border-r min-h-[28px] h-7 relative cursor-pointer hover:bg-muted/50"
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
