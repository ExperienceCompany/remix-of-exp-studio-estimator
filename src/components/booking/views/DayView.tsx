import { useState, useMemo, useCallback } from 'react';
import { format, getDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { BookingCard } from '../BookingCard';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, DollarSign, Plus, ChevronUp, ChevronDown, X } from 'lucide-react';
import type { StudioBooking } from '@/hooks/useStudioBookings';

interface DiyRate {
  studio_id: string;
  time_slot_id: string;
  first_hour_rate: number;
  after_first_hour_rate: number | null;
  time_slots?: { type: string } | null;
}

interface DayViewProps {
  currentDate: Date;
  bookings: StudioBooking[];
  studios: { id: string; name: string; type: string }[];
  operatingStart?: string;
  operatingEnd?: string;
  bufferMinutes?: number;
  diyRates?: DiyRate[];
  onSlotClick?: (studioId: string, time: string) => void;
  onBookingClick?: (booking: StudioBooking) => void;
  onBookingCreate?: (studioIds: string[], startTime: string, endTime: string, estimatedCost: number) => void;
}

interface PendingBooking {
  studioIds: string[];
  startSlot: string;
  endSlot: string;
}

const FULL_STUDIO_BUYOUT_TYPE = 'full_studio_buyout';

const generateTimeSlots = (start: string, end: string, increment: number = 15) => {
  const slots: string[] = [];
  const [startH, startM = 0] = start.split(':').map(Number);
  const [endH, endM = 0] = end.split(':').map(Number);
  
  let currentMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  
  while (currentMinutes < endMinutes) {
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

const minutesToTime = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

// Get time slot type based on day of week and hour
const getTimeSlotType = (dayOfWeek: number, hour: number): string => {
  const isEvening = hour >= 16; // 4pm onwards
  
  if (dayOfWeek >= 1 && dayOfWeek <= 3) {
    // Mon-Wed
    return isEvening ? 'mon_wed_eve' : 'mon_wed_day';
  } else if (dayOfWeek >= 4 && dayOfWeek <= 5) {
    // Thu-Fri
    return isEvening ? 'thu_fri_eve' : 'thu_fri_day';
  } else {
    // Sat-Sun (0 = Sunday, 6 = Saturday)
    return isEvening ? 'sat_sun_eve' : 'sat_sun_day';
  }
};

export function DayView({
  currentDate,
  bookings,
  studios,
  operatingStart = '10:00',
  operatingEnd = '22:00',
  bufferMinutes = 15,
  diyRates = [],
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
  const dayOfWeek = getDay(currentDate);
  const dayBookings = bookings.filter((b) => b.booking_date === dateStr);

  // Find full studio buyout bookings - these block ALL other studios
  const buyoutBookings = useMemo(() => {
    const buyoutStudio = studios.find(s => s.type === FULL_STUDIO_BUYOUT_TYPE);
    if (!buyoutStudio) return [];
    return dayBookings.filter(b => b.studio_id === buyoutStudio.id);
  }, [dayBookings, studios]);

  const getBookingsForSlot = useCallback((studioId: string, slot: string) => {
    const slotMinutes = timeToMinutes(slot);
    return dayBookings.filter((b) => {
      if (b.studio_id !== studioId) return false;
      const startMinutes = timeToMinutes(b.start_time);
      const endMinutes = timeToMinutes(b.end_time);
      return slotMinutes >= startMinutes && slotMinutes < endMinutes;
    });
  }, [dayBookings]);

  const isSlotStart = (booking: StudioBooking, slot: string) => {
    const slotMins = timeToMinutes(slot);
    const bookingStartMins = timeToMinutes(booking.start_time);
    return slotMins === bookingStartMins;
  };

  // Check if slot is within buffer zone after any booking
  const isSlotInBuffer = useCallback((studioId: string, slot: string) => {
    const slotMins = timeToMinutes(slot);
    return dayBookings.some((b) => {
      if (b.studio_id !== studioId) return false;
      const endMins = timeToMinutes(b.end_time);
      return slotMins >= endMins && slotMins < endMins + bufferMinutes;
    });
  }, [dayBookings, bufferMinutes]);

  // Check if slot is blocked by a full studio buyout
  const isSlotBlockedByBuyout = useCallback((studioId: string, slot: string) => {
    const studio = studios.find(s => s.id === studioId);
    if (studio?.type === FULL_STUDIO_BUYOUT_TYPE) return false; // The buyout studio itself is not blocked
    
    const slotMins = timeToMinutes(slot);
    return buyoutBookings.some((b) => {
      const startMins = timeToMinutes(b.start_time);
      const endMins = timeToMinutes(b.end_time);
      return slotMins >= startMins && slotMins < endMins;
    });
  }, [buyoutBookings, studios]);

  const isSlotBooked = useCallback((studioId: string, slot: string) => {
    return getBookingsForSlot(studioId, slot).length > 0;
  }, [getBookingsForSlot]);

  const isSlotUnavailable = useCallback((studioId: string, slot: string) => {
    return isSlotBooked(studioId, slot) || isSlotInBuffer(studioId, slot) || isSlotBlockedByBuyout(studioId, slot);
  }, [isSlotBooked, isSlotInBuffer, isSlotBlockedByBuyout]);

  // Get current pending time range
  const pendingRange = useMemo(() => {
    if (!pendingBooking) return null;
    const startMins = timeToMinutes(pendingBooking.startSlot);
    const endMins = timeToMinutes(pendingBooking.endSlot);
    return {
      minSlot: Math.min(startMins, endMins),
      maxSlot: Math.max(startMins, endMins),
    };
  }, [pendingBooking]);

  const isSlotInPendingRange = useCallback((studioId: string, slot: string) => {
    if (!pendingBooking || !pendingRange) return false;
    if (!pendingBooking.studioIds.includes(studioId)) return false;
    const slotMins = timeToMinutes(slot);
    return slotMins >= pendingRange.minSlot && slotMins <= pendingRange.maxSlot;
  }, [pendingBooking, pendingRange]);

  const isPendingStartSlot = useCallback((studioId: string, slot: string) => {
    if (!pendingBooking || !pendingRange) return false;
    if (!pendingBooking.studioIds.includes(studioId)) return false;
    return timeToMinutes(slot) === pendingRange.minSlot;
  }, [pendingBooking, pendingRange]);

  const isPendingEndSlot = useCallback((studioId: string, slot: string) => {
    if (!pendingBooking || !pendingRange) return false;
    if (!pendingBooking.studioIds.includes(studioId)) return false;
    return timeToMinutes(slot) === pendingRange.maxSlot;
  }, [pendingBooking, pendingRange]);

  // Check if slot is in pending time range (for showing + buttons)
  const isSlotInPendingTimeRange = useCallback((slot: string) => {
    if (!pendingRange) return false;
    const slotMins = timeToMinutes(slot);
    return slotMins >= pendingRange.minSlot && slotMins <= pendingRange.maxSlot;
  }, [pendingRange]);

  const handleSlotMouseDown = (studioId: string, slot: string) => {
    if (isSlotUnavailable(studioId, slot)) return;
    
    setPendingBooking({
      studioIds: [studioId],
      startSlot: slot,
      endSlot: slot,
    });
    setIsDragging(true);
  };

  const handleSlotMouseEnter = (studioId: string, slot: string) => {
    if (!isDragging || !pendingBooking) return;
    if (!pendingBooking.studioIds.includes(studioId)) return;
    if (isSlotUnavailable(studioId, slot)) return;
    
    setPendingBooking(prev => prev ? { ...prev, endSlot: slot } : null);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add studio to current pending booking
  const addStudioToSelection = (studioId: string) => {
    if (!pendingBooking) return;
    if (pendingBooking.studioIds.includes(studioId)) return;
    
    // Check if time range is available for this studio
    if (!pendingRange) return;
    for (let mins = pendingRange.minSlot; mins <= pendingRange.maxSlot; mins += 15) {
      const slot = minutesToTime(mins);
      if (isSlotUnavailable(studioId, slot)) return;
    }
    
    setPendingBooking(prev => prev ? {
      ...prev,
      studioIds: [...prev.studioIds, studioId],
    } : null);
  };

  // Remove studio from selection
  const removeStudioFromSelection = (studioId: string) => {
    if (!pendingBooking) return;
    if (pendingBooking.studioIds.length <= 1) return; // Keep at least one
    
    setPendingBooking(prev => prev ? {
      ...prev,
      studioIds: prev.studioIds.filter(id => id !== studioId),
    } : null);
  };

  // Adjust start time
  const adjustStartTime = (direction: 'up' | 'down') => {
    if (!pendingBooking || !pendingRange) return;
    
    const newMins = direction === 'up' 
      ? pendingRange.minSlot - 15 
      : pendingRange.minSlot + 15;
    
    // Validate bounds
    const opStartMins = timeToMinutes(operatingStart);
    if (newMins < opStartMins) return;
    if (newMins > pendingRange.maxSlot) return; // Can't go past end
    
    // Check availability for all selected studios
    const newSlot = minutesToTime(newMins);
    for (const studioId of pendingBooking.studioIds) {
      if (direction === 'up' && isSlotUnavailable(studioId, newSlot)) return;
    }
    
    // Update based on which was the original start
    const startMins = timeToMinutes(pendingBooking.startSlot);
    const endMins = timeToMinutes(pendingBooking.endSlot);
    
    if (startMins <= endMins) {
      setPendingBooking(prev => prev ? { ...prev, startSlot: newSlot } : null);
    } else {
      setPendingBooking(prev => prev ? { ...prev, endSlot: newSlot } : null);
    }
  };

  // Adjust end time
  const adjustEndTime = (direction: 'up' | 'down') => {
    if (!pendingBooking || !pendingRange) return;
    
    const newMins = direction === 'up' 
      ? pendingRange.maxSlot - 15 
      : pendingRange.maxSlot + 15;
    
    // Validate bounds
    const opEndMins = timeToMinutes(operatingEnd) - 15; // Last bookable slot
    if (newMins > opEndMins) return;
    if (newMins < pendingRange.minSlot) return; // Can't go before start
    
    // Check availability for all selected studios
    const newSlot = minutesToTime(newMins);
    for (const studioId of pendingBooking.studioIds) {
      if (direction === 'down' && isSlotUnavailable(studioId, newSlot)) return;
    }
    
    // Update based on which was the original end
    const startMins = timeToMinutes(pendingBooking.startSlot);
    const endMins = timeToMinutes(pendingBooking.endSlot);
    
    if (endMins >= startMins) {
      setPendingBooking(prev => prev ? { ...prev, endSlot: newSlot } : null);
    } else {
      setPendingBooking(prev => prev ? { ...prev, startSlot: newSlot } : null);
    }
  };

  const handleConfirmBooking = () => {
    if (!pendingBooking || !pendingRange) return;
    
    const startTime = minutesToTime(pendingRange.minSlot);
    const endTime = minutesToTime(pendingRange.maxSlot + 15); // Add 15 min to get actual end time
    
    onBookingCreate?.(pendingBooking.studioIds, startTime, endTime, estimatedCost);
    setPendingBooking(null);
  };

  const handleCancelPending = () => {
    setPendingBooking(null);
    setIsDragging(false);
  };

  // Calculate estimated cost based on DIY rates
  const estimatedCost = useMemo(() => {
    if (!pendingBooking || !pendingRange || diyRates.length === 0) return 0;
    
    const hours = (pendingRange.maxSlot - pendingRange.minSlot + 15) / 60;
    const startHour = Math.floor(pendingRange.minSlot / 60);
    const slotType = getTimeSlotType(dayOfWeek, startHour);
    
    let total = 0;
    for (const studioId of pendingBooking.studioIds) {
      const rate = diyRates.find(r => 
        r.studio_id === studioId && 
        r.time_slots?.type === slotType
      );
      
      if (rate) {
        const firstHour = rate.first_hour_rate;
        const afterFirst = rate.after_first_hour_rate ?? rate.first_hour_rate;
        
        if (hours <= 1) {
          total += firstHour;
        } else {
          total += firstHour + (hours - 1) * afterFirst;
        }
      }
    }
    
    return Math.round(total * 100) / 100;
  }, [pendingBooking, pendingRange, diyRates, dayOfWeek]);

  // Get display info for pending booking
  const pendingBookingDisplay = useMemo(() => {
    if (!pendingBooking || !pendingRange) return null;
    
    const startTime = minutesToTime(pendingRange.minSlot);
    const endTime = minutesToTime(pendingRange.maxSlot + 15);
    const durationMins = pendingRange.maxSlot - pendingRange.minSlot + 15;
    const durationHrs = Math.floor(durationMins / 60);
    const durationRemMins = durationMins % 60;
    
    const durationStr = durationHrs > 0 
      ? `${durationHrs}h${durationRemMins > 0 ? ` ${durationRemMins}m` : ''}`
      : `${durationRemMins}m`;
    
    const studioNames = pendingBooking.studioIds
      .map(id => studios.find(s => s.id === id)?.name)
      .filter(Boolean)
      .join(', ');
    
    return {
      startTime,
      endTime,
      duration: durationStr,
      studioNames,
    };
  }, [pendingBooking, pendingRange, studios]);

  return (
    <div 
      className="border rounded-lg overflow-hidden select-none flex flex-col"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Sticky top bar when pending booking exists */}
      {pendingBooking && !isDragging && pendingBookingDisplay && (
        <div className="sticky top-0 z-20 bg-card border-b p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              {format(currentDate, 'EEE, MMM d')}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {formatTime(pendingBookingDisplay.startTime)} – {formatTime(pendingBookingDisplay.endTime)}
            </span>
            <span className="text-muted-foreground">
              ({pendingBookingDisplay.duration})
            </span>
            <span className="font-medium">
              {pendingBookingDisplay.studioNames}
            </span>
            <span className="flex items-center gap-0.5 font-semibold text-primary">
              <DollarSign className="h-4 w-4" />
              {estimatedCost.toFixed(2)}
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCancelPending}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleConfirmBooking}>
              Book
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto flex-1">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="bg-muted">
              <th className="w-20 py-3 px-2 text-left text-sm font-medium text-muted-foreground border-b border-r sticky left-0 bg-muted z-10">
                Time
              </th>
              {studios.map((studio) => (
                <th
                  key={studio.id}
                  className="py-3 px-2 text-left text-sm font-medium border-b border-r"
                >
                  <div className="flex items-center gap-2">
                    {studio.name}
                    {pendingBooking && pendingBooking.studioIds.includes(studio.id) && pendingBooking.studioIds.length > 1 && (
                      <button
                        onClick={() => removeStudioFromSelection(studio.id)}
                        className="p-0.5 hover:bg-destructive/10 rounded"
                      >
                        <X className="h-3 w-3 text-destructive" />
                      </button>
                    )}
                  </div>
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
                    "py-1 px-2 text-xs text-muted-foreground border-r font-mono sticky left-0 bg-background z-10",
                    isHourMark ? "font-medium" : "text-muted-foreground/60"
                  )}>
                    {formatTime(time)}
                  </td>
                  {studios.map((studio) => {
                    const slotBookings = getBookingsForSlot(studio.id, time);
                    const isBooked = isSlotBooked(studio.id, time);
                    const isBuffer = isSlotInBuffer(studio.id, time);
                    const isBlockedByBuyout = isSlotBlockedByBuyout(studio.id, time);
                    const isUnavailable = isBooked || isBuffer || isBlockedByBuyout;
                    const isInPending = isSlotInPendingRange(studio.id, time);
                    const isStartOfPending = isPendingStartSlot(studio.id, time);
                    const isEndOfPending = isPendingEndSlot(studio.id, time);
                    
                    // Show + button for studios not in selection but in time range
                    const showAddButton = pendingBooking && 
                      !pendingBooking.studioIds.includes(studio.id) && 
                      isSlotInPendingTimeRange(time) && 
                      isStartOfPending === false && 
                      !isUnavailable;
                    
                    // Only show + on the first slot of the range
                    const isFirstSlotOfRange = pendingRange && timeToMinutes(time) === pendingRange.minSlot;
                    
                    return (
                      <td
                        key={studio.id}
                        className={cn(
                          "py-0.5 px-1 border-r min-h-[28px] h-7 relative",
                          !isUnavailable && !isInPending && "cursor-pointer hover:bg-muted/50",
                          isBooked && "bg-muted/30",
                          isBuffer && "bg-amber-500/10",
                          isBlockedByBuyout && "bg-destructive/10",
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
                        
                        {/* Buffer indicator */}
                        {isBuffer && !isBooked && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[10px] text-amber-600/70">buffer</span>
                          </div>
                        )}
                        
                        {/* Blocked by buyout indicator */}
                        {isBlockedByBuyout && !isBooked && !isBuffer && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[10px] text-destructive/50">blocked</span>
                          </div>
                        )}
                        
                        {/* Pending booking indicator */}
                        {isInPending && !isBooked && (
                          <div className={cn(
                            "absolute inset-0 border-2 border-primary border-dashed",
                            isStartOfPending && "rounded-t",
                            isEndOfPending && "rounded-b"
                          )}>
                            {/* Arrow controls at start */}
                            {isStartOfPending && !isDragging && (
                              <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-0.5 z-10">
                                <button
                                  onClick={(e) => { e.stopPropagation(); adjustStartTime('up'); }}
                                  className="w-5 h-5 bg-primary hover:bg-primary/80 text-primary-foreground rounded flex items-center justify-center shadow"
                                >
                                  <ChevronUp className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); adjustStartTime('down'); }}
                                  className="w-5 h-5 bg-primary hover:bg-primary/80 text-primary-foreground rounded flex items-center justify-center shadow"
                                >
                                  <ChevronDown className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                            
                            {/* Arrow controls at end */}
                            {isEndOfPending && !isDragging && (
                              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-0.5 z-10">
                                <button
                                  onClick={(e) => { e.stopPropagation(); adjustEndTime('up'); }}
                                  className="w-5 h-5 bg-primary hover:bg-primary/80 text-primary-foreground rounded flex items-center justify-center shadow"
                                >
                                  <ChevronUp className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); adjustEndTime('down'); }}
                                  className="w-5 h-5 bg-primary hover:bg-primary/80 text-primary-foreground rounded flex items-center justify-center shadow"
                                >
                                  <ChevronDown className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Add studio button */}
                        {showAddButton && isFirstSlotOfRange && !isUnavailable && (
                          <button
                            onClick={(e) => { e.stopPropagation(); addStudioToSelection(studio.id); }}
                            className="absolute inset-0 flex items-center justify-center hover:bg-primary/10 transition-colors"
                          >
                            <Plus className="h-5 w-5 text-primary/60" />
                          </button>
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
    </div>
  );
}
