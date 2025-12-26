import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { StudioBooking } from '@/hooks/useStudioBookings';
import { CalendarSettings } from '@/hooks/useCalendarSettings';

interface TimeSlotGridProps {
  date: Date;
  settings: CalendarSettings;
  bookings: StudioBooking[];
  selectedStart: string | null;
  selectedEnd: string | null;
  onSlotClick: (time: string) => void;
  isBlocked?: boolean;
}

export function TimeSlotGrid({
  date,
  settings,
  bookings,
  selectedStart,
  selectedEnd,
  onSlotClick,
  isBlocked = false,
}: TimeSlotGridProps) {
  // Generate time slots based on settings
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    const [startHour, startMin] = settings.operating_start_time.split(':').map(Number);
    const [endHour, endMin] = settings.operating_end_time.split(':').map(Number);
    
    let currentMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    while (currentMinutes < endMinutes) {
      const hour = Math.floor(currentMinutes / 60);
      const min = currentMinutes % 60;
      slots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
      currentMinutes += settings.time_increment_minutes;
    }
    
    return slots;
  }, [settings]);

  // Check if a time slot is booked
  const isSlotBooked = (time: string) => {
    const [hour, min] = time.split(':').map(Number);
    const slotMinutes = hour * 60 + min;
    
    return bookings.some(booking => {
      const [startHour, startMin] = booking.start_time.split(':').map(Number);
      const [endHour, endMin] = booking.end_time.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      
      return slotMinutes >= startMinutes && slotMinutes < endMinutes;
    });
  };

  // Check if a time slot is in a buffer zone
  const isSlotBuffer = (time: string) => {
    if (settings.buffer_minutes === 0) return false;
    
    const [hour, min] = time.split(':').map(Number);
    const slotMinutes = hour * 60 + min;
    
    return bookings.some(booking => {
      const [endHour, endMin] = booking.end_time.split(':').map(Number);
      const endMinutes = endHour * 60 + endMin;
      
      return slotMinutes >= endMinutes && slotMinutes < endMinutes + settings.buffer_minutes;
    });
  };

  // Check if slot is in selected range
  const isSlotSelected = (time: string) => {
    if (!selectedStart) return false;
    
    const [hour, min] = time.split(':').map(Number);
    const slotMinutes = hour * 60 + min;
    
    const [startHour, startMin] = selectedStart.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    
    if (!selectedEnd) return slotMinutes === startMinutes;
    
    const [endHour, endMin] = selectedEnd.split(':').map(Number);
    const endMinutes = endHour * 60 + endMin;
    
    return slotMinutes >= startMinutes && slotMinutes < endMinutes;
  };

  // Check if slot is in the past
  const isPastSlot = (time: string) => {
    const today = new Date();
    const slotDate = new Date(date);
    
    if (slotDate.toDateString() !== today.toDateString()) {
      return slotDate < today;
    }
    
    const [hour, min] = time.split(':').map(Number);
    const now = today.getHours() * 60 + today.getMinutes();
    const slotMinutes = hour * 60 + min;
    
    return slotMinutes <= now;
  };

  const formatTime = (time: string) => {
    const [hour, min] = time.split(':').map(Number);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${min.toString().padStart(2, '0')} ${ampm}`;
  };

  if (isBlocked) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p>This date is blocked and unavailable for booking.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
      {timeSlots.map((time) => {
        const booked = isSlotBooked(time);
        const buffer = isSlotBuffer(time);
        const selected = isSlotSelected(time);
        const past = isPastSlot(time);
        const disabled = booked || buffer || past;

        return (
          <button
            key={time}
            onClick={() => !disabled && onSlotClick(time)}
            disabled={disabled}
            className={cn(
              'px-2 py-2 text-sm rounded-md border transition-colors',
              disabled && 'cursor-not-allowed opacity-50',
              booked && 'bg-destructive/20 border-destructive/30 text-destructive-foreground',
              buffer && 'bg-muted border-muted-foreground/20',
              past && !booked && 'bg-muted/50 border-muted',
              selected && 'bg-primary text-primary-foreground border-primary',
              !disabled && !selected && 'hover:bg-accent hover:border-accent-foreground/20'
            )}
          >
            {formatTime(time)}
          </button>
        );
      })}
    </div>
  );
}
