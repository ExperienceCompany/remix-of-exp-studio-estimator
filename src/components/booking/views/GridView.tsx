import { useMemo, useState } from 'react';
import { format, addDays, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { BookingCard } from '../BookingCard';
import { useUpdateBooking } from '@/hooks/useStudioBookings';
import { useToast } from '@/hooks/use-toast';
import type { StudioBooking } from '@/hooks/useStudioBookings';

interface GridViewProps {
  currentDate: Date;
  bookings: StudioBooking[];
  studios: { id: string; name: string; type: string }[];
  onDateClick?: (date: Date, studioId?: string) => void;
  onSlotClick?: (date: Date, studioId?: string) => void;
  onBookingClick?: (booking: StudioBooking) => void;
}

export function GridView({
  currentDate,
  bookings,
  studios,
  onDateClick,
  onSlotClick,
  onBookingClick,
}: GridViewProps) {
  const { toast } = useToast();
  const updateBooking = useUpdateBooking();
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);

  // Start from current date instead of week start
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentDate, i));
  }, [currentDate]);

  const getBookingsForDateAndStudio = (date: Date, studioId: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return bookings.filter(
      (b) => b.booking_date === dateStr && b.studio_id === studioId
    );
  };

  const handleDragStart = (e: React.DragEvent, booking: StudioBooking) => {
    e.dataTransfer.setData('bookingId', booking.id);
    e.dataTransfer.setData('bookingData', JSON.stringify(booking));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, date: Date, studioId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCell(`${format(date, 'yyyy-MM-dd')}-${studioId}`);
  };

  const handleDragLeave = () => {
    setDragOverCell(null);
  };

  const handleDrop = async (e: React.DragEvent, date: Date, studioId: string) => {
    e.preventDefault();
    setDragOverCell(null);
    
    const bookingId = e.dataTransfer.getData('bookingId');
    if (!bookingId) return;
    
    const newDate = format(date, 'yyyy-MM-dd');
    
    try {
      await updateBooking.mutateAsync({
        id: bookingId,
        booking_date: newDate,
        studio_id: studioId,
      });
      toast({
        title: 'Booking moved',
        description: `Booking moved to ${format(date, 'EEEE, MMM d')}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to move booking',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="border rounded-lg overflow-x-auto">
      <table className="w-full min-w-[800px]">
        <thead>
          <tr className="bg-muted">
            <th className="w-32 py-3 px-2 text-left text-sm font-medium text-muted-foreground border-b border-r">
              Date
            </th>
            {studios.map((studio) => (
              <th
                key={studio.id}
                className="py-3 px-2 text-center text-sm font-medium border-b border-r"
              >
                <div>{studio.name}</div>
                <div className="text-xs text-muted-foreground font-normal">
                  {studio.type.replace(/_/g, ' ')}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weekDays.map((date, idx) => {
            const isTodayDate = isToday(date);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            
            return (
              <tr
                key={date.toISOString()}
                className={cn(
                  'hover:bg-muted/30 transition-colors border-b border-muted-foreground/20',
                  isWeekend && 'bg-muted/10',
                  isTodayDate && 'bg-primary/5'
                )}
              >
                <td
                  className={cn(
                    "py-2 px-2 border-r cursor-pointer",
                    isTodayDate && "font-bold"
                  )}
                  onClick={() => onDateClick?.(date)}
                >
                  <div className="text-sm font-medium">
                    {format(date, 'EEE')}
                  </div>
                  <div className={cn(
                    "text-lg",
                    isTodayDate && "text-primary"
                  )}>
                    {format(date, 'd')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(date, 'MMM')}
                  </div>
                </td>
                {studios.map((studio) => {
                  const dayBookings = getBookingsForDateAndStudio(date, studio.id);
                  const displayBookings = dayBookings.slice(0, 3);
                  const hasMore = dayBookings.length > 3;
                  const cellKey = `${format(date, 'yyyy-MM-dd')}-${studio.id}`;
                  const isDragOver = dragOverCell === cellKey;

                  return (
                    <td
                      key={studio.id}
                      className={cn(
                        'py-1 px-1 border-r align-top min-h-[80px] cursor-pointer hover:bg-muted/50 transition-colors',
                        isDragOver && 'bg-primary/10 ring-2 ring-primary ring-inset'
                      )}
                      onClick={() => onSlotClick?.(date, studio.id)}
                      onDragOver={(e) => handleDragOver(e, date, studio.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, date, studio.id)}
                    >
                      <div className="space-y-1">
                        {displayBookings.map((booking) => (
                          <BookingCard
                            key={booking.id}
                            booking={booking}
                            compact
                            onClick={() => onBookingClick?.(booking)}
                            draggable
                            onDragStart={handleDragStart}
                          />
                        ))}
                        {hasMore && (
                          <div
                            className="text-xs text-muted-foreground text-center cursor-pointer hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDateClick?.(date);
                            }}
                          >
                            +{dayBookings.length - 3} more
                          </div>
                        )}
                      </div>
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
