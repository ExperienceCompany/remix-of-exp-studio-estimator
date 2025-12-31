import { useState, useMemo, useEffect, useCallback } from 'react';
import { format, getDay, parseISO, addDays } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
  AlertCircle,
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
  RotateCcw,
  Search,
  UserPlus,
  Building2,
  ChevronsUpDown,
  Trash2,
  Repeat,
} from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { useProviderLevels, useServices, useVodcastCameraAddons, useSessionAddons, useEditingMenu } from '@/hooks/useEstimatorData';
import { Switch } from '@/components/ui/switch';
import { useCreateBooking, useUpdateBooking, useCancelBooking, useStudioBookings, useUpdateSeriesFromDate, useUpdateEntireSeries, StudioBooking } from '@/hooks/useStudioBookings';
import { AffiliateCodeInput } from '@/components/AffiliateCodeInput';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RepeatOptions, RepeatConfig, createDefaultRepeatConfig, calculateRepeatDates } from './RepeatOptions';
import { useProfiles, useCreateProfile, Profile } from '@/hooks/useProfiles';
import { useAuth } from '@/hooks/useAuth';
import { validateBookingCustomer } from '@/lib/bookingValidation';
import type { TimeSlotType, ServiceType, CrewAllocation, SessionAddon, EditingItem } from '@/types/estimator';

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
  duplicatingFrom?: StudioBooking | null;
  operatingStart: string;
  operatingEnd: string;
  editScope?: 'occurrence' | 'from_here' | 'series' | null;
  onBookingCreated?: () => void;
  onDurationChange?: (studioIds: string[], newStartTime: string, newEndTime: string) => void;
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
  // Handle edge cases where time might not have expected format
  if (!time12 || !time12.includes(' ')) {
    console.error('Invalid time format:', time12);
    return '00:00';
  }
  const [time, period] = time12.split(' ');
  if (!time || !period) {
    console.error('Invalid time format:', time12);
    return '00:00';
  }
  const [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) {
    console.error('Invalid time values:', time12);
    return '00:00';
  }
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

// Services with only one valid studio option - auto-select
const SINGLE_STUDIO_SERVICES: Record<string, string> = {
  photoshoot: 'multimedia_studio',
  recording_session: 'audio_studio',
  audio_podcast: 'podcast_room',
};

// Services with multiple studio options - require manual selection
const MULTI_STUDIO_SERVICES: Record<string, string[]> = {
  vodcast: ['multimedia_studio', 'full_studio_buyout'],
};

// Step labels for the stepper
const SERVICED_STEPS: { key: BookingStep; label: string }[] = [
  { key: 'basic', label: 'Details' },
  { key: 'service', label: 'Service' },
  { key: 'duration', label: 'Duration' },
  { key: 'addons', label: 'Add-ons' },
  { key: 'summary', label: 'Summary' },
];

const DIY_STEPS: { key: BookingStep; label: string }[] = [
  { key: 'basic', label: 'Details' },
  { key: 'addons', label: 'Add-ons' },
];

// Convert 24-hour time to 12-hour format
function to12Hour(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

// Days of week for repeat pattern text
const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Generate human-readable repeat pattern text from RepeatConfig
function getRepeatPatternText(config: RepeatConfig, startDate: Date): string {
  if (config.frequency === 'none') return '';
  
  switch (config.frequency) {
    case 'daily':
      if (config.dailyRule === 'every_n_days') {
        return config.dailyInterval === 1 ? 'Daily' : `Every ${config.dailyInterval} days`;
      }
      return config.dailyRule === 'weekdays' ? 'Every weekday' : 'Every weekend';
      
    case 'weekly':
      const dayName = DAYS_OF_WEEK[config.weeklyRule.dayOfWeek];
      return config.weeklyRule.interval === 1 
        ? `Weekly on ${dayName}s` 
        : `Every ${config.weeklyRule.interval} weeks on ${dayName}s`;
      
    case 'monthly':
      if (config.monthlyRule.type === 'day_of_month') {
        return config.monthlyRule.interval === 1
          ? `Monthly on day ${config.monthlyRule.dayOfMonth}`
          : `Every ${config.monthlyRule.interval} months on day ${config.monthlyRule.dayOfMonth}`;
      }
      return `Monthly on the ${config.monthlyRule.nthWeek} ${DAYS_OF_WEEK[config.monthlyRule.dayOfWeek]}`;
      
    case 'yearly':
      return 'Yearly';
      
    default:
      return '';
  }
}

// Parse existing repeat pattern text back into a RepeatConfig
function parseRepeatPatternToConfig(pattern: string, startDate: Date): RepeatConfig | null {
  const defaultConfig = createDefaultRepeatConfig(startDate);
  
  // Daily patterns
  if (pattern === 'Daily') {
    return { ...defaultConfig, frequency: 'daily', dailyRule: 'every_n_days', dailyInterval: 1 };
  }
  if (pattern === 'Every weekday') {
    return { ...defaultConfig, frequency: 'daily', dailyRule: 'weekdays' };
  }
  if (pattern === 'Every weekend') {
    return { ...defaultConfig, frequency: 'daily', dailyRule: 'weekends' };
  }
  const everyNDaysMatch = pattern.match(/^Every (\d+) days$/);
  if (everyNDaysMatch) {
    return { ...defaultConfig, frequency: 'daily', dailyRule: 'every_n_days', dailyInterval: parseInt(everyNDaysMatch[1]) };
  }
  
  // Weekly patterns
  const weeklyMatch = pattern.match(/^Weekly on (\w+)s$/);
  if (weeklyMatch) {
    const dayIndex = DAYS_OF_WEEK.indexOf(weeklyMatch[1]);
    return { ...defaultConfig, frequency: 'weekly', weeklyRule: { interval: 1, dayOfWeek: dayIndex >= 0 ? dayIndex : getDay(startDate) } };
  }
  const everyNWeeksMatch = pattern.match(/^Every (\d+) weeks on (\w+)s$/);
  if (everyNWeeksMatch) {
    const dayIndex = DAYS_OF_WEEK.indexOf(everyNWeeksMatch[2]);
    return { ...defaultConfig, frequency: 'weekly', weeklyRule: { interval: parseInt(everyNWeeksMatch[1]), dayOfWeek: dayIndex >= 0 ? dayIndex : getDay(startDate) } };
  }
  
  // Monthly patterns
  const monthlyDayMatch = pattern.match(/^Monthly on day (\d+)$/);
  if (monthlyDayMatch) {
    return { 
      ...defaultConfig, 
      frequency: 'monthly', 
      monthlyRule: { ...defaultConfig.monthlyRule, type: 'day_of_month', dayOfMonth: parseInt(monthlyDayMatch[1]), interval: 1 } 
    };
  }
  const everyNMonthsMatch = pattern.match(/^Every (\d+) months on day (\d+)$/);
  if (everyNMonthsMatch) {
    return { 
      ...defaultConfig, 
      frequency: 'monthly', 
      monthlyRule: { ...defaultConfig.monthlyRule, type: 'day_of_month', dayOfMonth: parseInt(everyNMonthsMatch[2]), interval: parseInt(everyNMonthsMatch[1]) } 
    };
  }
  const monthlyNthWeekdayMatch = pattern.match(/^Monthly on the (\w+) (\w+)$/);
  if (monthlyNthWeekdayMatch) {
    const dayIndex = DAYS_OF_WEEK.indexOf(monthlyNthWeekdayMatch[2]);
    return { 
      ...defaultConfig, 
      frequency: 'monthly', 
      monthlyRule: { 
        ...defaultConfig.monthlyRule, 
        type: 'nth_weekday', 
        nthWeek: monthlyNthWeekdayMatch[1], 
        dayOfWeek: dayIndex >= 0 ? dayIndex : getDay(startDate),
        interval: 1 
      } 
    };
  }
  
  // Yearly pattern
  if (pattern === 'Yearly') {
    return { ...defaultConfig, frequency: 'yearly' };
  }
  
  // Couldn't parse - return null
  return null;
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
  duplicatingFrom,
  operatingStart,
  operatingEnd,
  editScope,
  onBookingCreated,
  onDurationChange,
}: NewBookingModalProps) {
  const { toast } = useToast();
  const createBooking = useCreateBooking();
  const updateBooking = useUpdateBooking();
  const updateSeriesFromDate = useUpdateSeriesFromDate();
  const updateEntireSeries = useUpdateEntireSeries();
  const cancelBooking = useCancelBooking();
  const { data: providerLevels = [] } = useProviderLevels();
  const { data: services = [] } = useServices();
  const { data: vodcastCameraAddons = [] } = useVodcastCameraAddons();
  const { data: sessionAddonsData = [] } = useSessionAddons();
  const { data: editingMenuData = [] } = useEditingMenu();
  // Profiles hook for user search
  const [profileSearch, setProfileSearch] = useState('');
  const { data: profiles = [] } = useProfiles(profileSearch);
  const createProfile = useCreateProfile();
  
  // Auth hook to check if user is admin
  const { user: currentUser, isAdmin } = useAuth();
  
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
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [isCreatingNewUser, setIsCreatingNewUser] = useState(false);
  const [holderPopoverOpen, setHolderPopoverOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [newUserFirstName, setNewUserFirstName] = useState('');
  const [newUserLastName, setNewUserLastName] = useState('');
  const [newUserOrganization, setNewUserOrganization] = useState('');
  const [manualPrice, setManualPrice] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('not_applicable');
  const [notes, setNotes] = useState('');
  const [details, setDetails] = useState('');
  const [title, setTitle] = useState('');
  const [peopleCount, setPeopleCount] = useState<number>(1);
  
  // Serviced session state (estimator-like)
  const [serviceType, setServiceType] = useState<ServiceType | null>(null);
  const [sessionDuration, setSessionDuration] = useState(1);
  const [crewAllocation, setCrewAllocation] = useState<CrewAllocation>({ lv1: 0, lv2: 1, lv3: 0 });
  const [cameraCount, setCameraCount] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [affiliateCode, setAffiliateCode] = useState('');
  const [affiliateName, setAffiliateName] = useState<string | null>(null);
  const [editingItems, setEditingItems] = useState<EditingItem[]>([]);
  const [addonHours, setAddonHours] = useState<Record<string, number>>({});
  const [wantsEditing, setWantsEditing] = useState<boolean | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [overlapError, setOverlapError] = useState<string | null>(null);
  const [linkedQuote, setLinkedQuote] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // Availability conflict state for service step validation
  const [availabilityConflict, setAvailabilityConflict] = useState<{
    hasConflict: boolean;
    message?: string;
    suggestedTimes?: { before: string[]; after: string[] };
    nextDayTime?: { date: Date; time: string };
  } | null>(null);
  const [showDateTimeEditor, setShowDateTimeEditor] = useState(false);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  
  // Track last DIY duration for persistence when changing start time
  const [lastDiyDuration, setLastDiyDuration] = useState<number>(60); // minutes
  
  // Track existing repeat info for editing display
  const [existingRepeatInfo, setExistingRepeatInfo] = useState<{
    series_id: string | null;
    pattern: string | null;
  } | null>(null);
  
  // Track loading state for linked quote to prevent race condition
  const [isLoadingLinkedQuote, setIsLoadingLinkedQuote] = useState(false);

  // Fetch linked quote when editing a booking with a quote_id
  useEffect(() => {
    if (open && existingBooking?.quote_id) {
      setIsLoadingLinkedQuote(true);
      supabase
        .from('quotes')
        .select('*')
        .eq('id', existingBooking.quote_id)
        .maybeSingle()
        .then(({ data }) => {
          setLinkedQuote(data);
          setIsLoadingLinkedQuote(false);
        });
    } else {
      setLinkedQuote(null);
      setIsLoadingLinkedQuote(false);
    }
  }, [open, existingBooking?.quote_id]);

  // Force Expert (Lv3) crew for serviced photoshoots
  const isPhotoshootServiced = sessionType === 'serviced' && serviceType === 'photoshoot';
  useEffect(() => {
    if (isPhotoshootServiced) {
      setCrewAllocation({ lv1: 0, lv2: 0, lv3: 1 });
    }
  }, [isPhotoshootServiced]);

  // Auto-add Simple Retouch Edit with 5 edits when wantsEditing is true for serviced photoshoots
  useEffect(() => {
    if (isPhotoshootServiced && wantsEditing === true && editingMenuData.length > 0) {
      const simpleRetouchItem = editingMenuData.find(item => item.name === 'Simple Retouch Edit');
      const alreadySelected = editingItems.some(e => e.name === 'Simple Retouch Edit');
      
      if (simpleRetouchItem && !alreadySelected) {
        setEditingItems(prev => [
          ...prev,
          {
            id: simpleRetouchItem.id,
            name: simpleRetouchItem.name,
            category: simpleRetouchItem.category,
            quantity: 5, // 5 edit minimum for regular serviced photoshoot
            basePrice: Number(simpleRetouchItem.base_price),
            customerPrice: Number(simpleRetouchItem.customer_price || simpleRetouchItem.base_price * 2),
            incrementPrice: null,
          },
        ]);
      }
    }
  }, [isPhotoshootServiced, wantsEditing, editingMenuData]);

  // Auto-add Long Form Simple when wantsEditing is true for vodcast
  useEffect(() => {
    if (sessionType === 'serviced' && serviceType === 'vodcast' && wantsEditing === true && editingMenuData.length > 0) {
      const longFormItem = editingMenuData.find(item => item.name === 'Long Form Simple');
      const alreadySelected = editingItems.some(e => e.name === 'Long Form Simple');
      
      if (longFormItem && !alreadySelected) {
        setEditingItems(prev => [
          ...prev,
          {
            id: longFormItem.id,
            name: longFormItem.name,
            category: longFormItem.category,
            quantity: 1,
            basePrice: Number(longFormItem.base_price),
            customerPrice: Number(longFormItem.customer_price || longFormItem.base_price * 2),
            incrementPrice: longFormItem.increment_price ? Number(longFormItem.increment_price) : null,
            crewLevel: 'lv2', // Default to Lv2
          },
        ]);
      }
    }
  }, [sessionType, serviceType, wantsEditing, editingMenuData]);

  // Reset form when opened - or pre-fill with existing booking or prefill data
  useEffect(() => {
    if (open) {
      setStep('basic');
      setProfileSearch('');
      setIsCreatingNewUser(false);
      setHolderPopoverOpen(false);
      setNewUserFirstName('');
      setNewUserLastName('');
      setNewUserOrganization('');
      
      // For non-admin users, pre-select their own profile
      if (currentUser && !isAdmin && !existingBooking) {
        // Fetch the user's profile and pre-select it
        supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .maybeSingle()
          .then(({ data: userProfile }) => {
            if (userProfile) {
              setSelectedProfile(userProfile as Profile);
              setHolderType('customer');
              setCustomerName(userProfile.full_name || '');
              setCustomerEmail(userProfile.email || '');
              setCustomerPhone(userProfile.phone || '');
            } else {
              setSelectedProfile(null);
            }
          });
      } else {
        setSelectedProfile(null);
      }
      
      if (existingBooking) {
        // Pre-populate for editing
        setBookingType(existingBooking.booking_type);
        setSessionType((existingBooking.session_type as SessionType) || 'diy');
        setDate(parseISO(existingBooking.booking_date));
        setStartTime(to12Hour(existingBooking.start_time));
        setEndTime(to12Hour(existingBooking.end_time));
        // Initialize repeat config - parse existing pattern if editing series
        const bookingDate = parseISO(existingBooking.booking_date);
        if (existingBooking.repeat_pattern && existingBooking.repeat_series_id) {
          const parsedConfig = parseRepeatPatternToConfig(existingBooking.repeat_pattern, bookingDate);
          
          // Fetch the actual series end date from the last booking in the series
          supabase
            .from('studio_bookings')
            .select('booking_date')
            .eq('repeat_series_id', existingBooking.repeat_series_id)
            .neq('status', 'cancelled')
            .order('booking_date', { ascending: false })
            .limit(1)
            .maybeSingle()
            .then(({ data: lastBooking }) => {
              if (parsedConfig && lastBooking) {
                const lastDate = parseISO(lastBooking.booking_date);
                setRepeatConfig({
                  ...parsedConfig,
                  endType: 'by_date',
                  endByDate: lastDate,
                });
              } else if (parsedConfig) {
                setRepeatConfig(parsedConfig);
              } else {
                setRepeatConfig(createDefaultRepeatConfig(bookingDate));
              }
            });
        } else {
          setRepeatConfig(createDefaultRepeatConfig(bookingDate));
        }
        setSelectedStudios([existingBooking.studio_id]);
        setHolderType(existingBooking.customer_name ? 'customer' : 'casual');
        setCustomerName(existingBooking.customer_name || '');
        setCustomerEmail(existingBooking.customer_email || '');
        setCustomerPhone(existingBooking.customer_phone || '');
        setManualPrice('');
        setPaymentStatus('not_applicable');
        setNotes(existingBooking.notes || '');
        setDetails(existingBooking.details || '');
        setTitle(existingBooking.title || '');
        setPeopleCount(existingBooking.people_count || 1);
        
        // Store repeat info from existing booking for display
        setExistingRepeatInfo({
          series_id: existingBooking.repeat_series_id || null,
          pattern: existingBooking.repeat_pattern || null
        });
        
        // Restore session details from linked quote if available
        if (linkedQuote) {
          const sel = linkedQuote.selections_json || {};
          
          // Service & duration
          setServiceType(sel.serviceType || null);
          setSessionDuration(linkedQuote.hours || sel.sessionDuration || 1);
          setCameraCount(linkedQuote.camera_count || sel.cameraCount || 1);
          
          // Crew allocation
          if (sel.crewAllocation) {
            setCrewAllocation({
              lv1: sel.crewAllocation.lv1 || 0,
              lv2: sel.crewAllocation.lv2 || 0,
              lv3: sel.crewAllocation.lv3 || 0,
            });
          } else {
            setCrewAllocation({ lv1: 0, lv2: 1, lv3: 0 });
          }
          
          // Add-ons
          setSelectedAddons(sel.selectedAddons || []);
          setEditingItems(sel.editingItems || []);
          setAddonHours(sel.addonHours || {});
          
          // Affiliate code
          setAffiliateCode(linkedQuote.affiliate_code || sel.affiliateCode || '');
          
          // Holder type
          if (sel.holderType) setHolderType(sel.holderType);
          
          // Infer wantsEditing from editingItems if not explicitly set
          if (sel.wantsEditing === true || sel.wantsEditing === false) {
            setWantsEditing(sel.wantsEditing);
          } else if (sel.editingItems && sel.editingItems.some((item: any) => 
            item.category === 'photo_editing' || 
            item.name?.toLowerCase().includes('retouch') ||
            item.name?.toLowerCase().includes('edit')
          )) {
            setWantsEditing(true);
          }
        } else if (existingBooking.quote_id && isLoadingLinkedQuote) {
          // Quote is still loading - don't set defaults yet, wait for linkedQuote to load
          // The useEffect will re-run when linkedQuote becomes available
        } else {
          // No quote to load (no quote_id) - reset to defaults
          setServiceType(null);
          setSessionDuration(1);
          setCrewAllocation({ lv1: 0, lv2: 1, lv3: 0 });
          setCameraCount(1);
          setSelectedAddons([]);
          setAffiliateCode('');
          setEditingItems([]);
          setAddonHours({});
        }
      } else if (duplicatingFrom) {
        // Pre-fill from duplicating booking (new booking with copied data)
        setBookingType(duplicatingFrom.booking_type);
        setSessionType((duplicatingFrom.session_type as SessionType) || 'diy');
        setDate(defaultDate || new Date()); // Use prefill date, not source date
        setStartTime(defaultStartTime ? to12Hour(defaultStartTime) : to12Hour(duplicatingFrom.start_time));
        setEndTime(defaultEndTime ? to12Hour(defaultEndTime) : to12Hour(duplicatingFrom.end_time));
        setRepeatConfig(createDefaultRepeatConfig(defaultDate || new Date()));
        setSelectedStudios(defaultStudioIds || [duplicatingFrom.studio_id]);
        setHolderType(duplicatingFrom.customer_name ? 'customer' : 'casual');
        setCustomerName(duplicatingFrom.customer_name || '');
        setCustomerEmail(duplicatingFrom.customer_email || '');
        setCustomerPhone(duplicatingFrom.customer_phone || '');
        setManualPrice('');
        setPaymentStatus('not_applicable');
        setNotes(duplicatingFrom.notes || '');
        setDetails(duplicatingFrom.details || '');
        setTitle(duplicatingFrom.title || '');
        setPeopleCount(duplicatingFrom.people_count || 1);
        setExistingRepeatInfo(null); // New booking, no repeat series
        
        // Fetch and restore session details from linked quote if available
        if (duplicatingFrom.quote_id) {
          supabase
            .from('quotes')
            .select('*')
            .eq('id', duplicatingFrom.quote_id)
            .maybeSingle()
            .then(({ data: dupQuote }) => {
              if (dupQuote) {
                const sel = (dupQuote.selections_json as Record<string, unknown>) || {};
                
                // Service & duration
                setServiceType((sel.serviceType as ServiceType) || null);
                setSessionDuration(dupQuote.hours || (sel.sessionDuration as number) || 1);
                setCameraCount(dupQuote.camera_count || (sel.cameraCount as number) || 1);
                
                // Crew allocation
                if (sel.crewAllocation) {
                  const crew = sel.crewAllocation as Record<string, number>;
                  setCrewAllocation({
                    lv1: crew.lv1 || 0,
                    lv2: crew.lv2 || 0,
                    lv3: crew.lv3 || 0,
                  });
                } else {
                  setCrewAllocation({ lv1: 0, lv2: 1, lv3: 0 });
                }
                
                // Add-ons
                setSelectedAddons((sel.selectedAddons as string[]) || []);
                setEditingItems((sel.editingItems as EditingItem[]) || []);
                setAddonHours((sel.addonHours as Record<string, number>) || {});
                
                // Affiliate code
                setAffiliateCode(dupQuote.affiliate_code || (sel.affiliateCode as string) || '');
                
                // Holder type & wantsEditing
                if (sel.holderType) setHolderType(sel.holderType as HolderType);
                
                // Infer wantsEditing from editingItems if not explicitly set
                if (sel.wantsEditing === true || sel.wantsEditing === false) {
                  setWantsEditing(sel.wantsEditing as boolean);
                } else if (sel.editingItems && Array.isArray(sel.editingItems) && (sel.editingItems as any[]).some((item: any) => 
                  item.category === 'photo_editing' || 
                  item.name?.toLowerCase().includes('retouch') ||
                  item.name?.toLowerCase().includes('edit')
                )) {
                  setWantsEditing(true);
                }
              } else {
                // No linked quote - use defaults for service details
                setServiceType(null);
                setSessionDuration(1);
                setCrewAllocation({ lv1: 0, lv2: 1, lv3: 0 });
                setCameraCount(1);
                setSelectedAddons([]);
                setAffiliateCode('');
                setEditingItems([]);
                setAddonHours({});
                setWantsEditing(null);
              }
            });
        } else {
          // No linked quote - use defaults for service details
          setServiceType(null);
          setSessionDuration(1);
          setCrewAllocation({ lv1: 0, lv2: 1, lv3: 0 });
          setCameraCount(1);
          setSelectedAddons([]);
          setAffiliateCode('');
          setEditingItems([]);
          setAddonHours({});
          setWantsEditing(null);
        }
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
        setDetails('');
        setTitle('');
        setPeopleCount(1);
        setServiceType(null);
        setSessionDuration(1);
        setCrewAllocation({ lv1: 0, lv2: 1, lv3: 0 });
        setCameraCount(1);
        setSelectedAddons([]);
        setAffiliateCode('');
        setEditingItems([]);
        setAddonHours({});
        setWantsEditing(null);
        setExistingRepeatInfo(null);
      }
    }
  }, [open, defaultDate, defaultStudioIds, defaultStartTime, defaultEndTime, existingBooking, linkedQuote, duplicatingFrom, isLoadingLinkedQuote]);

  const timeSlots = useMemo(() => {
    return generateTimeSlots(operatingStart, operatingEnd);
  }, [operatingStart, operatingEnd]);

  const hours = useMemo(() => {
    return calculateHours(startTime, endTime);
  }, [startTime, endTime]);

  // Fetch all bookings for the selected date to check availability
  const { data: dateBookings } = useStudioBookings(
    undefined, // all studios
    date ? format(date, 'yyyy-MM-dd') : undefined,
    date ? format(date, 'yyyy-MM-dd') : undefined
  );

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
    // Check if any selected studio is Full Studio Buyout
    const hasFullStudioBuyout = selectedStudios.some(studioId => {
      const studio = studios.find(s => s.id === studioId);
      return studio?.type === 'full_studio_buyout';
    });
    
    return sessionAddonsData.filter(addon => {
      if (!addon.is_active) return false;
      // Hide service type addons (like Revisions) - they appear separately
      if (addon.addon_type === 'service') return false;
      if (addon.applies_to_session_type && addon.applies_to_session_type !== sessionType) return false;
      // Hide Set Design addon - it's auto-included for photoshoots, not user-selectable
      if (addon.name.includes('Set Design') || addon.name.includes('Photoshoot setup')) return false;
      // Hide Event Setup & Breakdown for non-Full Studio Buyout sessions
      if (addon.name.includes('Event Setup') && !hasFullStudioBuyout) return false;
      return true;
    });
  }, [sessionAddonsData, sessionType, selectedStudios, studios]);

  // Get auto-included addons (like Photoshoot setup fee) - serviced photoshoots only
  const autoIncludedAddons = useMemo(() => {
    return sessionAddonsData.filter(addon => {
      if (!addon.is_active) return false;
      // Photoshoot setup fee is auto-included for serviced photoshoots only
      if (sessionType === 'serviced' && serviceType === 'photoshoot' && 
          (addon.name.includes('Set Design') || addon.name.includes('Photoshoot setup'))) {
        return true;
      }
      return false;
    });
  }, [sessionAddonsData, sessionType, serviceType]);

  // Filter photo editing items (only for photoshoot)
  const photoEditingItems = useMemo(() => {
    if (serviceType !== 'photoshoot') return [];
    return editingMenuData.filter(item => item.category === 'photo' || item.category === 'photo_editing');
  }, [editingMenuData, serviceType]);

  // Filter video editing items (only for vodcast)
  const videoEditingItems = useMemo(() => {
    if (serviceType !== 'vodcast') return [];
    return editingMenuData.filter(item => item.category !== 'photo' && item.category !== 'photo_editing');
  }, [editingMenuData, serviceType]);

  // Filter revision addon (hourly)
  const revisionsAddon = useMemo(() => {
    return sessionAddonsData.find(addon => addon.is_active && addon.name === 'Revisions');
  }, [sessionAddonsData]);

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
      
      // Add auto-included addons (serviced only - like Set Design for photoshoots)
      for (const addon of autoIncludedAddons) {
        total += Number(addon.flat_amount);
      }

      // Add editing items (photo and video editing)
      for (const editItem of editingItems) {
        if (editItem.category === 'photo' || editItem.category === 'photo_editing') {
          // Photo editing: quantity × price
          total += editItem.quantity * editItem.customerPrice;
        } else {
          // Video editing: crew level multiplier pricing
          const crewLevel = editItem.crewLevel || 'lv2';
          const EDITING_CREW_MULTIPLIERS: Record<string, number> = { lv1: 0.75, lv2: 1, lv3: 1.25 };
          const multiplier = EDITING_CREW_MULTIPLIERS[crewLevel] || 1;
          total += Math.round(editItem.customerPrice * multiplier);
        }
      }
    }
    
    // Add selected session addons (for BOTH DIY and serviced sessions)
    for (const addonId of selectedAddons) {
      const addon = sessionAddonsData.find(a => a.id === addonId);
      if (addon) {
        if (addon.is_hourly) {
          const hrs = addonHours[addonId] || 1;
          total += Number(addon.flat_amount) * hrs;
        } else {
          total += Number(addon.flat_amount);
        }
      }
    }
    
    return Math.round(total * 100) / 100;
  }, [date, selectedStudios, hours, startTime, sessionType, sessionDuration, crewAllocation, cameraCount, serviceType, selectedAddons, bookingType, diyRates, providerLevels, vodcastCameraAddons, sessionAddonsData, autoIncludedAddons, editingItems, addonHours]);

  const displayPrice = manualPrice !== '' ? parseFloat(manualPrice) || 0 : calculatedPrice;

  // Compute end time based on start time + duration
  const computedEndTime = useMemo(() => {
    const durationHours = sessionType === 'serviced' ? sessionDuration : hours;
    if (durationHours <= 0) return startTime;
    
    const startTime24 = to24Hour(startTime);
    const [startH, startM] = startTime24.split(':').map(Number);
    const endMinutes = startH * 60 + startM + durationHours * 60;
    const endH = Math.floor(endMinutes / 60);
    const endM = Math.round(endMinutes % 60);
    const ampm = endH >= 12 ? 'PM' : 'AM';
    const hour12 = endH % 12 || 12;
    return `${hour12}:${endM.toString().padStart(2, '0')} ${ampm}`;
  }, [startTime, sessionDuration, hours, sessionType]);

  // Compute per-studio availability for the current date/time selection
  const studioAvailability = useMemo(() => {
    const BUFFER_MINUTES = 15;
    
    if (!date || !startTime) return {};
    
    const effectiveEndTime = sessionType === 'serviced' ? computedEndTime : endTime;
    if (!effectiveEndTime) return {};
    
    const startTime24 = to24Hour(startTime);
    const endTime24 = to24Hour(effectiveEndTime);
    const startMins = parseInt(startTime24.split(':')[0]) * 60 + parseInt(startTime24.split(':')[1]);
    const endMins = parseInt(endTime24.split(':')[0]) * 60 + parseInt(endTime24.split(':')[1]);
    
    if (startMins >= endMins) return {};
    
    const availability: Record<string, { available: boolean; conflictTime?: string }> = {};
    const buyoutStudio = studios.find(s => s.type === 'full_studio_buyout');
    
    for (const studio of studios) {
      // Check this studio's bookings for conflicts (with buffer)
      const studioBookings = dateBookings?.filter(b => 
        b.studio_id === studio.id && 
        b.status !== 'cancelled' &&
        (!existingBooking || b.id !== existingBooking.id)
      ) || [];
      
      let conflict: string | null = null;
      for (const booking of studioBookings) {
        const bStart = parseInt(booking.start_time.split(':')[0]) * 60 + parseInt(booking.start_time.split(':')[1]);
        const bEnd = parseInt(booking.end_time.split(':')[0]) * 60 + parseInt(booking.end_time.split(':')[1]);
        
        if (startMins < (bEnd + BUFFER_MINUTES) && endMins > (bStart - BUFFER_MINUTES)) {
          conflict = `${to12Hour(booking.start_time.slice(0, 5))} - ${to12Hour(booking.end_time.slice(0, 5))}`;
          break;
        }
      }
      
      // Check if Full Studio Buyout blocks this studio (with buffer)
      if (buyoutStudio && !conflict && studio.id !== buyoutStudio.id) {
        const buyoutBookings = dateBookings?.filter(b => 
          b.studio_id === buyoutStudio.id && 
          b.status !== 'cancelled' &&
          (!existingBooking || b.id !== existingBooking.id)
        ) || [];
        
        for (const booking of buyoutBookings) {
          const bStart = parseInt(booking.start_time.split(':')[0]) * 60 + parseInt(booking.start_time.split(':')[1]);
          const bEnd = parseInt(booking.end_time.split(':')[0]) * 60 + parseInt(booking.end_time.split(':')[1]);
          
          if (startMins < (bEnd + BUFFER_MINUTES) && endMins > (bStart - BUFFER_MINUTES)) {
            conflict = 'Blocked by Buyout';
            break;
          }
        }
      }
      
      // Check if this is a buyout and any other studio has bookings (with buffer)
      if (studio.type === 'full_studio_buyout' && !conflict) {
        const otherBookings = dateBookings?.filter(b => 
          b.studio_id !== studio.id && 
          b.status !== 'cancelled' &&
          (!existingBooking || b.id !== existingBooking.id)
        ) || [];
        
        for (const booking of otherBookings) {
          const bStart = parseInt(booking.start_time.split(':')[0]) * 60 + parseInt(booking.start_time.split(':')[1]);
          const bEnd = parseInt(booking.end_time.split(':')[0]) * 60 + parseInt(booking.end_time.split(':')[1]);
          
          if (startMins < (bEnd + BUFFER_MINUTES) && endMins > (bStart - BUFFER_MINUTES)) {
            conflict = 'Other studios booked';
            break;
          }
        }
      }
      
      availability[studio.id] = {
        available: !conflict,
        conflictTime: conflict || undefined
      };
    }
    
    return availability;
  }, [date, startTime, endTime, computedEndTime, sessionType, dateBookings, studios, existingBooking]);

  // Generate line items for cost breakdown
  const lineItems = useMemo(() => {
    if (!date || selectedStudios.length === 0) return [];
    
    const items: { label: string; amount: number; isHeader?: boolean }[] = [];
    const slotType = getTimeSlotType(date, startTime);
    const durationHours = sessionType === 'serviced' ? sessionDuration : hours;
    
    if (durationHours <= 0) return [];
    
    // Add service type header for serviced sessions
    if (sessionType === 'serviced' && serviceType) {
      const serviceLabels: Record<string, string> = {
        photoshoot: 'Photoshoot (Unedited – edits sold separately)',
        vodcast: 'Vodcast Production',
        audio_podcast: 'Audio Podcast',
        recording_session: 'Recording Session',
      };
      items.push({
        label: `Service: ${serviceLabels[serviceType] || serviceType}`,
        amount: 0,
        isHeader: true,
      });
    }
    
    // Studio rates
    for (const studioId of selectedStudios) {
      const studio = studios.find(s => s.id === studioId);
      const rate = diyRates.find(
        r => r.studio_id === studioId && r.time_slots?.type === slotType
      );
      
      if (rate && studio) {
        let studioTotal = 0;
        let label = studio.name;
        
        if (durationHours <= 1) {
          studioTotal = rate.first_hour_rate;
          label += ` (${formatDuration(durationHours)} @ $${rate.first_hour_rate})`;
        } else if (rate.after_first_hour_rate !== null) {
          const firstHour = rate.first_hour_rate;
          const additionalHours = durationHours - 1;
          const additionalCost = additionalHours * rate.after_first_hour_rate;
          studioTotal = firstHour + additionalCost;
          label += ` (1hr @ $${firstHour} + ${formatDuration(additionalHours)} @ $${rate.after_first_hour_rate})`;
        } else {
          studioTotal = durationHours * rate.first_hour_rate;
          label += ` (${formatDuration(durationHours)} @ $${rate.first_hour_rate}/hr)`;
        }
        
        items.push({ label, amount: studioTotal });
      }
    }
    
    // Provider rates (serviced only)
    if (sessionType === 'serviced' && bookingType === 'customer') {
      for (const level of ['lv1', 'lv2', 'lv3'] as const) {
        const count = crewAllocation[level];
        if (count > 0) {
          const provider = providerLevels.find(p => p.level === level);
          if (provider) {
            const levelLabels = { lv1: 'Entry', lv2: 'Exp', lv3: 'Expert' };
            const cost = Number(provider.hourly_rate) * durationHours * count;
            items.push({
              label: `${levelLabels[level]} Crew × ${count} (${formatDuration(durationHours)} @ $${provider.hourly_rate}/hr)`,
              amount: cost,
            });
          }
        }
      }
      
      // Camera addon for vodcast
      if (serviceType === 'vodcast' && cameraCount > 0) {
        const cameraAddon = vodcastCameraAddons.find(c => c.cameras === cameraCount);
        if (cameraAddon) {
          items.push({
            label: `Camera Fee (${cameraCount} cam${cameraCount > 1 ? 's' : ''})`,
            amount: Number(cameraAddon.customer_addon_amount),
          });
        }
      }
    }
    
    // Session addons
    for (const addonId of selectedAddons) {
      const addon = sessionAddonsData.find(a => a.id === addonId);
      if (addon) {
        const hrs = addon.is_hourly ? (addonHours[addonId] || 1) : 1;
        const cost = addon.is_hourly ? Number(addon.flat_amount) * hrs : Number(addon.flat_amount);
        items.push({
          label: addon.name + (addon.is_hourly ? ` (${hrs} hr${hrs > 1 ? 's' : ''} @ $${addon.flat_amount}/hr)` : ''),
          amount: cost,
        });
      }
    }

    // Auto-included addons
    for (const addon of autoIncludedAddons) {
      items.push({
        label: 'Photoshoot setup fee (included)',
        amount: Number(addon.flat_amount),
      });
    }

    // Editing items (photo and video editing)
    for (const editItem of editingItems) {
      if (editItem.category === 'photo' || editItem.category === 'photo_editing') {
        const total = editItem.quantity * editItem.customerPrice;
        items.push({
          label: `${editItem.name} (${editItem.quantity} edits @ $${editItem.customerPrice}/edit)`,
          amount: total,
        });
      } else {
        // Video editing with crew level multipliers
        const crewLevel = editItem.crewLevel || 'lv2';
        const levelLabels: Record<string, string> = { lv1: 'Entry (0.75×)', lv2: 'Exp (1×)', lv3: 'Expert (1.25×)' };
        const EDITING_CREW_MULTIPLIERS: Record<string, number> = { lv1: 0.75, lv2: 1, lv3: 1.25 };
        const multiplier = EDITING_CREW_MULTIPLIERS[crewLevel] || 1;
        const itemTotal = Math.round(editItem.customerPrice * multiplier);
        
        items.push({
          label: `${editItem.name} • ${levelLabels[crewLevel]}`,
          amount: itemTotal,
        });
      }
    }
    
    return items;
  }, [date, selectedStudios, startTime, sessionType, sessionDuration, hours, bookingType, crewAllocation, serviceType, cameraCount, selectedAddons, studios, diyRates, providerLevels, vodcastCameraAddons, sessionAddonsData, autoIncludedAddons, editingItems, addonHours]);

  // Get studio rates for display
  const studioRatesDisplay = useMemo(() => {
    if (!date || selectedStudios.length === 0) return [];
    
    const slotType = getTimeSlotType(date, startTime);
    
    return selectedStudios.map(studioId => {
      const studio = studios.find(s => s.id === studioId);
      const rate = diyRates.find(
        r => r.studio_id === studioId && r.time_slots?.type === slotType
      );
      
      if (studio && rate) {
        const hasAfterRate = rate.after_first_hour_rate !== null;
        return {
          name: studio.name,
          rateText: hasAfterRate 
            ? `$${rate.first_hour_rate} (1st hr) + $${rate.after_first_hour_rate}/addl`
            : `$${rate.first_hour_rate}/hr`,
        };
      }
      return { name: studio?.name || 'Unknown', rateText: '-' };
    });
  }, [date, selectedStudios, startTime, studios, diyRates]);

  const handleStudioToggle = (studioId: string) => {
    setSelectedStudios(prev => 
      prev.includes(studioId)
        ? prev.filter(id => id !== studioId)
        : [...prev, studioId]
    );
  };

  // Handle start time change - auto-adjust end time to maintain minimum duration
  const handleStartTimeChange = (newStartTime: string) => {
    setStartTime(newStartTime);
    
    const startTime24 = to24Hour(newStartTime);
    const [startH, startM] = startTime24.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    
    // Minimum booking duration is 1 hour (60 minutes)
    const minDurationMinutes = 60;
    
    if (sessionType === 'serviced') {
      // Recalculate end time based on current duration
      const endMinutes = startMinutes + sessionDuration * 60;
      const endH = Math.floor(endMinutes / 60);
      const endM = Math.round(endMinutes % 60);
      const newEndTime24 = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
      if (onDurationChange && selectedStudios.length > 0) {
        onDurationChange(selectedStudios, startTime24, newEndTime24);
      }
    } else {
      // For DIY: preserve the last selected duration (minimum 60 mins)
      const durationToUse = Math.max(lastDiyDuration, minDurationMinutes);
      const newEndMinutes = startMinutes + durationToUse;
      const newEndH = Math.floor(newEndMinutes / 60);
      const newEndM = newEndMinutes % 60;
      const adjustedEndTime = to12Hour(`${newEndH.toString().padStart(2, '0')}:${newEndM.toString().padStart(2, '0')}`);
      setEndTime(adjustedEndTime);
    }
  };

  // Handle end time change - ensure minimum duration is maintained
  const handleEndTimeChange = (newEndTime: string) => {
    const startTime24 = to24Hour(startTime);
    const endTime24 = to24Hour(newEndTime);
    const [startH, startM] = startTime24.split(':').map(Number);
    const [endH, endM] = endTime24.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    
    // Minimum booking duration is 1 hour (60 minutes)
    const minDurationMinutes = 60;
    
    if (sessionType === 'serviced') {
      // Calculate new duration from start and end times
      const newDuration = calculateHours(startTime, newEndTime);
      // Clamp duration between 1 and 8 hours
      if (newDuration >= 1 && newDuration <= 8) {
        setSessionDuration(newDuration);
        // Notify calendar view
        if (onDurationChange && selectedStudios.length > 0) {
          onDurationChange(selectedStudios, startTime24, endTime24);
        }
      }
    } else {
      // For DIY: only allow if end is after start + minDuration
      if (endMinutes >= startMinutes + minDurationMinutes) {
        setEndTime(newEndTime);
        // Remember this duration for future start time changes
        setLastDiyDuration(endMinutes - startMinutes);
      } else {
        // Auto-correct to minimum valid end time
        const newEndMinutes = startMinutes + minDurationMinutes;
        const newEndH = Math.floor(newEndMinutes / 60);
        const newEndM = newEndMinutes % 60;
        const correctedEndTime = to12Hour(`${newEndH.toString().padStart(2, '0')}:${newEndM.toString().padStart(2, '0')}`);
        setEndTime(correctedEndTime);
        setLastDiyDuration(minDurationMinutes);
      }
    }
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

  // Toggle a photo editing item on/off
  const toggleEditingItem = (item: { id: string; name: string; category: string; base_price: number; customer_price: number | null; increment_price?: number | null }) => {
    const existing = editingItems.find(e => e.id === item.id);
    if (existing) {
      setEditingItems(prev => prev.filter(e => e.id !== item.id));
    } else {
      const isSimpleRetouch = item.name === 'Simple Retouch Edit';
      const isVideoEditing = item.category !== 'photo' && item.category !== 'photo_editing';
      const customerPrice = Number(item.customer_price || item.base_price * 2);
      setEditingItems(prev => [
        ...prev,
        {
          id: item.id,
          name: item.name,
          category: item.category,
          quantity: isSimpleRetouch ? 5 : 1, // 5 edit minimum for Simple Retouch in booking modal
          basePrice: Number(item.base_price),
          customerPrice,
          incrementPrice: item.increment_price ? Number(item.increment_price) : null,
          // For video editing, use crewLevel with default of Lv2 (1x multiplier)
          crewLevel: isVideoEditing ? 'lv2' : undefined,
          assignedCrew: isVideoEditing ? { lv1: 0, lv2: 1, lv3: 0 } : undefined,
        },
      ]);
    }
  };

  // Update crew level for a video editing item (multiplier-based)
  const updateEditingCrewLevel = (itemId: string, level: 'lv1' | 'lv2' | 'lv3') => {
    setEditingItems(prev => prev.map(e => {
      if (e.id !== itemId) return e;
      return { ...e, crewLevel: level };
    }));
  };

  // Update crew assignment for a video editing item (legacy - kept for compatibility)
  const updateEditingCrewAssignment = (itemId: string, level: keyof CrewAllocation, delta: number) => {
    setEditingItems(prev => prev.map(e => {
      if (e.id !== itemId) return e;
      const currentCrew = e.assignedCrew || { lv1: 0, lv2: 0, lv3: 0 };
      const newValue = Math.max(0, (currentCrew[level] || 0) + delta);
      return { ...e, assignedCrew: { ...currentCrew, [level]: newValue } };
    }));
  };

  // Get total crew for a video editing item
  const getVideoEditingCrewTotal = (item: EditingItem) => {
    if (!item.assignedCrew) return 0;
    return (item.assignedCrew.lv1 || 0) + (item.assignedCrew.lv2 || 0) + (item.assignedCrew.lv3 || 0);
  };

  // Update quantity for an editing item
  const updateEditingQuantity = (itemId: string, newQuantity: number) => {
    setEditingItems(prev => prev.map(e => {
      if (e.id !== itemId) return e;
      const isSimpleRetouch = e.name === 'Simple Retouch Edit';
      const minQuantity = isSimpleRetouch ? 5 : 1; // 5 edit minimum for Simple Retouch
      return { ...e, quantity: Math.max(minQuantity, newQuantity) };
    }));
  };

  // Update hours for an hourly addon
  const updateAddonHours = (addonId: string, hours: number) => {
    setAddonHours(prev => ({ ...prev, [addonId]: Math.max(1, hours) }));
  };

  // Helper to check if new booking overlaps with existing bookings
  const checkOverlapConflicts = async (): Promise<{ hasConflict: boolean; message?: string }> => {
    if (!date || selectedStudios.length === 0) return { hasConflict: false };
    
    const bookingDate = format(date, 'yyyy-MM-dd');
    const startTime24 = to24Hour(startTime);
    const endTime24 = to24Hour(computedEndTime);
    
    const startMins = parseInt(startTime24.split(':')[0]) * 60 + parseInt(startTime24.split(':')[1]);
    const endMins = parseInt(endTime24.split(':')[0]) * 60 + parseInt(endTime24.split(':')[1]);
    
    // Fetch existing bookings for the date
    const { data: existingBookings, error } = await supabase
      .from('studio_bookings')
      .select('*')
      .eq('booking_date', bookingDate)
      .in('studio_id', selectedStudios)
      .neq('status', 'cancelled');
    
    if (error) {
      console.error('Error checking overlaps:', error);
      return { hasConflict: false };
    }
    
    // Check for time overlaps
    for (const booking of existingBookings || []) {
      // Skip if editing the same booking
      if (existingBooking && booking.id === existingBooking.id) continue;
      
      const bookingStartMins = parseInt(booking.start_time.split(':')[0]) * 60 + parseInt(booking.start_time.split(':')[1]);
      const bookingEndMins = parseInt(booking.end_time.split(':')[0]) * 60 + parseInt(booking.end_time.split(':')[1]);
      
      // Check overlap: not (new ends before existing starts OR new starts after existing ends)
      const hasOverlap = !(endMins <= bookingStartMins || startMins >= bookingEndMins);
      
      if (hasOverlap) {
        const studioName = studios.find(s => s.id === booking.studio_id)?.name || 'Studio';
        return { 
          hasConflict: true, 
          message: `${studioName} already has a booking from ${booking.start_time.slice(0,5)} to ${booking.end_time.slice(0,5)}` 
        };
      }
    }
    
    // Check Full Studio Buyout conflicts
    const buyoutStudio = studios.find(s => s.type === 'full_studio_buyout');
    if (buyoutStudio) {
      const isBuyoutSelected = selectedStudios.includes(buyoutStudio.id);
      
      // If buyout is selected, check if any OTHER studio has bookings in that time
      if (isBuyoutSelected) {
        const { data: otherBookings } = await supabase
          .from('studio_bookings')
          .select('*, studios!inner(name)')
          .eq('booking_date', bookingDate)
          .not('studio_id', 'eq', buyoutStudio.id)
          .neq('status', 'cancelled');
        
        for (const booking of otherBookings || []) {
          const bookingStartMins = parseInt(booking.start_time.split(':')[0]) * 60 + parseInt(booking.start_time.split(':')[1]);
          const bookingEndMins = parseInt(booking.end_time.split(':')[0]) * 60 + parseInt(booking.end_time.split(':')[1]);
          const hasOverlap = !(endMins <= bookingStartMins || startMins >= bookingEndMins);
          
          if (hasOverlap) {
            return { 
              hasConflict: true, 
              message: `Full Studio Buyout conflicts with existing booking in another space` 
            };
          }
        }
      } else {
        // If not buyout, check if buyout is booked in that time
        const { data: buyoutBookings } = await supabase
          .from('studio_bookings')
          .select('*')
          .eq('booking_date', bookingDate)
          .eq('studio_id', buyoutStudio.id)
          .neq('status', 'cancelled');
        
        for (const booking of buyoutBookings || []) {
          const bookingStartMins = parseInt(booking.start_time.split(':')[0]) * 60 + parseInt(booking.start_time.split(':')[1]);
          const bookingEndMins = parseInt(booking.end_time.split(':')[0]) * 60 + parseInt(booking.end_time.split(':')[1]);
          const hasOverlap = !(endMins <= bookingStartMins || startMins >= bookingEndMins);
          
          if (hasOverlap) {
            return { 
              hasConflict: true, 
              message: `This time is blocked by a Full Studio Buyout` 
            };
          }
        }
      }
    }
    
    return { hasConflict: false };
  };

  // Find available time slots before/after the desired time
  const findAvailableSlots = useCallback(async (
    studioIdsToCheck: string[],
    bookingDate: string,
    desiredStart24: string,
    durationMins: number,
    bufferMins: number = 15
  ): Promise<{
    beforeSlots: string[];
    afterSlots: string[];
    nextDaySlot?: { date: Date; time: string };
  }> => {
    // Parse operating hours
    const operatingStartMins = parseInt(operatingStart.split(':')[0]) * 60 + parseInt(operatingStart.split(':')[1]);
    const operatingEndMins = parseInt(operatingEnd.split(':')[0]) * 60 + parseInt(operatingEnd.split(':')[1]);
    const desiredStartMins = parseInt(desiredStart24.split(':')[0]) * 60 + parseInt(desiredStart24.split(':')[1]);
    
    // Fetch all bookings for the date including buyout conflicts
    const { data: dayBookings } = await supabase
      .from('studio_bookings')
      .select('*')
      .eq('booking_date', bookingDate)
      .neq('status', 'cancelled');
    
    // Build blocked ranges
    const blockedRanges: { start: number; end: number }[] = [];
    const buyoutStudio = studios.find(s => s.type === 'full_studio_buyout');
    
    for (const booking of dayBookings || []) {
      // Skip if editing this booking
      if (existingBooking && booking.id === existingBooking.id) continue;
      
      const bStart = parseInt(booking.start_time.split(':')[0]) * 60 + parseInt(booking.start_time.split(':')[1]);
      const bEnd = parseInt(booking.end_time.split(':')[0]) * 60 + parseInt(booking.end_time.split(':')[1]);
      
      // Check if this booking affects any studio we're checking
      const affectsOurStudios = studioIdsToCheck.includes(booking.studio_id);
      const isBuyoutBooking = buyoutStudio && booking.studio_id === buyoutStudio.id;
      const weWantBuyout = buyoutStudio && studioIdsToCheck.includes(buyoutStudio.id);
      
      if (affectsOurStudios || isBuyoutBooking || weWantBuyout) {
        blockedRanges.push({ start: bStart, end: bEnd + bufferMins });
      }
    }
    
    // Helper to check if a slot is available
    const isSlotAvailable = (startMins: number): boolean => {
      const endMins = startMins + durationMins;
      if (startMins < operatingStartMins || endMins > operatingEndMins) return false;
      
      for (const range of blockedRanges) {
        if (!(endMins <= range.start || startMins >= range.end)) {
          return false;
        }
      }
      return true;
    };
    
    // Find slots BEFORE desired time (up to 3)
    const beforeSlots: string[] = [];
    let checkTime = desiredStartMins - 15;
    while (checkTime >= operatingStartMins && beforeSlots.length < 3) {
      if (isSlotAvailable(checkTime)) {
        const h = Math.floor(checkTime / 60);
        const m = checkTime % 60;
        beforeSlots.unshift(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      }
      checkTime -= 15;
    }
    
    // Find slots AFTER desired time (up to 3)
    const afterSlots: string[] = [];
    checkTime = desiredStartMins + 15;
    while (checkTime + durationMins <= operatingEndMins && afterSlots.length < 3) {
      if (isSlotAvailable(checkTime)) {
        const h = Math.floor(checkTime / 60);
        const m = checkTime % 60;
        afterSlots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      }
      checkTime += 15;
    }
    
    // If no slots today, check next day
    let nextDaySlot: { date: Date; time: string } | undefined;
    if (beforeSlots.length === 0 && afterSlots.length === 0 && date) {
      const nextDate = addDays(parseISO(bookingDate), 1);
      const nextDateStr = format(nextDate, 'yyyy-MM-dd');
      
      // Fetch next day bookings
      const { data: nextDayBookings } = await supabase
        .from('studio_bookings')
        .select('*')
        .eq('booking_date', nextDateStr)
        .neq('status', 'cancelled');
      
      const nextDayBlocked: { start: number; end: number }[] = [];
      for (const booking of nextDayBookings || []) {
        const bStart = parseInt(booking.start_time.split(':')[0]) * 60 + parseInt(booking.start_time.split(':')[1]);
        const bEnd = parseInt(booking.end_time.split(':')[0]) * 60 + parseInt(booking.end_time.split(':')[1]);
        
        const affectsOurStudios = studioIdsToCheck.includes(booking.studio_id);
        const isBuyoutBooking = buyoutStudio && booking.studio_id === buyoutStudio.id;
        const weWantBuyout = buyoutStudio && studioIdsToCheck.includes(buyoutStudio.id);
        
        if (affectsOurStudios || isBuyoutBooking || weWantBuyout) {
          nextDayBlocked.push({ start: bStart, end: bEnd + bufferMins });
        }
      }
      
      // Check around the same time as requested
      const isNextDaySlotAvailable = (startMins: number): boolean => {
        const endMins = startMins + durationMins;
        if (startMins < operatingStartMins || endMins > operatingEndMins) return false;
        
        for (const range of nextDayBlocked) {
          if (!(endMins <= range.start || startMins >= range.end)) {
            return false;
          }
        }
        return true;
      };
      
      // Try the same time, then earlier, then later
      const timesToTry = [desiredStartMins, desiredStartMins - 60, desiredStartMins + 60, operatingStartMins];
      for (const tryTime of timesToTry) {
        if (tryTime >= operatingStartMins && tryTime + durationMins <= operatingEndMins && isNextDaySlotAvailable(tryTime)) {
          const h = Math.floor(tryTime / 60);
          const m = tryTime % 60;
          nextDaySlot = { 
            date: nextDate, 
            time: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}` 
          };
          break;
        }
      }
    }
    
    return { beforeSlots, afterSlots, nextDaySlot };
  }, [operatingStart, operatingEnd, studios, existingBooking, date]);

  // Check availability for selected studios
  const checkServiceAvailability = useCallback(async (studioIdsToCheck: string[], overrideStartTime?: string) => {
    if (!date || studioIdsToCheck.length === 0) return;
    
    setIsCheckingAvailability(true);
    
    try {
      const bookingDate = format(date, 'yyyy-MM-dd');
      const durationMins = sessionDuration * 60;
      const effectiveStartTime = overrideStartTime || startTime;
      const startTime24 = to24Hour(effectiveStartTime);
      const startMins = parseInt(startTime24.split(':')[0]) * 60 + parseInt(startTime24.split(':')[1]);
      const endMins = startMins + durationMins;
      
      // Fetch existing bookings for the date
      const { data: existingBookings } = await supabase
        .from('studio_bookings')
        .select('*')
        .eq('booking_date', bookingDate)
        .in('studio_id', studioIdsToCheck)
        .neq('status', 'cancelled');
      
      // Check for time overlaps
      let hasConflict = false;
      let conflictMessage = '';
      
      for (const booking of existingBookings || []) {
        if (existingBooking && booking.id === existingBooking.id) continue;
        
        const bookingStartMins = parseInt(booking.start_time.split(':')[0]) * 60 + parseInt(booking.start_time.split(':')[1]);
        const bookingEndMins = parseInt(booking.end_time.split(':')[0]) * 60 + parseInt(booking.end_time.split(':')[1]);
        
        const hasOverlap = !(endMins <= bookingStartMins || startMins >= bookingEndMins);
        
        if (hasOverlap) {
          const studioName = studios.find(s => s.id === booking.studio_id)?.name || 'Studio';
          hasConflict = true;
          conflictMessage = `${studioName} already has a booking from ${booking.start_time.slice(0,5)} to ${booking.end_time.slice(0,5)}`;
          break;
        }
      }
      
      // Check Full Studio Buyout conflicts
      if (!hasConflict) {
        const buyoutStudio = studios.find(s => s.type === 'full_studio_buyout');
        if (buyoutStudio) {
          const isBuyoutSelected = studioIdsToCheck.includes(buyoutStudio.id);
          
          if (isBuyoutSelected) {
            const { data: otherBookings } = await supabase
              .from('studio_bookings')
              .select('*, studios!inner(name)')
              .eq('booking_date', bookingDate)
              .not('studio_id', 'eq', buyoutStudio.id)
              .neq('status', 'cancelled');
            
            for (const booking of otherBookings || []) {
              const bookingStartMins = parseInt(booking.start_time.split(':')[0]) * 60 + parseInt(booking.start_time.split(':')[1]);
              const bookingEndMins = parseInt(booking.end_time.split(':')[0]) * 60 + parseInt(booking.end_time.split(':')[1]);
              const hasOverlap = !(endMins <= bookingStartMins || startMins >= bookingEndMins);
              
              if (hasOverlap) {
                hasConflict = true;
                conflictMessage = 'Full Studio Buyout conflicts with existing booking in another space';
                break;
              }
            }
          } else {
            const { data: buyoutBookings } = await supabase
              .from('studio_bookings')
              .select('*')
              .eq('booking_date', bookingDate)
              .eq('studio_id', buyoutStudio.id)
              .neq('status', 'cancelled');
            
            for (const booking of buyoutBookings || []) {
              const bookingStartMins = parseInt(booking.start_time.split(':')[0]) * 60 + parseInt(booking.start_time.split(':')[1]);
              const bookingEndMins = parseInt(booking.end_time.split(':')[0]) * 60 + parseInt(booking.end_time.split(':')[1]);
              const hasOverlap = !(endMins <= bookingStartMins || startMins >= bookingEndMins);
              
              if (hasOverlap) {
                hasConflict = true;
                conflictMessage = 'This time is blocked by a Full Studio Buyout';
                break;
              }
            }
          }
        }
      }
      
      if (hasConflict) {
        // Find alternative times
        const suggestions = await findAvailableSlots(studioIdsToCheck, bookingDate, startTime24, durationMins, 15);
        
        setAvailabilityConflict({
          hasConflict: true,
          message: conflictMessage,
          suggestedTimes: {
            before: suggestions.beforeSlots,
            after: suggestions.afterSlots,
          },
          nextDayTime: suggestions.nextDaySlot,
        });
      } else {
        setAvailabilityConflict(null);
      }
    } catch (error) {
      console.error('Error checking service availability:', error);
      setAvailabilityConflict(null);
    } finally {
      setIsCheckingAvailability(false);
    }
  }, [date, sessionDuration, startTime, studios, existingBooking, findAvailableSlots]);

  // Handle selecting a suggested time
  const handleSuggestedTimeSelect = async (time24: string) => {
    const newTime12 = to12Hour(time24);
    setStartTime(newTime12);
    setAvailabilityConflict(null);
    // Pass new time directly to avoid stale closure
    if (selectedStudios.length > 0) {
      await checkServiceAvailability(selectedStudios, newTime12);
    }
  };

  // Handle selecting next day
  const handleNextDaySelect = async (newDate: Date, time24: string) => {
    const newTime12 = to12Hour(time24);
    setDate(newDate);
    setStartTime(newTime12);
    setAvailabilityConflict(null);
    // Pass new time directly to avoid stale closure
    if (selectedStudios.length > 0) {
      await checkServiceAvailability(selectedStudios, newTime12);
    }
  };

  // Get current step index based on session type
  const activeSteps = sessionType === 'diy' ? DIY_STEPS : SERVICED_STEPS;
  const currentStepIndex = activeSteps.findIndex(s => s.key === step);

  const handleNext = async () => {
    // Validate basic step for all session types
    if (step === 'basic') {
      // DIY sessions require date/time validation in basic step
      if (sessionType === 'diy') {
        if (!date) {
          toast({ title: 'Please select a date', variant: 'destructive' });
          return;
        }
        if (selectedStudios.length === 0) {
          toast({ title: 'Please select at least one space', variant: 'destructive' });
          return;
        }
        const calculatedHours = calculateHours(startTime, endTime);
        if (calculatedHours <= 0) {
          toast({ title: 'End time must be after start time', variant: 'destructive' });
          return;
        }
        
        // Check for overlap conflicts
        setOverlapError(null);
        const overlapResult = await checkOverlapConflicts();
        if (overlapResult.hasConflict) {
          setOverlapError(overlapResult.message || 'Time slot conflicts with existing booking');
          toast({ title: 'Booking Conflict', description: overlapResult.message, variant: 'destructive' });
          return;
        }
        
        setStep('addons');
        return;
      }
      
      // Serviced sessions skip date/time validation here - they select it in summary step
      setStep('service');
    } else if (step === 'service') {
      if (!serviceType) {
        toast({ title: 'Please select a service', variant: 'destructive' });
        return;
      }
      // Require editing preference selection for photoshoot and vodcast
      if ((serviceType === 'photoshoot' || serviceType === 'vodcast') && wantsEditing === null) {
        toast({ title: 'Please select whether you want editing included', variant: 'destructive' });
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
      // Validate video editing items have crew level assigned (for vodcast)
      if (sessionType === 'serviced' && serviceType === 'vodcast') {
        const videoItemsWithNoLevel = editingItems.filter(item => {
          if (item.category === 'photo_editing') return false;
          return !item.crewLevel;
        });
        
        if (videoItemsWithNoLevel.length > 0) {
          toast({ 
            title: 'Editor Level Required', 
            description: `Please select an editor level for: ${videoItemsWithNoLevel.map(i => i.name).join(', ')}`,
            variant: 'destructive' 
          });
          return;
        }
      }
      
      // DIY confirms from addons, serviced goes to summary
      if (sessionType === 'diy') {
        handleSubmit();
        return;
      }
      setStep('summary');
    }
  };

  const handleBack = () => {
    if (sessionType === 'diy') {
      const idx = DIY_STEPS.findIndex(s => s.key === step);
      if (idx > 0) {
        setStep(DIY_STEPS[idx - 1].key);
      }
    } else {
      const idx = SERVICED_STEPS.findIndex(s => s.key === step);
      if (idx > 0) {
        setStep(SERVICED_STEPS[idx - 1].key);
      }
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

    // Validate customer info when booking type is customer
    if (holderType === 'customer') {
      const validation = validateBookingCustomer({
        customerName,
        customerEmail,
        customerPhone,
        notes,
      });
      
      if (!validation.success) {
        setValidationErrors(validation.errors);
        const firstError = Object.values(validation.errors)[0];
        toast({ title: 'Validation Error', description: firstError, variant: 'destructive' });
        return;
      }
    }
    
    setValidationErrors({});
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
      // Generate repeat series info if repeating
      const isRepeating = repeatConfig.frequency !== 'none';
      const repeatSeriesId = isRepeating ? crypto.randomUUID() : null;
      const repeatPattern = isRepeating ? getRepeatPatternText(repeatConfig, date) : null;

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
          details: details || null,
          quote_id: null,
          created_by: null,
          title: title || null,
          people_count: peopleCount || 1,
          repeat_series_id: repeatSeriesId,
          repeat_pattern: repeatPattern,
        })
      );

      // If repeating, create additional bookings for each repeat date
      if (isRepeating) {
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
                details: details || null,
                quote_id: null,
                created_by: null,
                title: title || null,
                people_count: peopleCount || 1,
                repeat_series_id: repeatSeriesId,
                repeat_pattern: repeatPattern,
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
    // Validate date selection for serviced sessions
    if (!date) {
      toast({ title: 'Please select a date', variant: 'destructive' });
      return;
    }
    
    if (selectedStudios.length === 0) {
      toast({ title: 'No space selected', variant: 'destructive' });
      return;
    }
    
    // Check for conflicts before submission
    const overlapResult = await checkOverlapConflicts();
    if (overlapResult.hasConflict) {
      toast({ 
        title: 'Booking Conflict', 
        description: overlapResult.message || 'Please select an available time slot', 
        variant: 'destructive' 
      });
      return;
    }
    
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
            editingItems,
            addonHours,
            sessionDuration,
            cameraCount,
            studioIds: selectedStudios,
            date: date ? format(date, 'yyyy-MM-dd') : null,
            startTime,
            customerName,
            customerEmail,
            affiliateCode,
            holderType,
            wantsEditing,
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
          details: details || null,
          quote_id: quote.id,
          created_by: null,
          title: title || null,
          people_count: peopleCount || 1,
          repeat_series_id: null,
          repeat_pattern: null,
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
            editingItems,
            addonHours,
            sessionDuration,
            cameraCount,
            studioIds: selectedStudios,
            date: date ? format(date, 'yyyy-MM-dd') : null,
            startTime,
            customerName,
            customerEmail,
            affiliateCode,
            holderType,
            notes,
            wantsEditing,
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
  // Both DIY and Serviced customer bookings are now multi-step (including editing)
  const isMultiStep = bookingType === 'customer';
  const isDiyMultiStep = isMultiStep && sessionType === 'diy';

  // Get dialog title based on step
  const getDialogTitle = () => {
    if (!isMultiStep) return isEditing ? 'Edit booking' : 'New booking';
    const prefix = isEditing ? 'Edit' : 'New';
    if (isDiyMultiStep) {
      switch (step) {
        case 'basic': return `${prefix} DIY booking`;
        case 'addons': return 'Add-ons';
        default: return `${prefix} booking`;
      }
    }
    switch (step) {
      case 'basic': return `${prefix} booking`;
      case 'service': return 'Select service';
      case 'duration': return 'Duration & crew';
      case 'addons': return 'Add-ons';
      case 'summary': return 'Booking summary';
      default: return `${prefix} booking`;
    }
  };

  // Select a profile from the list
  const handleSelectProfile = (profile: Profile) => {
    setSelectedProfile(profile);
    setHolderType('customer');
    setCustomerName(profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || '');
    setCustomerEmail(profile.email || '');
    setCustomerPhone(profile.phone || '');
    setIsCreatingNewUser(false);
    setHolderPopoverOpen(false);
  };

  // Select casual user
  const handleSelectCasual = () => {
    setSelectedProfile(null);
    setHolderType('casual');
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setIsCreatingNewUser(false);
    setHolderPopoverOpen(false);
  };

  // Start creating new user
  const handleStartCreateUser = () => {
    setIsCreatingNewUser(true);
    setSelectedProfile(null);
    setHolderType('customer');
  };

  // Get display text for holder button
  const getHolderDisplayText = () => {
    if (isCreatingNewUser) return 'Creating new user...';
    if (selectedProfile) {
      return selectedProfile.full_name || selectedProfile.email || 'Selected user';
    }
    if (holderType === 'internal') return 'Internal team member';
    return 'Casual user (no details needed)';
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
      
      // Determine if we should update the repeat_pattern
      const shouldUpdateRepeatPattern = (editScope === 'from_here' || editScope === 'series') && repeatConfig.frequency !== 'none';
      const newRepeatPattern = shouldUpdateRepeatPattern ? getRepeatPatternText(repeatConfig, date) : undefined;
      
      const bookingUpdates: any = {
        booking_date: format(date, 'yyyy-MM-dd'),
        start_time: to24Hour(startTime),
        end_time: to24Hour(bookingEndTime),
        booking_type: bookingType,
        customer_name: holderType === 'customer' ? customerName : null,
        customer_email: holderType === 'customer' ? customerEmail : null,
        customer_phone: holderType === 'customer' ? customerPhone : null,
        session_type: bookingType === 'customer' ? sessionType : null,
        notes: notes || null,
        details: details || null,
        title: title || null,
        people_count: peopleCount || 1,
        // Include repeat_pattern update when editing series
        ...(newRepeatPattern && { repeat_pattern: newRepeatPattern }),
      };
      
      // Determine which update method to use based on editScope
      if (editScope === 'from_here' && existingBooking.repeat_series_id) {
        // Update this and all following bookings in the series
        const result = await updateSeriesFromDate.mutateAsync({
          seriesId: existingBooking.repeat_series_id,
          fromDate: existingBooking.booking_date,
          updates: bookingUpdates,
        });
        toast({ 
          title: 'Series updated', 
          description: `Updated ${result.length} bookings from this date onwards.` 
        });
      } else if (editScope === 'series' && existingBooking.repeat_series_id) {
        // Update entire series
        const result = await updateEntireSeries.mutateAsync({
          seriesId: existingBooking.repeat_series_id,
          updates: bookingUpdates,
        });
        toast({ 
          title: 'Series updated', 
          description: `Updated all ${result.length} bookings in this series.` 
        });
      } else {
        // Update single booking (default / 'occurrence')
        await updateBooking.mutateAsync({
          id: existingBooking.id,
          ...bookingUpdates,
        });
        toast({ title: 'Booking updated successfully' });
      }
      
      // Also update the linked quote if it exists (only for single occurrence edits)
      if (existingBooking.quote_id && editScope === 'occurrence') {
        await supabase
          .from('quotes')
          .update({
            hours: sessionDuration,
            camera_count: serviceType === 'vodcast' ? cameraCount : 1,
            customer_total: displayPrice,
            affiliate_code: affiliateCode || null,
            selections_json: JSON.parse(JSON.stringify({
              serviceType,
              crewAllocation,
              selectedAddons,
              editingItems,
              addonHours,
              sessionDuration,
              cameraCount,
              studioIds: selectedStudios,
              date: date ? format(date, 'yyyy-MM-dd') : null,
              startTime,
              customerName,
              customerEmail,
              affiliateCode,
              holderType,
              wantsEditing,
            })),
            totals_json: { customerTotal: displayPrice },
          })
          .eq('id', existingBooking.quote_id);
      }
      
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
              {activeSteps.map((s, idx) => {
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
                    {idx < activeSteps.length - 1 && (
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

              {/* Holder */}
              {bookingType !== 'unavailable' && (
                <div className="space-y-2">
                  <Label>Holder *</Label>
                  <Popover open={holderPopoverOpen} onOpenChange={setHolderPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between font-normal"
                      >
                        <span className="flex items-center gap-2">
                          {selectedProfile ? (
                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                              {(selectedProfile.full_name || selectedProfile.email || '?')[0].toUpperCase()}
                            </div>
                          ) : isCreatingNewUser ? (
                            <UserPlus className="h-4 w-4" />
                          ) : (
                            <Home className="h-4 w-4" />
                          )}
                          {getHolderDisplayText()}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[350px] p-0" align="start">
                      <Command>
                        <CommandInput 
                          placeholder="Search users..." 
                          value={profileSearch}
                          onValueChange={setProfileSearch}
                        />
                        <CommandList>
                          <CommandEmpty>No users found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem onSelect={handleStartCreateUser} className="gap-2">
                              <UserPlus className="h-4 w-4" />
                              Create a new user
                            </CommandItem>
                            <CommandItem onSelect={handleSelectCasual} className="gap-2">
                              <Home className="h-4 w-4" />
                              Casual user (no details needed)
                            </CommandItem>
                          </CommandGroup>
                          <CommandSeparator />
                          <CommandGroup heading="Platform users">
                            {profiles.map(profile => (
                              <CommandItem
                                key={profile.id}
                                onSelect={() => handleSelectProfile(profile)}
                                className="gap-2"
                              >
                                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium shrink-0">
                                  {(profile.full_name || profile.email || '?')[0].toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">{profile.full_name || 'Unnamed'}</div>
                                  {profile.organization && (
                                    <div className="text-xs text-muted-foreground truncate">{profile.organization}</div>
                                  )}
                                </div>
                                {selectedProfile?.id === profile.id && <Check className="h-4 w-4" />}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  
                  {/* New user form */}
                  {isCreatingNewUser && (
                    <div className="space-y-3 mt-3 p-3 border rounded-md bg-muted/30">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-sm">First name *</Label>
                          <Input
                            value={newUserFirstName}
                            onChange={(e) => {
                              setNewUserFirstName(e.target.value);
                              setCustomerName(`${e.target.value} ${newUserLastName}`.trim());
                              if (validationErrors.customerName) {
                                setValidationErrors(prev => ({ ...prev, customerName: '' }));
                              }
                            }}
                            placeholder="First name"
                            maxLength={50}
                            className={validationErrors.customerName ? 'border-destructive' : ''}
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Last name *</Label>
                          <Input
                            value={newUserLastName}
                            onChange={(e) => {
                              setNewUserLastName(e.target.value);
                              setCustomerName(`${newUserFirstName} ${e.target.value}`.trim());
                              if (validationErrors.customerName) {
                                setValidationErrors(prev => ({ ...prev, customerName: '' }));
                              }
                            }}
                            placeholder="Last name"
                            maxLength={50}
                            className={validationErrors.customerName ? 'border-destructive' : ''}
                          />
                        </div>
                      </div>
                      {validationErrors.customerName && (
                        <p className="text-sm text-destructive -mt-1">{validationErrors.customerName}</p>
                      )}
                      <div>
                        <Label className="text-sm">Email *</Label>
                        <Input
                          type="email"
                          value={customerEmail}
                          onChange={(e) => {
                            setCustomerEmail(e.target.value);
                            if (validationErrors.customerEmail) {
                              setValidationErrors(prev => ({ ...prev, customerEmail: '' }));
                            }
                          }}
                          placeholder="email@example.com"
                          maxLength={255}
                          className={validationErrors.customerEmail ? 'border-destructive' : ''}
                        />
                        {validationErrors.customerEmail && (
                          <p className="text-sm text-destructive mt-1">{validationErrors.customerEmail}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm">Phone</Label>
                        <Input
                          type="tel"
                          value={customerPhone}
                          onChange={(e) => {
                            setCustomerPhone(e.target.value);
                            if (validationErrors.customerPhone) {
                              setValidationErrors(prev => ({ ...prev, customerPhone: '' }));
                            }
                          }}
                          placeholder="(555) 123-4567"
                          maxLength={20}
                          className={validationErrors.customerPhone ? 'border-destructive' : ''}
                        />
                        {validationErrors.customerPhone && (
                          <p className="text-sm text-destructive mt-1">{validationErrors.customerPhone}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm">Organization</Label>
                        <Input
                          value={newUserOrganization}
                          onChange={(e) => setNewUserOrganization(e.target.value)}
                          placeholder="Company or organization"
                          maxLength={100}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Show selected profile details (non-editable preview) */}
                  {selectedProfile && !isCreatingNewUser && (
                    <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">
                      {selectedProfile.email && <div>{selectedProfile.email}</div>}
                      {selectedProfile.phone && <div>{selectedProfile.phone}</div>}
                    </div>
                  )}
                </div>
              )}

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="booking-title">Title</Label>
                <Input
                  id="booking-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a descriptive name for this booking"
                />
              </div>

              {/* Details */}
              <div className="space-y-2">
                <Label htmlFor="booking-details">Details</Label>
                <Textarea
                  id="booking-details"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Additional description for this booking"
                  rows={2}
                />
              </div>

              {/* Expected People Count - Show for DIY in basic step, serviced sessions show this in summary */}
              {(sessionType === 'diy' || bookingType !== 'customer') && (
                <div className="space-y-2">
                  <Label htmlFor="people-count">Expected people count</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="people-count"
                      type="number"
                      min={1}
                      value={peopleCount || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setPeopleCount(0);
                        } else {
                          const parsed = parseInt(val);
                          if (!isNaN(parsed) && parsed >= 0) {
                            setPeopleCount(parsed);
                          }
                        }
                      }}
                      onBlur={() => {
                        if (peopleCount < 1) {
                          setPeopleCount(1);
                        }
                      }}
                      className="w-20"
                    />
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              )}

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

              {/* Spaces - only show for DIY sessions */}
              {sessionType === 'diy' && (
                <div className="space-y-2">
                  <Label>Spaces *</Label>
                  <div className="border rounded-md p-3 space-y-2">
                    {selectedStudios.length === 0 && (
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <AlertTriangle className="h-4 w-4 text-warning" />
                        No spaces selected
                      </div>
                    )}
                    {studios.filter(s => s.is_active).map(studio => {
                      const status = studioAvailability[studio.id];
                      const isAvailable = status?.available !== false;
                      const showIndicator = date && startTime && endTime;
                      
                      return (
                        <div key={studio.id} className="flex items-center gap-2">
                          <Checkbox
                            id={studio.id}
                            checked={selectedStudios.includes(studio.id)}
                            onCheckedChange={() => handleStudioToggle(studio.id)}
                          />
                          <label htmlFor={studio.id} className="text-sm cursor-pointer flex-1">
                            {studio.name}
                          </label>
                          {showIndicator && (
                            isAvailable ? (
                              <span className="text-xs text-green-600 flex items-center gap-1">
                                <Check className="h-3 w-3" /> Available
                              </span>
                            ) : (
                              <span className="text-xs text-destructive flex items-center gap-1">
                                <Ban className="h-3 w-3" /> Unavailable
                                {status?.conflictTime && <span className="text-muted-foreground">@ {status.conflictTime}</span>}
                              </span>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Date, Time, Repeat - Only show in basic step for DIY sessions */}
              {sessionType === 'diy' && (
                <>
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
                        <Select value={startTime} onValueChange={handleStartTimeChange}>
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
                        <Select 
                          value={endTime} 
                          onValueChange={handleEndTimeChange}
                        >
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
                    
                    {/* Live Availability Summary */}
                    {selectedStudios.length > 0 && date && startTime && endTime && (() => {
                      const conflicts = selectedStudios
                        .filter(id => studioAvailability[id]?.available === false)
                        .map(id => {
                          const studio = studios.find(s => s.id === id);
                          return {
                            name: studio?.name || 'Unknown',
                            time: studioAvailability[id]?.conflictTime
                          };
                        });
                      
                      if (conflicts.length === 0) {
                        return (
                          <div className="flex items-center gap-2 text-green-600 text-sm mt-2">
                            <Check className="h-4 w-4" />
                            <span>All selected spaces are available</span>
                          </div>
                        );
                      }
                      
                      return (
                        <div className="space-y-2 mt-2">
                          {conflicts.map((c, i) => (
                            <div key={i} className="flex items-center gap-2 text-destructive text-sm">
                              <Ban className="h-4 w-4" />
                              <span>
                                <strong>{c.name}</strong> unavailable
                                {c.time && <span className="text-muted-foreground"> ({c.time})</span>}
                              </span>
                            </div>
                          ))}
                          
                          {/* Find Available Slot Button */}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full gap-2"
                            onClick={async () => {
                              if (!date || selectedStudios.length === 0 || !startTime) return;
                              setIsCheckingAvailability(true);
                              try {
                                const bookingDate = format(date, 'yyyy-MM-dd');
                                const startTime24 = to24Hour(startTime);
                                const durationMins = Math.round(calculateHours(startTime, endTime) * 60);
                                
                                const suggestions = await findAvailableSlots(
                                  selectedStudios,
                                  bookingDate,
                                  startTime24,
                                  durationMins,
                                  15
                                );
                                
                                const nextSlot = suggestions.afterSlots[0] || suggestions.beforeSlots[0];
                                
                                if (nextSlot) {
                                  setStartTime(to12Hour(nextSlot));
                                  const [h, m] = nextSlot.split(':').map(Number);
                                  const newEndMins = h * 60 + m + durationMins;
                                  const newEndH = Math.floor(newEndMins / 60);
                                  const newEndM = newEndMins % 60;
                                  const newEndTime = to12Hour(`${newEndH.toString().padStart(2, '0')}:${newEndM.toString().padStart(2, '0')}`);
                                  setEndTime(newEndTime);
                                  toast({ title: 'Available slot found', description: `Updated to ${to12Hour(nextSlot)} - ${newEndTime}` });
                                } else if (suggestions.nextDaySlot) {
                                  toast({ title: 'No slots today', description: `Try ${format(suggestions.nextDaySlot.date, 'MMM d')} at ${to12Hour(suggestions.nextDaySlot.time)}` });
                                } else {
                                  toast({ title: 'No available slots', description: 'Try a different date or shorter duration.', variant: 'destructive' });
                                }
                              } catch (error) {
                                console.error('Error finding slot:', error);
                              } finally {
                                setIsCheckingAvailability(false);
                              }
                            }}
                            disabled={isCheckingAvailability}
                          >
                            <Search className="h-4 w-4" />
                            {isCheckingAvailability ? 'Searching...' : 'Find Available Slot'}
                          </Button>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Repeat */}
                  {isEditing && existingRepeatInfo?.pattern ? (
                    // Editable repeat options for all edit scopes
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-1">
                          Repeat Series
                          <Badge variant={editScope === 'occurrence' ? 'secondary' : 'default'} className="ml-2 font-normal">
                            {editScope === 'series' 
                              ? 'Editing full series' 
                              : editScope === 'from_here'
                              ? 'Editing this & following'
                              : 'Part of series'}
                          </Badge>
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {editScope === 'series' 
                          ? 'Changing repeat settings will update all bookings in this series.'
                          : editScope === 'from_here'
                          ? 'Changing repeat settings will update this booking and all following occurrences.'
                          : 'Changes to repeat settings will apply to the full series.'}
                      </p>
                      <RepeatOptions
                        config={repeatConfig}
                        onChange={setRepeatConfig}
                        startDate={date || new Date()}
                        startTime={startTime}
                      />
                    </div>
                  ) : !isEditing ? (
                    // Full repeat options for new bookings
                    <RepeatOptions
                      config={repeatConfig}
                      onChange={setRepeatConfig}
                      startDate={date || new Date()}
                      startTime={startTime}
                    />
                  ) : null}
                </>
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
                      {manualPrice !== '' && calculatedPrice > 0 && parseFloat(manualPrice) !== calculatedPrice && (
                        <button
                          type="button"
                          onClick={() => setManualPrice(calculatedPrice.toFixed(2))}
                          className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 mt-1 transition-colors"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Original: ${calculatedPrice.toFixed(2)}
                        </button>
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
                      onClick={async () => {
                        setServiceType(service.type);
                        setWantsEditing(null); // Reset editing preference when service changes
                        setEditingItems([]); // Clear editing items when service changes
                        setAvailabilityConflict(null); // Reset conflict state
                        
                        // Auto-select studio based on service type
                        let autoSelectedStudios: string[] = [];
                        if (SINGLE_STUDIO_SERVICES[service.type]) {
                          const studioType = SINGLE_STUDIO_SERVICES[service.type];
                          const matchedStudio = studios.find(s => s.type === studioType);
                          if (matchedStudio) {
                            autoSelectedStudios = [matchedStudio.id];
                            setSelectedStudios(autoSelectedStudios);
                          }
                        } else if (MULTI_STUDIO_SERVICES[service.type]) {
                          // For multi-studio services, default to first valid option
                          const validTypes = MULTI_STUDIO_SERVICES[service.type];
                          const matchedStudio = studios.find(s => validTypes.includes(s.type));
                          if (matchedStudio) {
                            autoSelectedStudios = [matchedStudio.id];
                            setSelectedStudios(autoSelectedStudios);
                          }
                        }
                        
                      }}
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
                            <CardDescription className="text-xs">
                              {service.type === 'photoshoot' 
                                ? 'Unedited photos only – editing add-on sold separately' 
                                : service.description}
                            </CardDescription>
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

              {/* Editing Question - shown after service selection */}
              {(serviceType === 'photoshoot' || serviceType === 'vodcast') && (
                <Card className={cn(
                  "transition-all",
                  wantsEditing !== null && "ring-2 ring-primary"
                )}>
                  <CardHeader className="p-4">
                    <CardTitle className="text-sm">
                      {serviceType === 'photoshoot' 
                        ? 'Do you want photo editing included?' 
                        : 'Do you want video editing included?'}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {serviceType === 'photoshoot'
                        ? 'Editing is sold separately. You can add it now or later.'
                        : 'Video editing services for post-production.'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-3">
                    <div
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors",
                        wantsEditing === true && "bg-primary/10 border-primary"
                      )}
                      onClick={() => setWantsEditing(true)}
                    >
                      <div className={cn(
                        "h-4 w-4 rounded-full border-2 flex items-center justify-center",
                        wantsEditing === true ? "border-primary" : "border-muted-foreground/30"
                      )}>
                        {wantsEditing === true && <div className="h-2 w-2 rounded-full bg-primary" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {serviceType === 'photoshoot' ? 'Yes, include photo editing' : 'Yes, include video editing'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {serviceType === 'photoshoot' 
                            ? 'Starting at $10/edit, 5 edit minimum' 
                            : 'Long-form or short-form video editing'}
                        </p>
                      </div>
                    </div>
                    <div
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors",
                        wantsEditing === false && "bg-muted border-foreground/20"
                      )}
                      onClick={() => {
                        setWantsEditing(false);
                        setEditingItems([]); // Clear editing items when No is selected
                      }}
                    >
                      <div className={cn(
                        "h-4 w-4 rounded-full border-2 flex items-center justify-center",
                        wantsEditing === false ? "border-foreground/50" : "border-muted-foreground/30"
                      )}>
                        {wantsEditing === false && <div className="h-2 w-2 rounded-full bg-foreground/50" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {serviceType === 'photoshoot' ? 'No, unedited photos only' : 'No, raw footage only'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {serviceType === 'photoshoot'
                            ? 'Client receives unedited files'
                            : 'Client receives raw video files'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Studio Selection - only for multi-studio services like vodcast */}
              {serviceType && MULTI_STUDIO_SERVICES[serviceType] && (
                <div className="space-y-2">
                  <Label>Where will this take place?</Label>
                  <div className="grid gap-3">
                    {studios
                      .filter(s => s.is_active && MULTI_STUDIO_SERVICES[serviceType]?.includes(s.type))
                      .map(studio => (
                        <Card
                          key={studio.id}
                          className={cn(
                            "cursor-pointer transition-all hover:shadow-md",
                            selectedStudios.includes(studio.id) && "ring-2 ring-primary"
                          )}
                          onClick={() => {
                            setSelectedStudios([studio.id]);
                            setAvailabilityConflict(null);
                          }}
                        >
                          <CardHeader className="p-4">
                            <div className="flex items-center gap-3">
                              <Building2 className="h-5 w-5" />
                              <CardTitle className="text-sm">{studio.name}</CardTitle>
                              {selectedStudios.includes(studio.id) && (
                                <Check className="h-4 w-4 text-primary ml-auto" />
                              )}
                            </div>
                          </CardHeader>
                        </Card>
                      ))}
                  </div>
                </div>
              )}

              {/* Studio confirmation for single-studio services */}
              {serviceType && SINGLE_STUDIO_SERVICES[serviceType] && !availabilityConflict?.hasConflict && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
                  <Building2 className="h-4 w-4" />
                  <span>
                    {studios.find(s => s.type === SINGLE_STUDIO_SERVICES[serviceType])?.name || 'Studio'} will be reserved
                  </span>
                </div>
              )}

              {/* DIY: Loading state while checking availability */}
              {sessionType === 'diy' && isCheckingAvailability && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 rounded-md border">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span>Checking availability...</span>
                </div>
              )}

              {/* DIY: Availability Conflict Banner */}
              {sessionType === 'diy' && availabilityConflict?.hasConflict && !isCheckingAvailability && (
                <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/30">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="h-5 w-5" />
                      <CardTitle className="text-sm">Time Slot Unavailable</CardTitle>
                    </div>
                    <CardDescription className="text-xs text-amber-600 dark:text-amber-500">
                      {availabilityConflict.message}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-3">
                    {availabilityConflict.suggestedTimes?.before && availabilityConflict.suggestedTimes.before.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-2">Earlier options:</p>
                        <div className="flex flex-wrap gap-2">
                          {availabilityConflict.suggestedTimes.before.map(time => (
                            <Button key={time} variant="outline" size="sm" onClick={() => handleSuggestedTimeSelect(time)}>
                              {to12Hour(time)}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                    {availabilityConflict.suggestedTimes?.after && availabilityConflict.suggestedTimes.after.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-2">Later options:</p>
                        <div className="flex flex-wrap gap-2">
                          {availabilityConflict.suggestedTimes.after.map(time => (
                            <Button key={time} variant="outline" size="sm" onClick={() => handleSuggestedTimeSelect(time)}>
                              {to12Hour(time)}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                    {availabilityConflict.nextDayTime && (
                      <div>
                        <p className="text-xs font-medium mb-2">Next available day:</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleNextDaySelect(availabilityConflict.nextDayTime!.date, availabilityConflict.nextDayTime!.time)}
                        >
                          {format(availabilityConflict.nextDayTime.date, 'EEE, MMM d')} at {to12Hour(availabilityConflict.nextDayTime.time)}
                        </Button>
                      </div>
                    )}
                    <Separator />
                    <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowDateTimeEditor(true)}>
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      Choose a different date/time
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* DIY: Date/Time Editor Dialog */}
              {sessionType === 'diy' && (
                <Dialog open={showDateTimeEditor} onOpenChange={setShowDateTimeEditor}>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Change Date & Time</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Date</Label>
                        <div className="mt-2">
                          <Calendar
                            mode="single"
                            selected={date}
                            onSelect={(newDate) => { if (newDate) setDate(newDate); }}
                            disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                            className="pointer-events-auto rounded-md border"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Start Time</Label>
                          <Select value={startTime} onValueChange={setStartTime}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {timeSlots.map(slot => <SelectItem key={slot} value={slot}>{slot}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Duration</Label>
                          <Select value={sessionDuration.toString()} onValueChange={(v) => setSessionDuration(Number(v))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {[1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8].map(h => <SelectItem key={h} value={h.toString()}>{formatDuration(h)}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowDateTimeEditor(false)}>Cancel</Button>
                      <Button onClick={async () => { setShowDateTimeEditor(false); if (selectedStudios.length > 0) await checkServiceAvailability(selectedStudios); }}>
                        Check Availability
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
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
                  onValueChange={([value]) => {
                    setSessionDuration(value);
                    // Sync with DayView temp booking
                    if (onDurationChange && date) {
                      const startTime24 = to24Hour(startTime);
                      const [startH, startM] = startTime24.split(':').map(Number);
                      const endMinutes = startH * 60 + startM + value * 60;
                      const endH = Math.floor(endMinutes / 60);
                      const endM = Math.round(endMinutes % 60);
                      const newEndTime24 = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
                      onDurationChange(selectedStudios, startTime24, newEndTime24);
                    }
                  }}
                  min={1}
                  max={8}
                  step={0.25}
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
                  {isPhotoshootServiced 
                    ? 'Photoshoots require an Expert Photographer.' 
                    : 'At least one crew member is required for serviced sessions.'}
                </p>
                
                {(['lv1', 'lv2', 'lv3'] as const).map(level => {
                  const provider = providerLevels.find(p => p.level === level);
                  const count = crewAllocation[level];
                  const levelLabels = { lv1: 'Entry Level', lv2: 'Experienced', lv3: 'Expert' };
                  const isLevelDisabled = isPhotoshootServiced && level !== 'lv3';
                  
                  return (
                    <div key={level} className={cn(
                      "flex items-center justify-between p-3 border rounded-md",
                      isLevelDisabled && "opacity-50"
                    )}>
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
                          disabled={isLevelDisabled || count === 0 || (totalCrew === 1 && count === 1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center font-medium">{count}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateCrewLevel(level, 1)}
                          disabled={isLevelDisabled}
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
                      {[1, 2, 3].map(count => (
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

              {/* Auto-Included Add-ons - hidden from UI but still calculated in price */}

              {/* Session Add-ons */}
              {availableAddons.length > 0 && (
                <div className="space-y-3">
                  {availableAddons.map(addon => {
                    const isSelected = selectedAddons.includes(addon.id);
                    const hrs = addonHours[addon.id] || 1;
                    return (
                      <Card
                        key={addon.id}
                        className={cn(
                          "cursor-pointer transition-all",
                          isSelected && "ring-2 ring-primary"
                        )}
                        onClick={() => toggleAddon(addon.id)}
                      >
                        <CardHeader className="p-4 pb-2">
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
                        {/* Hour selector for hourly add-ons */}
                        {isSelected && addon.is_hourly && (
                          <CardContent className="p-4 pt-0" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Hours:</span>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={(e) => { e.stopPropagation(); updateAddonHours(addon.id, hrs - 1); }}
                                  disabled={hrs <= 1}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <Input
                                  type="number"
                                  value={hrs}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => updateAddonHours(addon.id, parseInt(e.target.value) || 1)}
                                  className="w-14 h-7 text-center text-sm"
                                  min={1}
                                />
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={(e) => { e.stopPropagation(); updateAddonHours(addon.id, hrs + 1); }}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                                <span className="text-sm font-medium ml-2">= ${hrs * Number(addon.flat_amount)}</span>
                              </div>
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Photo Editing (for photoshoot service) */}
              {photoEditingItems.length > 0 && (
                <Card>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Camera className="h-4 w-4" />
                      Photo Editing
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Select editing services and quantity
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-3">
                    {photoEditingItems.map(item => {
                      const selectedItem = editingItems.find(e => e.id === item.id);
                      const isSelected = !!selectedItem;
                      const quantity = selectedItem?.quantity || 0;
                      const customerPrice = Number(item.customer_price || item.base_price * 2);
                      const isSimpleRetouch = item.name === 'Simple Retouch Edit';
                      const itemTotal = quantity * customerPrice;

                      return (
                        <div key={item.id} className="space-y-2 py-2 border-b last:border-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Switch
                                checked={isSelected}
                                onCheckedChange={() => toggleEditingItem(item)}
                              />
                              <div>
                                <p className="text-sm font-medium">{item.name}</p>
                                <p className="text-xs text-muted-foreground">{item.description}</p>
                                {isSimpleRetouch && (
                                  <p className="text-xs text-primary font-medium">5 edit minimum ($50)</p>
                                )}
                              </div>
                            </div>
                            <span className="text-sm font-medium">${customerPrice}/edit</span>
                          </div>

                          {isSelected && (
                            <div className="flex items-center justify-between pl-12">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => updateEditingQuantity(item.id, quantity - 1)}
                                  disabled={isSimpleRetouch ? quantity <= 5 : quantity <= 1}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <Input
                                  type="number"
                                  value={quantity}
                                  onChange={(e) => updateEditingQuantity(item.id, parseInt(e.target.value) || 1)}
                                  className="w-14 h-7 text-center text-sm"
                                  min={isSimpleRetouch ? 5 : 1}
                                />
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => updateEditingQuantity(item.id, quantity + 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                              <span className="text-sm font-bold">= ${itemTotal}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {/* Video Editing (for vodcast service) */}
              {videoEditingItems.length > 0 && (
                <Card>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Video className="h-4 w-4" />
                      Video Editing
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Select editing services and editor level
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-3">
                    {videoEditingItems.map(item => {
                      const selectedItem = editingItems.find(e => e.id === item.id);
                      const isSelected = !!selectedItem;
                      const customerPrice = Number(item.customer_price || item.base_price * 2);
                      const crewLevel = selectedItem?.crewLevel || 'lv2';
                      const isLongForm = item.category?.startsWith('long_form');
                      
                      // Crew level multipliers for post-production
                      const EDITING_CREW_MULTIPLIERS: Record<string, number> = { lv1: 0.75, lv2: 1, lv3: 1.25 };
                      const multiplier = EDITING_CREW_MULTIPLIERS[crewLevel] || 1;
                      const adjustedPrice = Math.round(customerPrice * multiplier);

                      return (
                        <div key={item.id} className="space-y-2 py-2 border-b last:border-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Switch
                                checked={isSelected}
                                onCheckedChange={() => toggleEditingItem(item)}
                              />
                              <div>
                                <p className="text-sm font-medium flex items-center gap-2">
                                  {item.name}
                                  {isLongForm && (
                                    <Badge className="bg-amber-400 text-amber-900 border-amber-500 hover:bg-amber-400">
                                      Recommended
                                    </Badge>
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground">{item.description}</p>
                              </div>
                            </div>
                            <span className="text-sm font-medium">from ${customerPrice}</span>
                          </div>

                          {/* Crew Level Selection - Radio buttons with multipliers */}
                          {isSelected && (
                            <div className="pl-12 space-y-3">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Users className="h-4 w-4" />
                                <span>Editor Level:</span>
                              </div>
                              
                              <div className="flex flex-col gap-2 pl-4">
                                {/* Lv1 Entry - 0.75x */}
                                <label className={cn(
                                  "flex items-center justify-between p-2 rounded-md border cursor-pointer transition-colors",
                                  crewLevel === 'lv1' ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                                )}>
                                  <div className="flex items-center gap-3">
                                    <input
                                      type="radio"
                                      name={`crew-level-${item.id}`}
                                      checked={crewLevel === 'lv1'}
                                      onChange={() => updateEditingCrewLevel(item.id, 'lv1')}
                                      className="h-4 w-4 text-primary"
                                    />
                                    <span className="text-sm font-medium">Lv1 Entry</span>
                                  </div>
                                  <Badge variant="secondary" className="text-xs">0.75x</Badge>
                                </label>
                                
                                {/* Lv2 Experienced - 1x (Standard) */}
                                <label className={cn(
                                  "flex items-center justify-between p-2 rounded-md border cursor-pointer transition-colors",
                                  crewLevel === 'lv2' ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                                )}>
                                  <div className="flex items-center gap-3">
                                    <input
                                      type="radio"
                                      name={`crew-level-${item.id}`}
                                      checked={crewLevel === 'lv2'}
                                      onChange={() => updateEditingCrewLevel(item.id, 'lv2')}
                                      className="h-4 w-4 text-primary"
                                    />
                                    <span className="text-sm font-medium">Lv2 Experienced</span>
                                    <Badge variant="outline" className="text-xs text-primary border-primary">Standard</Badge>
                                  </div>
                                  <Badge variant="secondary" className="text-xs">1x</Badge>
                                </label>
                                
                                {/* Lv3 Expert - 1.25x */}
                                <label className={cn(
                                  "flex items-center justify-between p-2 rounded-md border cursor-pointer transition-colors",
                                  crewLevel === 'lv3' ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                                )}>
                                  <div className="flex items-center gap-3">
                                    <input
                                      type="radio"
                                      name={`crew-level-${item.id}`}
                                      checked={crewLevel === 'lv3'}
                                      onChange={() => updateEditingCrewLevel(item.id, 'lv3')}
                                      className="h-4 w-4 text-primary"
                                    />
                                    <span className="text-sm font-medium">Lv3 Expert</span>
                                  </div>
                                  <Badge variant="secondary" className="text-xs">1.25x</Badge>
                                </label>
                              </div>
                              
                              <div className="flex justify-end pt-2">
                                <span className="text-sm font-bold">= ${adjustedPrice}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {/* Revisions add-on - only available in post-production flow, not calendar booking */}

              {/* Line Items Breakdown */}
              {lineItems.length > 0 && (
                <Card className="mt-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Cost Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {lineItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span>${item.amount.toFixed(2)}</span>
                      </div>
                    ))}
                    <Separator className="my-2" />
                    <div className="flex justify-between font-semibold">
                      <span>Estimated Total</span>
                      <span className="text-lg">${calculatedPrice.toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* STEP: SUMMARY */}
          {step === 'summary' && (
            <div className="space-y-4">
              {/* Schedule Your Session Card - for serviced sessions */}
              <Card className="border-primary/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarPlus className="h-4 w-4" />
                    Schedule Your Session
                  </CardTitle>
                  <CardDescription>Select when you'd like to book</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Date Picker */}
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

                  {/* Start Time Selector */}
                  <div className="space-y-2">
                    <Label>Start Time *</Label>
                    <Select value={startTime} onValueChange={handleStartTimeChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map(slot => (
                          <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Session ends at {computedEndTime} ({formatDuration(sessionDuration)})
                    </p>
                  </div>

                  {/* Expected People Count - for serviced sessions */}
                  {sessionType === 'serviced' && bookingType === 'customer' && (
                    <div className="space-y-2">
                      <Label htmlFor="people-count-summary">Expected people count</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="people-count-summary"
                          type="number"
                          min={1}
                          value={peopleCount || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '') {
                              setPeopleCount(0);
                            } else {
                              const parsed = parseInt(val);
                              if (!isNaN(parsed) && parsed >= 0) {
                                setPeopleCount(parsed);
                              }
                            }
                          }}
                          onBlur={() => {
                            if (peopleCount < 1) {
                              setPeopleCount(1);
                            }
                          }}
                          className="w-20"
                        />
                        <Users className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  )}

                  {/* Live Availability Indicator */}
                  {date && selectedStudios.length > 0 && (() => {
                    const conflicts = selectedStudios
                      .filter(id => studioAvailability[id]?.available === false)
                      .map(id => {
                        const studio = studios.find(s => s.id === id);
                        return {
                          name: studio?.name || 'Unknown',
                          time: studioAvailability[id]?.conflictTime
                        };
                      });
                    
                    if (conflicts.length === 0) {
                      return (
                        <div className="flex items-center gap-2 text-green-600 text-sm p-2 bg-green-50 dark:bg-green-950/30 rounded">
                          <Check className="h-4 w-4" />
                          <span>Time slot is available!</span>
                        </div>
                      );
                    }
                    
                    return (
                      <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/30">
                        <CardHeader className="p-4 pb-2">
                          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                            <AlertTriangle className="h-5 w-5" />
                            <CardTitle className="text-sm">Time Slot Unavailable</CardTitle>
                          </div>
                          <CardDescription className="text-xs text-amber-600 dark:text-amber-500">
                            {conflicts.map(c => `${c.name} is unavailable${c.time ? ` @ ${c.time}` : ''}`).join('; ')}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-3">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full gap-2"
                            onClick={async () => {
                              if (!date || selectedStudios.length === 0 || !startTime) return;
                              setIsCheckingAvailability(true);
                              try {
                                const bookingDate = format(date, 'yyyy-MM-dd');
                                const startTime24 = to24Hour(startTime);
                                const durationMins = Math.round(sessionDuration * 60);
                                
                                const suggestions = await findAvailableSlots(
                                  selectedStudios,
                                  bookingDate,
                                  startTime24,
                                  durationMins,
                                  15
                                );
                                
                                const nextSlot = suggestions.afterSlots[0] || suggestions.beforeSlots[0];
                                
                                if (nextSlot) {
                                  setStartTime(to12Hour(nextSlot));
                                  toast({ title: 'Available slot found', description: `Updated to ${to12Hour(nextSlot)}` });
                                } else if (suggestions.nextDaySlot) {
                                  setDate(suggestions.nextDaySlot.date);
                                  setStartTime(to12Hour(suggestions.nextDaySlot.time));
                                  toast({ title: 'No slots today', description: `Moved to ${format(suggestions.nextDaySlot.date, 'MMM d')} at ${to12Hour(suggestions.nextDaySlot.time)}` });
                                } else {
                                  toast({ title: 'No available slots', description: 'Try a different date or shorter duration.', variant: 'destructive' });
                                }
                              } catch (error) {
                                console.error('Error finding slot:', error);
                              } finally {
                                setIsCheckingAvailability(false);
                              }
                            }}
                            disabled={isCheckingAvailability}
                          >
                            <Search className="h-4 w-4" />
                            {isCheckingAvailability ? 'Searching...' : 'Find Available Slot'}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })()}

                  {/* Repeat Options */}
                  {!isEditing && (
                    <RepeatOptions
                      config={repeatConfig}
                      onChange={setRepeatConfig}
                      startDate={date || new Date()}
                      startTime={startTime}
                    />
                  )}
                  {isEditing && existingRepeatInfo?.pattern && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Repeat className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Part of repeat series</span>
                        <Badge variant="secondary" className="font-normal">
                          {editScope === 'series' ? 'Full series' : editScope === 'from_here' ? 'This & following' : 'Single occurrence'}
                        </Badge>
                      </div>
                      <RepeatOptions
                        config={repeatConfig}
                        onChange={setRepeatConfig}
                        startDate={date || new Date()}
                        startTime={startTime}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

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
                    <span className="text-muted-foreground">Duration</span>
                    <span>{formatDuration(sessionDuration)}</span>
                  </div>
                  
                  <Separator className="my-2" />
                  
                  {/* Spaces with rates */}
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">Spaces</span>
                    {studioRatesDisplay.map((studio, idx) => (
                      <div key={idx} className="flex justify-between text-sm pl-2">
                        <span>{studio.name}</span>
                        <span className="text-muted-foreground">{studio.rateText}</span>
                      </div>
                    ))}
                  </div>
                  
                  <Separator className="my-2" />
                  
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
                  
                  {/* Video Editing Add-ons */}
                  {editingItems.filter(item => item.category !== 'photo' && item.category !== 'photo_editing').length > 0 && (
                    <>
                      <Separator className="my-2" />
                      <div className="space-y-2">
                        <span className="text-sm text-muted-foreground">Video Editing</span>
                        {editingItems
                          .filter(item => item.category !== 'photo' && item.category !== 'photo_editing')
                          .map((item, idx) => {
                            const crewLevel = item.crewLevel || 'lv2';
                            const levelLabels: Record<string, string> = { lv1: 'Entry (0.75×)', lv2: 'Exp (1×)', lv3: 'Expert (1.25×)' };
                            const EDITING_CREW_MULTIPLIERS: Record<string, number> = { lv1: 0.75, lv2: 1, lv3: 1.25 };
                            const multiplier = EDITING_CREW_MULTIPLIERS[crewLevel] || 1;
                            const itemTotal = Math.round(item.customerPrice * multiplier);
                            
                            return (
                              <div key={idx} className="flex justify-between text-sm pl-2">
                                <span>{item.name} ({levelLabels[crewLevel]})</span>
                                <span className="text-muted-foreground">${itemTotal.toFixed(2)}</span>
                              </div>
                            );
                          })}
                      </div>
                    </>
                  )}

                  {/* Photo Editing Add-ons */}
                  {editingItems.filter(item => item.category === 'photo' || item.category === 'photo_editing').length > 0 && (
                    <>
                      <Separator className="my-2" />
                      <div className="space-y-2">
                        <span className="text-sm text-muted-foreground">Photo Editing</span>
                        {editingItems
                          .filter(item => item.category === 'photo' || item.category === 'photo_editing')
                          .map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm pl-2">
                              <span>{item.name} ({item.quantity} edits)</span>
                              <span className="text-muted-foreground">${(item.quantity * item.customerPrice).toFixed(2)}</span>
                            </div>
                          ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Detailed Cost Breakdown */}
              {lineItems.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Cost Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {lineItems.map((item, idx) => (
                      <div key={idx} className={cn(
                        "flex justify-between text-sm",
                        item.isHeader && "font-medium text-foreground"
                      )}>
                        <span className={item.isHeader ? "" : "text-muted-foreground"}>{item.label}</span>
                        {!item.isHeader && <span>${item.amount.toFixed(2)}</span>}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Total */}
              <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                <span className="font-medium">Estimated Total</span>
                <span className="text-2xl font-bold">${displayPrice.toFixed(2)}</span>
              </div>

              {/* Affiliate Code with auto-validation */}
              <AffiliateCodeInput
                value={affiliateCode}
                onChange={(code, name) => {
                  setAffiliateCode(code);
                  setAffiliateName(name);
                }}
              />
            </div>
          )}

          {/* Running Total + Cost Breakdown (for multi-step serviced sessions on service/duration steps) */}
          {isMultiStep && (step === 'service' || step === 'duration') && lineItems.length > 0 && (
            <Card className="bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Cost Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {lineItems.map((item, idx) => (
                  <div key={idx} className={cn(
                    "flex justify-between text-sm",
                    item.isHeader && "font-medium text-foreground"
                  )}>
                    <span className={item.isHeader ? "" : "text-muted-foreground"}>{item.label}</span>
                    {!item.isHeader && <span>${item.amount.toFixed(2)}</span>}
                  </div>
                ))}
                <Separator className="my-2" />
                <div className="flex justify-between items-center font-medium">
                  <span>Estimated Total</span>
                  <span className="text-lg">${calculatedPrice.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex flex-col gap-4 pt-4">
          {/* Non-customer booking (internal/unavailable): single-step */}
          {!isMultiStep && (
            <>
              <div className="flex gap-2 w-full sm:w-auto">
                {isEditing ? (
                  <>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={isSubmitting}>
                          <Trash2 className="h-4 w-4 mr-1" />
                          Cancel Booking
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will mark the booking as cancelled. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              if (existingBooking) {
                                try {
                                  await cancelBooking.mutateAsync(existingBooking.id);
                                  toast({ title: 'Booking cancelled' });
                                  onClose();
                                  onBookingCreated?.();
                                } catch (error) {
                                  toast({ title: 'Error', description: 'Failed to cancel booking', variant: 'destructive' });
                                }
                              }
                            }}
                          >
                            Yes, Cancel
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button onClick={handleUpdateBooking} disabled={isSubmitting}>
                      <Save className="h-4 w-4 mr-1" />
                      {isSubmitting ? 'Saving...' : 'Update Booking'}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                      {isSubmitting ? 'Creating...' : 'Confirm booking'}
                    </Button>
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                      Cancel
                    </Button>
                  </>
                )}
              </div>
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
                  // Summary step - different buttons for editing vs new
                  isEditing ? (
                    <>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" disabled={isSubmitting}>
                            <Trash2 className="h-4 w-4 mr-1" />
                            Cancel Booking
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will mark the booking as cancelled. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={async () => {
                                if (existingBooking) {
                                  try {
                                    await cancelBooking.mutateAsync(existingBooking.id);
                                    toast({ title: 'Booking cancelled' });
                                    onClose();
                                    onBookingCreated?.();
                                  } catch (error) {
                                    toast({ title: 'Error', description: 'Failed to cancel booking', variant: 'destructive' });
                                  }
                                }
                              }}
                            >
                              Yes, Cancel
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <Button onClick={handleUpdateBooking} disabled={isSubmitting}>
                        <Save className="h-4 w-4 mr-2" />
                        {isSubmitting ? 'Updating...' : 'Update Booking'}
                      </Button>
                    </>
                  ) : (
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
                  )
                ) : sessionType === 'diy' && step === 'addons' ? (
                  // DIY session on add-ons step - show Confirm/Update Booking
                  <>
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                      Cancel
                    </Button>
                    <Button onClick={handleNext} disabled={isSubmitting}>
                      {isSubmitting ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Booking' : 'Confirm Booking')}
                    </Button>
                  </>
                ) : (
                  // Other steps - show Next
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
