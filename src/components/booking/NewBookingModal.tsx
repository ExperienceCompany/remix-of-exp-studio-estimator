import { useState, useMemo, useEffect } from 'react';
import { format, getDay } from 'date-fns';
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
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
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
  Mic,
  Video,
  Camera,
  Music,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Check,
  Save,
} from 'lucide-react';
import { useProviderLevels, useServices, useVodcastCameraAddons, useSessionAddons } from '@/hooks/useEstimatorData';
import { useCreateBooking, useUpdateBooking, StudioBooking } from '@/hooks/useStudioBookings';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RepeatOptions, RepeatConfig, createDefaultRepeatConfig, calculateRepeatDates } from './RepeatOptions';
import type { TimeSlotType, ServiceType, CrewAllocation, SessionAddon } from '@/types/estimator';

type BookingType = 'customer' | 'internal' | 'unavailable';
type SessionType = 'diy' | 'serviced';
type HolderType = 'casual' | 'customer' | 'internal';
type PaymentStatus = 'not_applicable' | 'pending' | 'paid' | 'partial';
type BookingStep = 'basic' | 'service' | 'duration' | 'addons' | 'summary';

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
  defaultStudioIds?: string[];
  defaultStartTime?: string;
  defaultEndTime?: string;
  existingBooking?: StudioBooking | null;
  operatingStart: string;
  operatingEnd: string;
  onBookingCreated?: () => void;
}

// Service icon mapping
const SERVICE_ICONS: Record<ServiceType, React.ElementType> = {
  audio_podcast: Mic,
  vodcast: Video,
  photoshoot: Camera,
  recording_session: Music,
};

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
  const day = getDay(date);
  const time24 = to24Hour(startTime);
  const hour = parseInt(time24.split(':')[0]);
  const isEvening = hour >= 16;
  
  if (day === 0 || day === 6) {
    return isEvening ? 'sat_sun_eve' : 'sat_sun_day';
  } else if (day >= 4) {
    return isEvening ? 'thu_fri_eve' : 'thu_fri_day';
  } else {
    return isEvening ? 'mon_wed_eve' : 'mon_wed_day';
  }
}

// Format duration as hours and minutes
function formatDuration(hours: number): string {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  if (minutes === 0) return `${wholeHours}h`;
  return `${wholeHours}h ${minutes}m`;
}

// Step labels for the stepper
const SERVICED_STEPS: { key: BookingStep; label: string }[] = [
  { key: 'basic', label: 'Details' },
  { key: 'service', label: 'Service' },
  { key: 'duration', label: 'Duration' },
  { key: 'addons', label: 'Add-ons' },
  { key: 'summary', label: 'Summary' },
];

// Convert 24-hour time to 12-hour format
function to12Hour(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

export function NewBookingModal({
  open,
  onClose,
  studios,
  diyRates,
  defaultDate,
  defaultStudioIds,
  defaultStartTime,
  defaultEndTime,
  existingBooking,
  operatingStart,
  operatingEnd,
  onBookingCreated,
}: NewBookingModalProps) {
  const { toast } = useToast();
  const createBooking = useCreateBooking();
  const updateBooking = useUpdateBooking();
  const { data: providerLevels = [] } = useProviderLevels();
  const { data: services = [] } = useServices();
  const { data: vodcastCameraAddons = [] } = useVodcastCameraAddons();
  const { data: sessionAddonsData = [] } = useSessionAddons();
  
  const isEditing = !!existingBooking;
  
  // Multi-step state
  const [step, setStep] = useState<BookingStep>('basic');
  
  // Basic info state
  const [bookingType, setBookingType] = useState<BookingType>('customer');
  const [sessionType, setSessionType] = useState<SessionType>('diy');
  const [date, setDate] = useState<Date | undefined>(defaultDate || new Date());
  const [startTime, setStartTime] = useState<string>('10:00 AM');
  const [endTime, setEndTime] = useState<string>('11:00 AM');
  const [repeatConfig, setRepeatConfig] = useState<RepeatConfig>(() => createDefaultRepeatConfig(defaultDate || new Date()));
  const [selectedStudios, setSelectedStudios] = useState<string[]>([]);
  const [holderType, setHolderType] = useState<HolderType>('casual');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [manualPrice, setManualPrice] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('not_applicable');
  const [notes, setNotes] = useState('');
  
  // Serviced session state (estimator-like)
  const [serviceType, setServiceType] = useState<ServiceType | null>(null);
  const [sessionDuration, setSessionDuration] = useState(1);
  const [crewAllocation, setCrewAllocation] = useState<CrewAllocation>({ lv1: 0, lv2: 1, lv3: 0 });
  const [cameraCount, setCameraCount] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [affiliateCode, setAffiliateCode] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when opened - or pre-fill with existing booking or prefill data
  useEffect(() => {
    if (open) {
      setStep('basic');
      
      if (existingBooking) {
        // Pre-populate for editing
        setBookingType(existingBooking.booking_type);
        setSessionType((existingBooking.session_type as SessionType) || 'diy');
        setDate(new Date(existingBooking.booking_date));
        setStartTime(to12Hour(existingBooking.start_time));
        setEndTime(to12Hour(existingBooking.end_time));
        setRepeatConfig(createDefaultRepeatConfig(new Date(existingBooking.booking_date)));
        setSelectedStudios([existingBooking.studio_id]);
        setHolderType(existingBooking.customer_name ? 'customer' : 'casual');
        setCustomerName(existingBooking.customer_name || '');
        setCustomerEmail(existingBooking.customer_email || '');
        setCustomerPhone(existingBooking.customer_phone || '');
        setManualPrice('');
        setPaymentStatus('not_applicable');
        setNotes(existingBooking.notes || '');
        setServiceType(null);
        setSessionDuration(1);
        setCrewAllocation({ lv1: 0, lv2: 1, lv3: 0 });
        setCameraCount(1);
        setSelectedAddons([]);
        setAffiliateCode('');
      } else {
        // New booking - use prefill data or defaults
        setBookingType('customer');
        setSessionType('diy');
        setDate(defaultDate || new Date());
        setStartTime(defaultStartTime ? to12Hour(defaultStartTime) : '10:00 AM');
        setEndTime(defaultEndTime ? to12Hour(defaultEndTime) : '11:00 AM');
        setRepeatConfig(createDefaultRepeatConfig(defaultDate || new Date()));
        setSelectedStudios(defaultStudioIds || []);
        setHolderType('casual');
        setCustomerName('');
        setCustomerEmail('');
        setCustomerPhone('');
        setManualPrice('');
        setPaymentStatus('not_applicable');
        setNotes('');
        setServiceType(null);
        setSessionDuration(1);
        setCrewAllocation({ lv1: 0, lv2: 1, lv3: 0 });
        setCameraCount(1);
        setSelectedAddons([]);
        setAffiliateCode('');
      }
    }
  }, [open, defaultDate, defaultStudioIds, defaultStartTime, defaultEndTime, existingBooking]);

  const timeSlots = useMemo(() => {
    return generateTimeSlots(operatingStart, operatingEnd);
  }, [operatingStart, operatingEnd]);

  const hours = useMemo(() => {
    return calculateHours(startTime, endTime);
  }, [startTime, endTime]);

  // Get the primary studio type for service filtering
  const primaryStudioType = useMemo(() => {
    if (selectedStudios.length === 0) return null;
    const studio = studios.find(s => s.id === selectedStudios[0]);
    return studio?.type || null;
  }, [selectedStudios, studios]);

  // Filter services based on selected studio
  const availableServices = useMemo(() => {
    return services.filter(s => s.is_active);
  }, [services]);

  // Filter session addons based on studio and session type
  const availableAddons = useMemo(() => {
    return sessionAddonsData.filter(addon => {
      if (!addon.is_active) return false;
      if (addon.applies_to_session_type && addon.applies_to_session_type !== sessionType) return false;
      return true;
    });
  }, [sessionAddonsData, sessionType]);

  // Calculate total crew members
  const totalCrew = useMemo(() => {
    return crewAllocation.lv1 + crewAllocation.lv2 + crewAllocation.lv3;
  }, [crewAllocation]);

  // Calculate price based on selections
  const calculatedPrice = useMemo(() => {
    if (!date || selectedStudios.length === 0) return 0;
    
    const slotType = getTimeSlotType(date, startTime);
    let total = 0;
    const durationHours = sessionType === 'serviced' ? sessionDuration : hours;
    
    if (durationHours <= 0) return 0;
    
    // Add studio rates
    for (const studioId of selectedStudios) {
      const rate = diyRates.find(
        r => r.studio_id === studioId && r.time_slots?.type === slotType
      );
      
      if (rate) {
        if (durationHours <= 1) {
          total += rate.first_hour_rate;
        } else if (rate.after_first_hour_rate !== null) {
          total += rate.first_hour_rate + (durationHours - 1) * rate.after_first_hour_rate;
        } else {
          total += durationHours * rate.first_hour_rate;
        }
      }
    }
    
    // Add provider rates for serviced sessions
    if (sessionType === 'serviced' && bookingType === 'customer') {
      for (const level of ['lv1', 'lv2', 'lv3'] as const) {
        const count = crewAllocation[level];
        if (count > 0) {
          const provider = providerLevels.find(p => p.level === level);
          if (provider) {
            total += Number(provider.hourly_rate) * durationHours * count;
          }
        }
      }
      
      // Add camera addon for vodcast
      if (serviceType === 'vodcast' && cameraCount > 0) {
        const cameraAddon = vodcastCameraAddons.find(c => c.cameras === cameraCount);
        if (cameraAddon) {
          total += Number(cameraAddon.customer_addon_amount);
        }
      }
      
      // Add selected session addons
      for (const addonId of selectedAddons) {
        const addon = sessionAddonsData.find(a => a.id === addonId);
        if (addon) {
          if (addon.is_hourly) {
            total += Number(addon.flat_amount) * durationHours;
          } else {
            total += Number(addon.flat_amount);
          }
        }
      }
    }
    
    return Math.round(total * 100) / 100;
  }, [date, selectedStudios, hours, startTime, sessionType, sessionDuration, crewAllocation, cameraCount, serviceType, selectedAddons, bookingType, diyRates, providerLevels, vodcastCameraAddons, sessionAddonsData]);

  const displayPrice = manualPrice !== '' ? parseFloat(manualPrice) || 0 : calculatedPrice;

  const handleStudioToggle = (studioId: string) => {
    setSelectedStudios(prev => 
      prev.includes(studioId)
        ? prev.filter(id => id !== studioId)
        : [...prev, studioId]
    );
  };

  const updateCrewLevel = (level: keyof CrewAllocation, delta: number) => {
    setCrewAllocation(prev => {
      const newValue = Math.max(0, prev[level] + delta);
      const newAllocation = { ...prev, [level]: newValue };
      
      // Ensure at least one crew member for serviced sessions
      const total = newAllocation.lv1 + newAllocation.lv2 + newAllocation.lv3;
      if (total === 0) {
        return prev;
      }
      
      return newAllocation;
    });
  };

  const toggleAddon = (addonId: string) => {
    setSelectedAddons(prev => 
      prev.includes(addonId)
        ? prev.filter(id => id !== addonId)
        : [...prev, addonId]
    );
  };

  // Get current step index
  const currentStepIndex = SERVICED_STEPS.findIndex(s => s.key === step);

  const handleNext = () => {
    if (sessionType === 'diy') {
      handleSubmit();
      return;
    }
    
    // Validate current step before proceeding
    if (step === 'basic') {
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
      setStep('service');
    } else if (step === 'service') {
      if (!serviceType) {
        toast({ title: 'Please select a service', variant: 'destructive' });
        return;
      }
      setStep('duration');
    } else if (step === 'duration') {
      if (totalCrew === 0) {
        toast({ title: 'Please add at least one crew member', variant: 'destructive' });
        return;
      }
      setStep('addons');
    } else if (step === 'addons') {
      setStep('summary');
    }
  };

  const handleBack = () => {
    const idx = SERVICED_STEPS.findIndex(s => s.key === step);
    if (idx > 0) {
      setStep(SERVICED_STEPS[idx - 1].key);
    }
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
    
    const durationToUse = sessionType === 'serviced' ? sessionDuration : hours;
    if (durationToUse <= 0) {
      toast({ title: 'Invalid duration', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      // Calculate end time based on duration for serviced sessions
      let bookingEndTime = endTime;
      if (sessionType === 'serviced') {
        const startTime24 = to24Hour(startTime);
        const [startH, startM] = startTime24.split(':').map(Number);
        const endMinutes = startH * 60 + startM + sessionDuration * 60;
        const endH = Math.floor(endMinutes / 60);
        const endM = endMinutes % 60;
        bookingEndTime = `${endH % 12 || 12}:${endM.toString().padStart(2, '0')} ${endH >= 12 ? 'PM' : 'AM'}`;
      }

      // Create bookings for each selected studio
      const bookingPromises = selectedStudios.map(studioId => 
        createBooking.mutateAsync({
          studio_id: studioId,
          booking_date: format(date, 'yyyy-MM-dd'),
          start_time: to24Hour(startTime),
          end_time: to24Hour(bookingEndTime),
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

      // If repeating, create additional bookings for each repeat date
      if (repeatConfig.frequency !== 'none') {
        const repeatDates = calculateRepeatDates(repeatConfig, date);
        
        // Skip the first date (already created above)
        for (const repeatDate of repeatDates.slice(1)) {
          for (const studioId of selectedStudios) {
            bookingPromises.push(
              createBooking.mutateAsync({
                studio_id: studioId,
                booking_date: format(repeatDate, 'yyyy-MM-dd'),
                start_time: to24Hour(startTime),
                end_time: to24Hour(bookingEndTime),
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

  const handleAddToCalendar = async () => {
    setIsSubmitting(true);
    
    try {
      // Create quote first
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .insert([{
          session_type: 'serviced' as const,
          hours: sessionDuration,
          camera_count: serviceType === 'vodcast' ? cameraCount : 1,
          customer_total: displayPrice,
          status: 'approved' as const,
          affiliate_code: affiliateCode || null,
          selections_json: JSON.parse(JSON.stringify({
            serviceType,
            crewAllocation,
            selectedAddons,
            studioIds: selectedStudios,
            date: date ? format(date, 'yyyy-MM-dd') : null,
            startTime,
            customerName,
            customerEmail,
          })),
          totals_json: { customerTotal: displayPrice },
        }])
        .select('id')
        .single();

      if (quoteError) throw quoteError;

      // Calculate end time based on duration
      const startTime24 = to24Hour(startTime);
      const [startH, startM] = startTime24.split(':').map(Number);
      const endMinutes = startH * 60 + startM + sessionDuration * 60;
      const endH = Math.floor(endMinutes / 60);
      const endM = endMinutes % 60;
      const endTime24 = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

      // Create bookings for each selected studio
      const bookingPromises = selectedStudios.map(studioId => 
        createBooking.mutateAsync({
          studio_id: studioId,
          booking_date: format(date!, 'yyyy-MM-dd'),
          start_time: startTime24,
          end_time: endTime24,
          booking_type: 'customer',
          status: 'confirmed',
          customer_name: holderType === 'customer' ? customerName : null,
          customer_email: holderType === 'customer' ? customerEmail : null,
          customer_phone: holderType === 'customer' ? customerPhone : null,
          session_type: 'serviced',
          notes: notes || null,
          quote_id: quote.id,
          created_by: null,
        })
      );

      await Promise.all(bookingPromises);
      
      toast({ title: 'Booking added to calendar!' });
      onBookingCreated?.();
      onClose();
    } catch (error) {
      console.error('Failed to add to calendar:', error);
      toast({ 
        title: 'Failed to add booking', 
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveToDrafts = async () => {
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('quotes')
        .insert([{
          session_type: 'serviced' as const,
          hours: sessionDuration,
          camera_count: serviceType === 'vodcast' ? cameraCount : 1,
          customer_total: displayPrice,
          status: 'draft' as const,
          affiliate_code: affiliateCode || null,
          selections_json: JSON.parse(JSON.stringify({
            serviceType,
            crewAllocation,
            selectedAddons,
            studioIds: selectedStudios,
            date: date ? format(date, 'yyyy-MM-dd') : null,
            startTime,
            customerName,
            customerEmail,
            notes,
          })),
          totals_json: { customerTotal: displayPrice },
        }]);

      if (error) throw error;
      
      toast({ title: 'Quote saved as draft!' });
      onClose();
    } catch (error) {
      console.error('Failed to save draft:', error);
      toast({ 
        title: 'Failed to save draft', 
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine if we should show the multi-step flow
  const isMultiStep = bookingType === 'customer' && sessionType === 'serviced' && !isEditing;

  // Get dialog title based on step
  const getDialogTitle = () => {
    if (isEditing) return 'Edit booking';
    if (!isMultiStep) return 'New booking';
    switch (step) {
      case 'basic': return 'New booking';
      case 'service': return 'Select service';
      case 'duration': return 'Duration & crew';
      case 'addons': return 'Add-ons';
      case 'summary': return 'Booking summary';
      default: return 'New booking';
    }
  };

  // Handle update booking
  const handleUpdateBooking = async () => {
    if (!existingBooking || !date) return;
    
    setIsSubmitting(true);
    
    try {
      // Calculate end time based on duration for serviced sessions
      let bookingEndTime = endTime;
      if (sessionType === 'serviced') {
        const startTime24 = to24Hour(startTime);
        const [startH, startM] = startTime24.split(':').map(Number);
        const endMinutes = startH * 60 + startM + sessionDuration * 60;
        const endH = Math.floor(endMinutes / 60);
        const endM = endMinutes % 60;
        bookingEndTime = `${endH % 12 || 12}:${endM.toString().padStart(2, '0')} ${endH >= 12 ? 'PM' : 'AM'}`;
      }
      
      await updateBooking.mutateAsync({
        id: existingBooking.id,
        booking_date: format(date, 'yyyy-MM-dd'),
        start_time: to24Hour(startTime),
        end_time: to24Hour(bookingEndTime),
        booking_type: bookingType,
        customer_name: holderType === 'customer' ? customerName : null,
        customer_email: holderType === 'customer' ? customerEmail : null,
        customer_phone: holderType === 'customer' ? customerPhone : null,
        session_type: bookingType === 'customer' ? sessionType : null,
        notes: notes || null,
      });
      
      toast({ title: 'Booking updated successfully' });
      onBookingCreated?.();
      onClose();
    } catch (error) {
      console.error('Failed to update booking:', error);
      toast({ 
        title: 'Failed to update booking', 
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
            {getDialogTitle()}
          </DialogTitle>
          
          {/* Stepper for multi-step flow */}
          {isMultiStep && (
            <div className="flex items-center justify-center gap-1 pt-4">
              {SERVICED_STEPS.map((s, idx) => {
                const isActive = s.key === step;
                const isCompleted = idx < currentStepIndex;
                return (
                  <div key={s.key} className="flex items-center">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                        isActive && "bg-primary text-primary-foreground",
                        isCompleted && "bg-primary/20 text-primary",
                        !isActive && !isCompleted && "bg-muted text-muted-foreground"
                      )}
                    >
                      {isCompleted ? <Check className="h-4 w-4" /> : idx + 1}
                    </div>
                    {idx < SERVICED_STEPS.length - 1 && (
                      <div 
                        className={cn(
                          "w-8 h-0.5 mx-1",
                          idx < currentStepIndex ? "bg-primary/40" : "bg-muted"
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </DialogHeader>

        <div className="space-y-6">
          {/* STEP: BASIC */}
          {step === 'basic' && (
            <>
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

              {/* Session Type */}
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
                  {/* Only show end time for DIY sessions */}
                  {sessionType === 'diy' && (
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
                  )}
                </div>
                {sessionType === 'diy' && hours > 0 && (
                  <p className="text-xs text-muted-foreground">{hours} hour{hours !== 1 ? 's' : ''}</p>
                )}
              </div>

              {/* Repeat */}
              <RepeatOptions
                config={repeatConfig}
                onChange={setRepeatConfig}
                startDate={date || new Date()}
                startTime={startTime}
              />

              {/* Spaces */}
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

              {/* Price & Payment - Only for DIY */}
              {bookingType === 'customer' && sessionType === 'diy' && (
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
            </>
          )}

          {/* STEP: SERVICE SELECTION */}
          {step === 'service' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">What type of session is this?</p>
              <div className="grid gap-3">
                {availableServices.map(service => {
                  const Icon = SERVICE_ICONS[service.type] || Video;
                  const isSelected = serviceType === service.type;
                  return (
                    <Card
                      key={service.id}
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md",
                        isSelected && "ring-2 ring-primary"
                      )}
                      onClick={() => setServiceType(service.type)}
                    >
                      <CardHeader className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-10 w-10 rounded-md flex items-center justify-center",
                            isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                          )}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-sm">{service.name}</CardTitle>
                            {service.description && (
                              <CardDescription className="text-xs">{service.description}</CardDescription>
                            )}
                          </div>
                          {isSelected && (
                            <Check className="h-5 w-5 text-primary" />
                          )}
                        </div>
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP: DURATION & CREW */}
          {step === 'duration' && (
            <div className="space-y-6">
              {/* Duration Slider */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Session duration</Label>
                  <span className="text-lg font-semibold">{formatDuration(sessionDuration)}</span>
                </div>
                <Slider
                  value={[sessionDuration]}
                  onValueChange={([value]) => setSessionDuration(value)}
                  min={1}
                  max={8}
                  step={0.5}
                  className="py-4"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1h</span>
                  <span>8h</span>
                </div>
              </div>

              <Separator />

              {/* Crew Allocation */}
              <div className="space-y-4">
                <Label>Production crew</Label>
                <p className="text-xs text-muted-foreground">
                  At least one crew member is required for serviced sessions.
                </p>
                
                {(['lv1', 'lv2', 'lv3'] as const).map(level => {
                  const provider = providerLevels.find(p => p.level === level);
                  const count = crewAllocation[level];
                  const levelLabels = { lv1: 'Entry Level', lv2: 'Experienced', lv3: 'Expert' };
                  
                  return (
                    <div key={level} className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <p className="text-sm font-medium">{levelLabels[level]}</p>
                        <p className="text-xs text-muted-foreground">
                          ${provider?.hourly_rate || 0}/hr
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateCrewLevel(level, -1)}
                          disabled={count === 0 || (totalCrew === 1 && count === 1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center font-medium">{count}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateCrewLevel(level, 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Camera Angles (for vodcast) */}
              {serviceType === 'vodcast' && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <Label>Camera angles</Label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4].map(count => (
                        <Button
                          key={count}
                          variant={cameraCount === count ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCameraCount(count)}
                          className="flex-1"
                        >
                          {count} {count === 1 ? 'cam' : 'cams'}
                        </Button>
                      ))}
                    </div>
                    {cameraCount > 0 && (
                      <p className="text-xs text-muted-foreground">
                        +${vodcastCameraAddons.find(c => c.cameras === cameraCount)?.customer_addon_amount || 0} one-time fee
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP: ADD-ONS */}
          {step === 'addons' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Select any additional services.</p>
              
              {availableAddons.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No add-ons available</p>
              ) : (
                <div className="space-y-3">
                  {availableAddons.map(addon => {
                    const isSelected = selectedAddons.includes(addon.id);
                    return (
                      <Card
                        key={addon.id}
                        className={cn(
                          "cursor-pointer transition-all",
                          isSelected && "ring-2 ring-primary"
                        )}
                        onClick={() => toggleAddon(addon.id)}
                      >
                        <CardHeader className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-sm">{addon.name}</CardTitle>
                              {addon.description && (
                                <CardDescription className="text-xs">{addon.description}</CardDescription>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">
                                +${addon.flat_amount}{addon.is_hourly ? '/hr' : ''}
                              </Badge>
                              {isSelected && <Check className="h-4 w-4 text-primary" />}
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP: SUMMARY */}
          {step === 'summary' && (
            <div className="space-y-4">
              {/* Session Details */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Session Type</span>
                    <span>EXP Session (Serviced)</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Service</span>
                    <span>{services.find(s => s.type === serviceType)?.name || serviceType}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Date</span>
                    <span>{date ? format(date, 'MMM d, yyyy') : '-'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Start Time</span>
                    <span>{startTime}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Duration</span>
                    <span>{formatDuration(sessionDuration)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Spaces</span>
                    <span>{selectedStudios.map(id => studios.find(s => s.id === id)?.name).join(', ') || '-'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Crew</span>
                    <span>
                      {crewAllocation.lv1 > 0 && `${crewAllocation.lv1}× Entry`}
                      {crewAllocation.lv2 > 0 && `${crewAllocation.lv1 > 0 ? ', ' : ''}${crewAllocation.lv2}× Exp`}
                      {crewAllocation.lv3 > 0 && `${(crewAllocation.lv1 > 0 || crewAllocation.lv2 > 0) ? ', ' : ''}${crewAllocation.lv3}× Expert`}
                    </span>
                  </div>
                  {serviceType === 'vodcast' && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Cameras</span>
                      <span>{cameraCount}</span>
                    </div>
                  )}
                  {selectedAddons.length > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Add-ons</span>
                      <span>{selectedAddons.map(id => sessionAddonsData.find(a => a.id === id)?.name).join(', ')}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Total */}
              <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                <span className="font-medium">Estimated Total</span>
                <span className="text-2xl font-bold">${displayPrice.toFixed(2)}</span>
              </div>

              {/* Affiliate Code */}
              <div className="space-y-2">
                <Label>Affiliate code (optional)</Label>
                <Input
                  value={affiliateCode}
                  onChange={(e) => setAffiliateCode(e.target.value)}
                  placeholder="Enter code"
                />
              </div>
            </div>
          )}

          {/* Running Total (for multi-step) */}
          {isMultiStep && step !== 'basic' && step !== 'summary' && (
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Running total</span>
              <span className="font-semibold">${calculatedPrice.toFixed(2)}</span>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4">
          {/* Edit mode: single Save Changes button */}
          {isEditing && (
            <>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button onClick={handleUpdateBooking} disabled={isSubmitting}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
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
            </>
          )}
          
          {/* DIY or non-customer booking: single-step (not editing) */}
          {!isMultiStep && !isEditing && (
            <>
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
            </>
          )}

          {/* Serviced/Multi-step: show Back/Next or final buttons */}
          {isMultiStep && (
            <div className="flex w-full justify-between items-center">
              <div>
                {step !== 'basic' && (
                  <Button variant="ghost" onClick={handleBack} disabled={isSubmitting}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                )}
              </div>
              
              <div className="flex gap-2">
                {step === 'summary' ? (
                  <>
                    <Button variant="outline" onClick={handleSaveToDrafts} disabled={isSubmitting}>
                      <Save className="h-4 w-4 mr-2" />
                      Save to Drafts
                    </Button>
                    <Button onClick={handleAddToCalendar} disabled={isSubmitting}>
                      <CalendarPlus className="h-4 w-4 mr-2" />
                      {isSubmitting ? 'Adding...' : 'Add to Calendar'}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                      Cancel
                    </Button>
                    <Button onClick={handleNext} disabled={isSubmitting}>
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
