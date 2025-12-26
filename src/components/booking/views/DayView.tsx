import { useState, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { BookingCard } from '../BookingCard';
import { Button } from '@/components/ui/button';
import type { StudioBooking } from '@/hooks/useStudioBookings';

interface DayViewProps {
  currentDate: Date;
  bookings: StudioBooking[];
  studios: { id: string; name: string; type: string }[];
  operatingStart?: string;
  operatingEnd?: string;
  onSlotClick?: (studioId: string, time: string) => void;
  onBookingClick?: (booking: StudioBooking) => void;
  onBookingCreate?: (studioId: string, startTime: string, endTime: string) => void;
}

interface PendingBooking {
  studioId: string;
  startSlot: string;
  endSlot: string;
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

const timeToMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

export function DayView({
  currentDate,
  bookings,
  studios,
  operatingStart = '10:00',
  operatingEnd = '22:00',
  onSlotClick,
  onBookingClick,
  onBookingCreate,
}: DayViewProps) {
  const [pendingBooking, setPendingBooking] = useState<PendingBooking | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const timeSlots = useMemo(
    () => generateTimeSlots(operatingStart, operatingEnd),
    [operatingStart, operatingEnd]
  );

  const dateStr = format(currentDate, 'yyyy-MM-dd');
  const dayBookings = bookings.filter((b) => b.booking_date === dateStr);

  const getBookingsForSlot = (studioId: string, slot: string) => {
    const slotMinutes = timeToMinutes(slot);
    return dayBookings.filter((b) => {
      if (b.studio_id !== studioId) return false;
      const startMinutes = timeToMinutes(b.start_time);
      const endMinutes = timeToMinutes(b.end_time);
      return slotMinutes >= startMinutes && slotMinutes < endMinutes;
    });
  };

  const isSlotStart = (booking: StudioBooking, slot: string) => {
    const [slotH, slotM] = slot.split(':').map(Number);
    const [bStartH, bStartM = 0] = booking.start_time.split(':').map(Number);
    return slotH === bStartH && slotM === bStartM;
  };

  const isSlotBooked = useCallback((studioId: string, slot: string) => {
    return getBookingsForSlot(studioId, slot).length > 0;
  }, [dayBookings]);

  const isSlotInPendingRange = useCallback((studioId: string, slot: string) => {
    if (!pendingBooking || pendingBooking.studioId !== studioId) return false;
    const slotMins = timeToMinutes(slot);
    const startMins = timeToMinutes(pendingBooking.startSlot);
    const endMins = timeToMinutes(pendingBooking.endSlot);
    const minSlot = Math.min(startMins, endMins);
    const maxSlot = Math.max(startMins, endMins);
    return slotMins >= minSlot && slotMins <= maxSlot;
  }, [pendingBooking]);

  const isPendingStartSlot = useCallback((studioId: string, slot: string) => {
    if (!pendingBooking || pendingBooking.studioId !== studioId) return false;
    const startMins = timeToMinutes(pendingBooking.startSlot);
    const endMins = timeToMinutes(pendingBooking.endSlot);
    const minSlot = Math.min(startMins, endMins);
    return timeToMinutes(slot) === minSlot;
  }, [pendingBooking]);

  const handleSlotMouseDown = (studioId: string, slot: string) => {
    if (isSlotBooked(studioId, slot)) return;
    
    setPendingBooking({
      studioId,
      startSlot: slot,
      endSlot: slot,
    });
    setIsDragging(true);
  };

  const handleSlotMouseEnter = (studioId: string, slot: string) => {
    if (!isDragging || !pendingBooking) return;
    if (pendingBooking.studioId !== studioId) return;
    if (isSlotBooked(studioId, slot)) return;
    
    setPendingBooking(prev => prev ? { ...prev, endSlot: slot } : null);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleConfirmBooking = () => {
    if (!pendingBooking) return;
    
    const startMins = timeToMinutes(pendingBooking.startSlot);
    const endMins = timeToMinutes(pendingBooking.endSlot);
    const minMins = Math.min(startMins, endMins);
    const maxMins = Math.max(startMins, endMins) + 15; // Add 15 min to end slot to get actual end time
    
    const startH = Math.floor(minMins / 60);
    const startM = minMins % 60;
    const endH = Math.floor(maxMins / 60);
    const endM = maxMins % 60;
    
    const startTime = `${startH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}`;
    const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
    
    onBookingCreate?.(pendingBooking.studioId, startTime, endTime);
    setPendingBooking(null);
  };

  const handleCancelPending = () => {
    setPendingBooking(null);
    setIsDragging(false);
  };

  // Get display info for pending booking
  const pendingBookingDisplay = useMemo(() => {
    if (!pendingBooking) return null;
    
    const startMins = timeToMinutes(pendingBooking.startSlot);
    const endMins = timeToMinutes(pendingBooking.endSlot);
    const minMins = Math.min(startMins, endMins);
    const maxMins = Math.max(startMins, endMins) + 15;
    
    const startH = Math.floor(minMins / 60);
    const startM = minMins % 60;
    const endH = Math.floor(maxMins / 60);
    const endM = maxMins % 60;
    
    const startTime = `${startH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}`;
    const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
    const durationMins = maxMins - minMins;
    const durationHrs = Math.floor(durationMins / 60);
    const durationRemMins = durationMins % 60;
    
    const durationStr = durationHrs > 0 
      ? `${durationHrs}h${durationRemMins > 0 ? ` ${durationRemMins}m` : ''}`
      : `${durationRemMins}m`;
    
    const studio = studios.find(s => s.id === pendingBooking.studioId);
    
    return {
      startTime,
      endTime,
      duration: durationStr,
      studioName: studio?.name || 'Studio',
    };
  }, [pendingBooking, studios]);

  return (
    <div 
      className="border rounded-lg overflow-x-auto select-none"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
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
          {timeSlots.map((time) => {
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
                  const isBooked = slotBookings.length > 0;
                  const isInPending = isSlotInPendingRange(studio.id, time);
                  const isStartOfPending = isPendingStartSlot(studio.id, time);
                  
                  return (
                    <td
                      key={studio.id}
                      className={cn(
                        "py-0.5 px-1 border-r min-h-[28px] h-7 relative",
                        !isBooked && "cursor-pointer hover:bg-muted/50",
                        isBooked && "bg-muted/30",
                        isInPending && "bg-primary/20"
                      )}
                      onMouseDown={() => handleSlotMouseDown(studio.id, time)}
                      onMouseEnter={() => handleSlotMouseEnter(studio.id, time)}
                    >
                      {/* Existing bookings */}
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
                      
                      {/* Pending booking indicator */}
                      {isInPending && !isBooked && (
                        <div className={cn(
                          "absolute inset-0 border-2 border-primary border-dashed",
                          isStartOfPending && "rounded-t",
                          pendingBooking && time === pendingBooking.endSlot && "rounded-b"
                        )}>
                          {isStartOfPending && !isDragging && (
                            <div className="absolute inset-x-0 top-0 bg-primary/90 text-primary-foreground text-xs p-1 text-center rounded-t">
                              New booking
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {/* Floating confirm bar */}
      {pendingBooking && !isDragging && pendingBookingDisplay && (
        <div className="sticky bottom-0 left-0 right-0 bg-card border-t p-3 flex items-center justify-between gap-4 shadow-lg">
          <div className="text-sm">
            <span className="font-medium">{pendingBookingDisplay.studioName}</span>
            <span className="text-muted-foreground mx-2">•</span>
            <span>
              {formatTime(pendingBookingDisplay.startTime)} – {formatTime(pendingBookingDisplay.endTime)}
            </span>
            <span className="text-muted-foreground mx-2">•</span>
            <span className="text-muted-foreground">{pendingBookingDisplay.duration}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCancelPending}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleConfirmBooking}>
              Continue to Book
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
