import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
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
  onOpenBookingModal?: (studioIds: string[], startTime: string, endTime: string, estimatedCost: number) => void;
  clearPendingTrigger?: number; // Increment to trigger clearing pending booking
}

interface PendingBooking {
  studioIds: string[];
  startSlot: string;
  endSlot: string;
}

const FULL_STUDIO_BUYOUT_TYPE = 'full_studio_buyout';
const SLOT_HEIGHT = 28; // Height of each slot in pixels

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
  onOpenBookingModal,
  clearPendingTrigger,
}: DayViewProps) {
  const [pendingBooking, setPendingBooking] = useState<PendingBooking | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<{ studioId: string; time: string } | null>(null);
  
  // Drag states
  const [resizeMode, setResizeMode] = useState<'top' | 'bottom' | null>(null);
  const [moveMode, setMoveMode] = useState<{
    startY: number;
    startX: number;
    originalStartMins: number;
    durationMins: number;
    draggedStudioId: string;
  } | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const tbodyRef = useRef<HTMLTableSectionElement>(null);

  // Clear pending booking when trigger changes (from parent after successful booking)
  useEffect(() => {
    if (clearPendingTrigger && clearPendingTrigger > 0) {
      setPendingBooking(null);
      setResizeMode(null);
      setMoveMode(null);
    }
  }, [clearPendingTrigger]);

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
    if (studio?.type === FULL_STUDIO_BUYOUT_TYPE) return false;
    
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

  // Check if a range is available for all studios in pending booking
  const isRangeAvailable = useCallback((startMins: number, endMins: number, studioIds: string[]) => {
    const opStartMins = timeToMinutes(operatingStart);
    const opEndMins = timeToMinutes(operatingEnd) - 15;
    
    if (startMins < opStartMins || endMins > opEndMins) return false;
    
    for (const studioId of studioIds) {
      for (let mins = startMins; mins <= endMins; mins += 15) {
        const slot = minutesToTime(mins);
        if (isSlotUnavailable(studioId, slot)) return false;
      }
    }
    return true;
  }, [operatingStart, operatingEnd, isSlotUnavailable]);

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

  // Check if slot is in pending buffer zone (before or after pending booking)
  const isSlotInPendingBuffer = useCallback((studioId: string, slot: string) => {
    if (!pendingBooking || !pendingRange || bufferMinutes === 0) return false;
    if (!pendingBooking.studioIds.includes(studioId)) return false;
    
    const slotMins = timeToMinutes(slot);
    
    // Buffer BEFORE the booking (slot is within bufferMinutes before start)
    const bufferBeforeEnd = pendingRange.minSlot;
    const bufferBeforeStart = bufferBeforeEnd - bufferMinutes;
    const isBeforeBuffer = slotMins >= bufferBeforeStart && slotMins < bufferBeforeEnd;
    
    // Buffer AFTER the booking (slot is within bufferMinutes after end)
    const bufferAfterStart = pendingRange.maxSlot + 15; // +15 because end slot is inclusive
    const bufferAfterEnd = bufferAfterStart + bufferMinutes;
    const isAfterBuffer = slotMins >= bufferAfterStart && slotMins < bufferAfterEnd;
    
    return isBeforeBuffer || isAfterBuffer;
  }, [pendingBooking, pendingRange, bufferMinutes]);

  // Check if slot is in pending time range (for showing + buttons)
  const isSlotInPendingTimeRange = useCallback((slot: string) => {
    if (!pendingRange) return false;
    const slotMins = timeToMinutes(slot);
    return slotMins >= pendingRange.minSlot && slotMins <= pendingRange.maxSlot;
  }, [pendingRange]);

  // Click on slot to create booking
  const handleSlotClick = (studioId: string, slot: string) => {
    if (isSlotUnavailable(studioId, slot)) return;
    if (pendingBooking) return; // Already have a pending booking
    
    setPendingBooking({
      studioIds: [studioId],
      startSlot: slot,
      endSlot: slot,
    });
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
    if (pendingBooking.studioIds.length <= 1) return;
    
    setPendingBooking(prev => prev ? {
      ...prev,
      studioIds: prev.studioIds.filter(id => id !== studioId),
    } : null);
  };

  // Start resize drag
  const handleResizeStart = (direction: 'top' | 'bottom', e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setResizeMode(direction);
  };

  // Start move drag
  const handleMoveStart = (studioId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!pendingRange || !pendingBooking) return;
    
    const durationMins = pendingRange.maxSlot - pendingRange.minSlot;
    setMoveMode({
      startY: e.clientY,
      startX: e.clientX,
      originalStartMins: pendingRange.minSlot,
      durationMins,
      draggedStudioId: studioId,
    });
  };

  // Handle mouse move for resize/move
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!pendingBooking || !pendingRange) return;

      if (resizeMode) {
        // Calculate which slot we're over using tbody for accurate Y position
        const tbody = tbodyRef.current;
        if (!tbody) return;
        
        const rect = tbody.getBoundingClientRect();
        const relativeY = e.clientY - rect.top;
        const slotIndex = Math.floor(relativeY / SLOT_HEIGHT);
        const targetSlotMins = timeToMinutes(operatingStart) + (slotIndex * 15);
        
        if (resizeMode === 'top') {
          // Resize from top - adjust start time
          const newStartMins = Math.max(
            timeToMinutes(operatingStart),
            Math.min(targetSlotMins, pendingRange.maxSlot)
          );
          
          // Check availability
          if (isRangeAvailable(newStartMins, pendingRange.maxSlot, pendingBooking.studioIds)) {
            setPendingBooking(prev => prev ? {
              ...prev,
              startSlot: minutesToTime(newStartMins),
              endSlot: minutesToTime(pendingRange.maxSlot),
            } : null);
          }
        } else {
          // Resize from bottom - adjust end time
          const newEndMins = Math.max(
            pendingRange.minSlot,
            Math.min(targetSlotMins, timeToMinutes(operatingEnd) - 15)
          );
          
          // Check availability
          if (isRangeAvailable(pendingRange.minSlot, newEndMins, pendingBooking.studioIds)) {
            setPendingBooking(prev => prev ? {
              ...prev,
              startSlot: minutesToTime(pendingRange.minSlot),
              endSlot: minutesToTime(newEndMins),
            } : null);
          }
        }
      } else if (moveMode) {
        // Calculate slot offset from mouse movement (vertical)
        const deltaY = e.clientY - moveMode.startY;
        const slotOffset = Math.round(deltaY / SLOT_HEIGHT);
        const newStartMins = moveMode.originalStartMins + (slotOffset * 15);
        const newEndMins = newStartMins + moveMode.durationMins;
        
        // Calculate horizontal movement to detect target studio
        const table = tableRef.current;
        let targetStudioId = moveMode.draggedStudioId;
        
        if (table) {
          const headerCells = table.querySelectorAll('thead th');
          // Skip first header cell (time column)
          for (let i = 1; i < headerCells.length; i++) {
            const cell = headerCells[i];
            const rect = cell.getBoundingClientRect();
            if (e.clientX >= rect.left && e.clientX < rect.right) {
              targetStudioId = studios[i - 1]?.id || moveMode.draggedStudioId;
              break;
            }
          }
        }
        
        // Check if we're changing studios
        const isChangingStudio = targetStudioId !== moveMode.draggedStudioId;
        
        if (isChangingStudio && pendingBooking.studioIds.length === 1) {
          // Single studio booking: move to new studio if available
          if (isRangeAvailable(newStartMins, newEndMins, [targetStudioId])) {
            setPendingBooking(prev => prev ? {
              ...prev,
              studioIds: [targetStudioId],
              startSlot: minutesToTime(newStartMins),
              endSlot: minutesToTime(newEndMins),
            } : null);
          }
        } else if (isChangingStudio && pendingBooking.studioIds.length > 1) {
          // Multi-studio booking: swap just the dragged studio
          const otherStudios = pendingBooking.studioIds.filter(id => id !== moveMode.draggedStudioId);
          if (!otherStudios.includes(targetStudioId) && isRangeAvailable(newStartMins, newEndMins, [targetStudioId])) {
            setPendingBooking(prev => prev ? {
              ...prev,
              studioIds: [...otherStudios, targetStudioId],
              startSlot: minutesToTime(newStartMins),
              endSlot: minutesToTime(newEndMins),
            } : null);
            // Update the dragged studio id to the new one
            setMoveMode(prev => prev ? { ...prev, draggedStudioId: targetStudioId, startX: e.clientX } : null);
          }
        } else {
          // Just vertical movement
          if (isRangeAvailable(newStartMins, newEndMins, pendingBooking.studioIds)) {
            setPendingBooking(prev => prev ? {
              ...prev,
              startSlot: minutesToTime(newStartMins),
              endSlot: minutesToTime(newEndMins),
            } : null);
          }
        }
      }
    };

    const handleMouseUp = () => {
      setResizeMode(null);
      setMoveMode(null);
    };

    if (resizeMode || moveMode) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [resizeMode, moveMode, pendingBooking, pendingRange, operatingStart, operatingEnd, isRangeAvailable, studios]);

  const handleConfirmBooking = () => {
    if (!pendingBooking || !pendingRange) return;
    
    const startTime = minutesToTime(pendingRange.minSlot);
    const endTime = minutesToTime(pendingRange.maxSlot + 15);
    
    // Open modal with prefilled data - don't clear pending booking yet
    // It will be cleared when booking is successfully created via onClearPendingBooking
    onOpenBookingModal?.(pendingBooking.studioIds, startTime, endTime, estimatedCost);
  };

  const handleCancelPending = () => {
    setPendingBooking(null);
    setResizeMode(null);
    setMoveMode(null);
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

  const isDragging = resizeMode !== null || moveMode !== null;

  return (
    <div 
      className="border rounded-lg overflow-hidden select-none flex flex-col"
    >
      {/* Sticky top bar when pending booking exists */}
      {pendingBooking && pendingBookingDisplay && (
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

      <div className="overflow-x-auto flex-1" ref={containerRef}>
        <table className="w-full min-w-[800px]" ref={tableRef}>
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
          <tbody ref={tbodyRef}>
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
                    const isInPendingBuffer = isSlotInPendingBuffer(studio.id, time);
                    
                    // Hover state
                    const isHovered = hoveredSlot?.studioId === studio.id && hoveredSlot?.time === time;
                    const showHoverState = isHovered && !isUnavailable && !pendingBooking;
                    
                    // Show + button for studios not in selection but in time range
                    const showAddButton = pendingBooking && 
                      !pendingBooking.studioIds.includes(studio.id) && 
                      isSlotInPendingTimeRange(time) && 
                      !isUnavailable;
                    
                    // Only show + on the first slot of the range
                    const isFirstSlotOfRange = pendingRange && timeToMinutes(time) === pendingRange.minSlot;
                    
                      return (
                        <td
                          key={studio.id}
                          className={cn(
                            "py-0.5 px-1 border-r min-h-[28px] h-7 relative transition-colors",
                            !isUnavailable && !isInPending && !pendingBooking && "cursor-pointer",
                            isBooked && "bg-muted/30",
                            isBuffer && "bg-amber-500/10",
                            isBlockedByBuyout && "bg-destructive/10",
                            isInPending && "border-transparent", // Hide cell borders within pending
                            isInPendingBuffer && !isBooked && !isBuffer && "bg-muted",
                            showHoverState && "bg-primary"
                          )}
                        onClick={() => handleSlotClick(studio.id, time)}
                        onMouseEnter={() => setHoveredSlot({ studioId: studio.id, time })}
                        onMouseLeave={() => setHoveredSlot(null)}
                      >
                        {/* Hover state - orange with time */}
                        {showHoverState && (
                          <div className="absolute inset-0 flex items-center justify-center text-primary-foreground font-medium text-xs">
                            ⊕ {formatTime(time)}
                          </div>
                        )}
                        
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
                        
                        {/* Pending buffer zone indicator */}
                        {isInPendingBuffer && !isBooked && !isBuffer && (
                          <div className="absolute inset-0 flex items-center justify-center bg-muted">
                            <span className="text-[10px] text-muted-foreground font-medium">buffer</span>
                          </div>
                        )}
                        
                        {/* Pending booking indicator */}
                        {isInPending && !isBooked && (
                          <div 
                            className={cn(
                              "absolute inset-x-0 -inset-y-[1px] z-20 border-l-4 border-r-2 border-primary bg-card shadow-sm",
                              isStartOfPending && "rounded-t-md rounded-tr-md border-t-2 -top-[1px]",
                              isEndOfPending && "rounded-b-md rounded-br-md border-b-2 -bottom-[1px]",
                              !resizeMode && !moveMode && "cursor-grab",
                              moveMode && "cursor-grabbing"
                            )}
                            onMouseDown={(e) => handleMoveStart(studio.id, e)}
                            onDoubleClick={(e) => { e.stopPropagation(); handleConfirmBooking(); }}
                          >
                            {/* X remove button for multi-studio selection */}
                            {isStartOfPending && pendingBooking && pendingBooking.studioIds.length > 1 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeStudioFromSelection(studio.id);
                                }}
                                className="absolute top-0.5 right-0.5 z-20 w-4 h-4 bg-muted hover:bg-destructive/20 rounded-full flex items-center justify-center border border-border"
                              >
                                <X className="h-2.5 w-2.5 text-muted-foreground hover:text-destructive" />
                              </button>
                            )}
                            
                            {/* Single Up Arrow at top - hide during bottom resize or move */}
                            {isStartOfPending && resizeMode !== 'bottom' && !moveMode && (
                              <div 
                                className="absolute -top-3 left-1/2 -translate-x-1/2 z-10"
                                onMouseDown={(e) => handleResizeStart('top', e)}
                              >
                                <button
                                  className={cn(
                                    "w-6 h-6 bg-primary hover:bg-primary/80 text-primary-foreground rounded-lg flex items-center justify-center shadow cursor-n-resize",
                                    resizeMode === 'top' && "ring-2 ring-primary-foreground"
                                  )}
                                >
                                  <ChevronUp className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                            
                            {/* Single Down Arrow at bottom - hide during top resize or move */}
                            {isEndOfPending && resizeMode !== 'top' && !moveMode && (
                              <div 
                                className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10"
                                onMouseDown={(e) => handleResizeStart('bottom', e)}
                              >
                                <button
                                  className={cn(
                                    "w-6 h-6 bg-primary hover:bg-primary/80 text-primary-foreground rounded-lg flex items-center justify-center shadow cursor-s-resize",
                                    resizeMode === 'bottom' && "ring-2 ring-primary-foreground"
                                  )}
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Add studio button */}
                        {showAddButton && isFirstSlotOfRange && (
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
