import { useState, useMemo, useEffect } from 'react';
import { format, getDay, parse, addWeeks, addMonths } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  CalendarPlus, 
  CalendarIcon, 
  User, 
  Home, 
  Ban, 
  Wrench, 
  Users,
  AlertTriangle,
} from 'lucide-react';
import { useProviderLevels } from '@/hooks/useEstimatorData';
import { useCreateBooking } from '@/hooks/useStudioBookings';
import { useToast } from '@/hooks/use-toast';
import type { TimeSlotType } from '@/types/estimator';

type BookingType = 'customer' | 'internal' | 'unavailable';
type SessionType = 'diy' | 'serviced';
type HolderType = 'casual' | 'customer' | 'internal';
type RepeatType = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly';
type PaymentStatus = 'not_applicable' | 'pending' | 'paid' | 'partial';

interface Studio {
  id: string;
  name: string;
  type: string;
  is_active: boolean | null;
}

interface DiyRate {
  id: string;
  studio_id: string;
  time_slot_id: string;
  first_hour_rate: number;
  after_first_hour_rate: number | null;
  studios?: { type: string } | null;
  time_slots?: { type: string } | null;
}

interface NewBookingModalProps {
  open: boolean;
  onClose: () => void;
  studios: Studio[];
  diyRates: DiyRate[];
  defaultDate?: Date;
  operatingStart: string;
  operatingEnd: string;
  onBookingCreated?: () => void;
}

// Generate time slots in 15-minute increments
function generateTimeSlots(start: string, end: string): string[] {
  const slots: string[] = [];
  const startParts = start.split(':').map(Number);
  const endParts = end.split(':').map(Number);
  
  let currentHour = startParts[0];
  let currentMinute = startParts[1] || 0;
  const endHour = endParts[0];
  const endMinute = endParts[1] || 0;
  
  while (currentHour < endHour || (currentHour === endHour && currentMinute <= endMinute)) {
    const hour12 = currentHour % 12 || 12;
    const ampm = currentHour < 12 ? 'AM' : 'PM';
    const minuteStr = currentMinute.toString().padStart(2, '0');
    slots.push(`${hour12}:${minuteStr} ${ampm}`);
    
    currentMinute += 15;
    if (currentMinute >= 60) {
      currentMinute = 0;
      currentHour++;
    }
  }
  
  return slots;
}

// Convert 12-hour time to 24-hour format
function to24Hour(time12: string): string {
  const [time, period] = time12.split(' ');
  const [hours, minutes] = time.split(':').map(Number);
  let hour24 = hours;
  
  if (period === 'PM' && hours !== 12) {
    hour24 = hours + 12;
  } else if (period === 'AM' && hours === 12) {
    hour24 = 0;
  }
  
  return `${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// Calculate hours between two times
function calculateHours(startTime: string, endTime: string): number {
  const start24 = to24Hour(startTime);
  const end24 = to24Hour(endTime);
  
  const [startH, startM] = start24.split(':').map(Number);
  const [endH, endM] = end24.split(':').map(Number);
  
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  
  return Math.max(0, (endMinutes - startMinutes) / 60);
}

// Determine time slot type from date and time
function getTimeSlotType(date: Date, startTime: string): TimeSlotType {
  const day = getDay(date); // 0 = Sunday, 6 = Saturday
  const time24 = to24Hour(startTime);
  const hour = parseInt(time24.split(':')[0]);
  const isEvening = hour >= 16;
  
  if (day === 0 || day === 6) {
    return isEvening ? 'sat_sun_eve' : 'sat_sun_day';
  } else if (day >= 4) { // Thu, Fri
    return isEvening ? 'thu_fri_eve' : 'thu_fri_day';
  } else { // Mon, Tue, Wed
    return isEvening ? 'mon_wed_eve' : 'mon_wed_day';
  }
}

export function NewBookingModal({
  open,
  onClose,
  studios,
  diyRates,
  defaultDate,
  operatingStart,
  operatingEnd,
  onBookingCreated,
}: NewBookingModalProps) {
  const { toast } = useToast();
  const createBooking = useCreateBooking();
  const { data: providerLevels = [] } = useProviderLevels();
  
  // Form state
  const [bookingType, setBookingType] = useState<BookingType>('customer');
  const [sessionType, setSessionType] = useState<SessionType>('diy');
  const [providerLevel, setProviderLevel] = useState<'lv1' | 'lv2' | 'lv3'>('lv2');
  const [date, setDate] = useState<Date | undefined>(defaultDate || new Date());
  const [startTime, setStartTime] = useState<string>('10:00 AM');
  const [endTime, setEndTime] = useState<string>('11:00 AM');
  const [repeat, setRepeat] = useState<RepeatType>('none');
  const [selectedStudios, setSelectedStudios] = useState<string[]>([]);
  const [holderType, setHolderType] = useState<HolderType>('casual');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [manualPrice, setManualPrice] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('not_applicable');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when opened
  useEffect(() => {
    if (open) {
      setBookingType('customer');
      setSessionType('diy');
      setProviderLevel('lv2');
      setDate(defaultDate || new Date());
      setStartTime('10:00 AM');
      setEndTime('11:00 AM');
      setRepeat('none');
      setSelectedStudios([]);
      setHolderType('casual');
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setManualPrice('');
      setPaymentStatus('not_applicable');
      setNotes('');
    }
  }, [open, defaultDate]);

  const timeSlots = useMemo(() => {
    return generateTimeSlots(operatingStart, operatingEnd);
  }, [operatingStart, operatingEnd]);

  const hours = useMemo(() => {
    return calculateHours(startTime, endTime);
  }, [startTime, endTime]);

  // Calculate price based on DIY rates and provider rates
  const calculatedPrice = useMemo(() => {
    if (!date || selectedStudios.length === 0 || hours <= 0) return 0;
    
    const slotType = getTimeSlotType(date, startTime);
    let total = 0;
    
    // Add studio rates
    for (const studioId of selectedStudios) {
      const studio = studios.find(s => s.id === studioId);
      const rate = diyRates.find(
        r => r.studio_id === studioId && r.time_slots?.type === slotType
      );
      
      if (rate) {
        if (hours <= 1) {
          total += rate.first_hour_rate;
        } else if (rate.after_first_hour_rate !== null) {
          total += rate.first_hour_rate + (hours - 1) * rate.after_first_hour_rate;
        } else {
          total += hours * rate.first_hour_rate;
        }
      }
    }
    
    // Add provider rates for serviced sessions
    if (sessionType === 'serviced' && bookingType === 'customer') {
      const provider = providerLevels.find(p => p.level === providerLevel);
      if (provider) {
        total += Number(provider.hourly_rate) * hours;
      }
    }
    
    return Math.round(total * 100) / 100;
  }, [date, selectedStudios, hours, startTime, sessionType, providerLevel, bookingType, studios, diyRates, providerLevels]);

  const displayPrice = manualPrice !== '' ? parseFloat(manualPrice) || 0 : calculatedPrice;

  const handleStudioToggle = (studioId: string) => {
    setSelectedStudios(prev => 
      prev.includes(studioId)
        ? prev.filter(id => id !== studioId)
        : [...prev, studioId]
    );
  };

  const handleSubmit = async () => {
    if (!date) {
      toast({ title: 'Please select a date', variant: 'destructive' });
      return;
    }
    
    if (selectedStudios.length === 0) {
      toast({ title: 'Please select at least one space', variant: 'destructive' });
      return;
    }
    
    if (hours <= 0) {
      toast({ title: 'End time must be after start time', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create bookings for each selected studio
      const bookingPromises = selectedStudios.map(studioId => 
        createBooking.mutateAsync({
          studio_id: studioId,
          booking_date: format(date, 'yyyy-MM-dd'),
          start_time: to24Hour(startTime),
          end_time: to24Hour(endTime),
          booking_type: bookingType,
          status: 'confirmed',
          customer_name: holderType === 'customer' ? customerName : null,
          customer_email: holderType === 'customer' ? customerEmail : null,
          customer_phone: holderType === 'customer' ? customerPhone : null,
          session_type: bookingType === 'customer' ? sessionType : null,
          notes: notes || null,
          quote_id: null,
          created_by: null,
        })
      );

      // If repeating, create additional bookings
      if (repeat !== 'none') {
        const repeatCount = repeat === 'daily' ? 7 : repeat === 'weekly' ? 4 : repeat === 'biweekly' ? 4 : 3;
        
        for (let i = 1; i <= repeatCount; i++) {
          let nextDate: Date;
          switch (repeat) {
            case 'daily':
              nextDate = new Date(date);
              nextDate.setDate(date.getDate() + i);
              break;
            case 'weekly':
              nextDate = addWeeks(date, i);
              break;
            case 'biweekly':
              nextDate = addWeeks(date, i * 2);
              break;
            case 'monthly':
              nextDate = addMonths(date, i);
              break;
            default:
              continue;
          }
          
          for (const studioId of selectedStudios) {
            bookingPromises.push(
              createBooking.mutateAsync({
                studio_id: studioId,
                booking_date: format(nextDate, 'yyyy-MM-dd'),
                start_time: to24Hour(startTime),
                end_time: to24Hour(endTime),
                booking_type: bookingType,
                status: 'confirmed',
                customer_name: holderType === 'customer' ? customerName : null,
                customer_email: holderType === 'customer' ? customerEmail : null,
                customer_phone: holderType === 'customer' ? customerPhone : null,
                session_type: bookingType === 'customer' ? sessionType : null,
                notes: notes || null,
                quote_id: null,
                created_by: null,
              })
            );
          }
        }
      }

      await Promise.all(bookingPromises);
      
      toast({ title: 'Booking created successfully' });
      onBookingCreated?.();
      onClose();
    } catch (error) {
      console.error('Failed to create booking:', error);
      toast({ 
        title: 'Failed to create booking', 
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5" />
            New booking
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Booking Type */}
          <div className="space-y-2">
            <Label>Booking type *</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={bookingType === 'customer' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setBookingType('customer')}
                className="flex-1"
              >
                <User className="h-4 w-4 mr-2" />
                User booking
              </Button>
              <Button
                type="button"
                variant={bookingType === 'internal' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setBookingType('internal')}
                className="flex-1"
              >
                <Home className="h-4 w-4 mr-2" />
                Internal use
              </Button>
              <Button
                type="button"
                variant={bookingType === 'unavailable' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setBookingType('unavailable')}
                className="flex-1"
              >
                <Ban className="h-4 w-4 mr-2" />
                Unavailable
              </Button>
            </div>
          </div>

          {/* Session Type (for customer bookings only) */}
          {bookingType === 'customer' && (
            <div className="space-y-2">
              <Label>Session type *</Label>
              <div className="grid grid-cols-2 gap-3">
                <Card 
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    sessionType === 'diy' && "ring-2 ring-primary"
                  )}
                  onClick={() => setSessionType('diy')}
                >
                  <CardHeader className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center">
                        <Wrench className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm">DIY Session</CardTitle>
                        <CardDescription className="text-xs">Self-operated</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
                
                <Card 
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    sessionType === 'serviced' && "ring-2 ring-primary"
                  )}
                  onClick={() => setSessionType('serviced')}
                >
                  <CardHeader className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-sm">EXP Session</CardTitle>
                        <CardDescription className="text-xs">With crew</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </div>
              
              {/* Provider Level (for serviced sessions) */}
              {sessionType === 'serviced' && (
                <div className="mt-3">
                  <Label className="text-sm">Provider level</Label>
                  <Select value={providerLevel} onValueChange={(v: 'lv1' | 'lv2' | 'lv3') => setProviderLevel(v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lv1">Level 1 (+$20/hr)</SelectItem>
                      <SelectItem value="lv2">Level 2 (+$30/hr)</SelectItem>
                      <SelectItem value="lv3">Level 3 (+$40/hr)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Date */}
          <div className="space-y-2">
            <Label>Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "EEEE, MMM d, yyyy") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time */}
          <div className="space-y-2">
            <Label>Time *</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">From</Label>
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map(slot => (
                      <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">To</Label>
                <Select value={endTime} onValueChange={setEndTime}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map(slot => (
                      <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {hours > 0 && (
              <p className="text-xs text-muted-foreground">{hours} hour{hours !== 1 ? 's' : ''}</p>
            )}
          </div>

          {/* Repeat */}
          <div className="space-y-2">
            <Label>Repeat *</Label>
            <Select value={repeat} onValueChange={(v: RepeatType) => setRepeat(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="daily">Daily (next 7 days)</SelectItem>
                <SelectItem value="weekly">Weekly (next 4 weeks)</SelectItem>
                <SelectItem value="biweekly">Biweekly (next 8 weeks)</SelectItem>
                <SelectItem value="monthly">Monthly (next 3 months)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Spaces (Studios) */}
          <div className="space-y-2">
            <Label>Spaces *</Label>
            <div className="border rounded-md p-3 space-y-2">
              {selectedStudios.length === 0 && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  No spaces selected
                </div>
              )}
              {studios.filter(s => s.is_active).map(studio => (
                <div key={studio.id} className="flex items-center gap-2">
                  <Checkbox
                    id={studio.id}
                    checked={selectedStudios.includes(studio.id)}
                    onCheckedChange={() => handleStudioToggle(studio.id)}
                  />
                  <label htmlFor={studio.id} className="text-sm cursor-pointer flex-1">
                    {studio.name}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Holder */}
          {bookingType !== 'unavailable' && (
            <div className="space-y-2">
              <Label>Holder *</Label>
              <Select value={holderType} onValueChange={(v: HolderType) => setHolderType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="casual">Casual user (no details needed)</SelectItem>
                  <SelectItem value="customer">Customer (with details)</SelectItem>
                  <SelectItem value="internal">Internal team member</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Customer Details */}
              {holderType === 'customer' && (
                <div className="space-y-3 mt-3 p-3 border rounded-md bg-muted/30">
                  <div>
                    <Label className="text-sm">Name</Label>
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Customer name"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Email</Label>
                    <Input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="customer@example.com"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Phone</Label>
                    <Input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Price & Payment */}
          {bookingType === 'customer' && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Price *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={manualPrice}
                      onChange={(e) => setManualPrice(e.target.value)}
                      placeholder={calculatedPrice.toFixed(2)}
                      className="pl-7"
                    />
                  </div>
                  {manualPrice === '' && calculatedPrice > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">Auto-calculated</p>
                  )}
                </div>
                <div>
                  <Label>Payment status *</Label>
                  <Select value={paymentStatus} onValueChange={(v: PaymentStatus) => setPaymentStatus(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_applicable">Not applicable</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4">
          <div className="flex gap-2 w-full sm:w-auto">
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Confirm booking'}
            </Button>
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
          </div>
          {bookingType === 'customer' && (
            <div className="text-lg font-semibold">
              Total: ${displayPrice.toFixed(2)}
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
