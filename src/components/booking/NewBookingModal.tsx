import { useState, useMemo, useEffect } from 'react';
import { format, getDay, parseISO } from 'date-fns';
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
} from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { useProviderLevels, useServices, useVodcastCameraAddons, useSessionAddons, useEditingMenu } from '@/hooks/useEstimatorData';
import { Switch } from '@/components/ui/switch';
import { useCreateBooking, useUpdateBooking, useCancelBooking, useStudioBookings, StudioBooking } from '@/hooks/useStudioBookings';
import { AffiliateCodeInput } from '@/components/AffiliateCodeInput';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RepeatOptions, RepeatConfig, createDefaultRepeatConfig, calculateRepeatDates } from './RepeatOptions';
import { useProfiles, useCreateProfile, Profile } from '@/hooks/useProfiles';
import { useAuth } from '@/hooks/useAuth';
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
  operatingStart: string;
  operatingEnd: string;
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
  onDurationChange,
}: NewBookingModalProps) {
  const { toast } = useToast();
  const createBooking = useCreateBooking();
  const updateBooking = useUpdateBooking();
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

  // Fetch linked quote when editing a booking with a quote_id
  useEffect(() => {
    if (open && existingBooking?.quote_id) {
      supabase
        .from('quotes')
        .select('*')
        .eq('id', existingBooking.quote_id)
        .maybeSingle()
        .then(({ data }) => setLinkedQuote(data));
    } else {
      setLinkedQuote(null);
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
        setRepeatConfig(createDefaultRepeatConfig(parseISO(existingBooking.booking_date)));
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
        } else {
          // No linked quote - use defaults
          setServiceType(null);
          setSessionDuration(1);
          setCrewAllocation({ lv1: 0, lv2: 1, lv3: 0 });
          setCameraCount(1);
          setSelectedAddons([]);
          setAffiliateCode('');
          setEditingItems([]);
          setAddonHours({});
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
      }
    }
  }, [open, defaultDate, defaultStudioIds, defaultStartTime, defaultEndTime, existingBooking, linkedQuote]);

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
      // Hide service type addons (like Revisions) - they appear separately
      if (addon.addon_type === 'service') return false;
      if (addon.applies_to_session_type && addon.applies_to_session_type !== sessionType) return false;
      // Hide Set Design addon - it's auto-included for photoshoots, not user-selectable
      if (addon.name.includes('Set Design') || addon.name.includes('Photoshoot setup')) return false;
      return true;
    });
  }, [sessionAddonsData, sessionType]);

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
    return editingMenuData.filter(item => item.category === 'photo');
  }, [editingMenuData, serviceType]);

  // Filter video editing items (only for vodcast)
  const videoEditingItems = useMemo(() => {
    if (serviceType !== 'vodcast') return [];
    return editingMenuData.filter(item => item.category !== 'photo');
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
        if (editItem.category === 'photo') {
          // Photo editing: quantity × price
          total += editItem.quantity * editItem.customerPrice;
        } else {
          // Video editing: crew-based pricing
          // For each assigned crew member, multiply their hourly rate by estimated hours
          // Using base price as the hourly cost factor
          if (editItem.assignedCrew) {
            for (const level of ['lv1', 'lv2', 'lv3'] as const) {
              const crewCount = editItem.assignedCrew[level] || 0;
              if (crewCount > 0) {
                const provider = providerLevels.find(p => p.level === level);
                if (provider) {
                  // Base price from menu + provider hourly rate
                  total += editItem.customerPrice + (Number(provider.hourly_rate) * crewCount);
                }
              }
            }
          }
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
      if (editItem.category === 'photo') {
        const total = editItem.quantity * editItem.customerPrice;
        items.push({
          label: `${editItem.name} (${editItem.quantity} edits @ $${editItem.customerPrice}/edit)`,
          amount: total,
        });
      } else {
        // Video editing with crew assignment
        let crewStr = '';
        let itemTotal = 0;
        if (editItem.assignedCrew) {
          const crewParts: string[] = [];
          for (const level of ['lv1', 'lv2', 'lv3'] as const) {
            const crewCount = editItem.assignedCrew[level] || 0;
            if (crewCount > 0) {
              const provider = providerLevels.find(p => p.level === level);
              if (provider) {
                const levelLabels: Record<string, string> = { lv1: 'Lv1', lv2: 'Lv2', lv3: 'Lv3' };
                crewParts.push(crewCount > 1 ? `${levelLabels[level]} ×${crewCount}` : levelLabels[level]);
                itemTotal += editItem.customerPrice + (Number(provider.hourly_rate) * crewCount);
              }
            }
          }
          if (crewParts.length > 0) crewStr = ` • ${crewParts.join(', ')}`;
        }
        items.push({
          label: `${editItem.name}${crewStr}`,
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

  // Handle start time change - for serviced sessions, maintain duration and recalculate end time
  const handleStartTimeChange = (newStartTime: string) => {
    setStartTime(newStartTime);
    if (sessionType === 'serviced' && onDurationChange && selectedStudios.length > 0) {
      // Recalculate end time based on current duration
      const startTime24 = to24Hour(newStartTime);
      const [startH, startM] = startTime24.split(':').map(Number);
      const endMinutes = startH * 60 + startM + sessionDuration * 60;
      const endH = Math.floor(endMinutes / 60);
      const endM = Math.round(endMinutes % 60);
      const newEndTime24 = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
      onDurationChange(selectedStudios, startTime24, newEndTime24);
    }
  };

  // Handle end time change - for serviced sessions, calculate new duration from start/end times
  const handleEndTimeChange = (newEndTime: string) => {
    if (sessionType === 'serviced') {
      // Calculate new duration from start and end times
      const newDuration = calculateHours(startTime, newEndTime);
      // Clamp duration between 1 and 8 hours
      if (newDuration >= 1 && newDuration <= 8) {
        setSessionDuration(newDuration);
        // Notify calendar view
        if (onDurationChange && selectedStudios.length > 0) {
          onDurationChange(selectedStudios, to24Hour(startTime), to24Hour(newEndTime));
        }
      }
    } else {
      setEndTime(newEndTime);
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
      const isVideoEditing = item.category !== 'photo';
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
          // For video editing, add crew assignment with default of 1 Lv2
          assignedCrew: isVideoEditing ? { lv1: 0, lv2: 1, lv3: 0 } : undefined,
        },
      ]);
    }
  };

  // Update crew assignment for a video editing item
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

  // Get current step index based on session type
  const activeSteps = sessionType === 'diy' ? DIY_STEPS : SERVICED_STEPS;
  const currentStepIndex = activeSteps.findIndex(s => s.key === step);

  const handleNext = async () => {
    // Validate basic step for all session types
    if (step === 'basic') {
      if (!date) {
        toast({ title: 'Please select a date', variant: 'destructive' });
        return;
      }
      // Only require manual space selection for DIY sessions
      if (sessionType === 'diy' && selectedStudios.length === 0) {
        toast({ title: 'Please select at least one space', variant: 'destructive' });
        return;
      }
      // Calculate hours using correct end time based on session type
      // For serviced sessions, endTime state is stale - use computedEndTime instead
      const effectiveEndTime = sessionType === 'serviced' ? computedEndTime : endTime;
      const calculatedHours = calculateHours(startTime, effectiveEndTime);
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
      
      // DIY goes to addons step
      if (sessionType === 'diy') {
        setStep('addons');
        return;
      }
      
      // Serviced goes to service step
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
      // Validate video editing items have crew assigned (for vodcast)
      if (sessionType === 'serviced' && serviceType === 'vodcast') {
        const videoItemsWithNoCrew = editingItems.filter(item => {
          if (item.category === 'photo_editing') return false;
          return getVideoEditingCrewTotal(item) === 0;
        });
        
        if (videoItemsWithNoCrew.length > 0) {
          toast({ 
            title: 'Crew Required', 
            description: `Please assign at least one crew member to: ${videoItemsWithNoCrew.map(i => i.name).join(', ')}`,
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
          details: details || null,
          quote_id: null,
          created_by: null,
          title: title || null,
          people_count: peopleCount || 1,
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
                details: details || null,
                quote_id: null,
                created_by: null,
                title: title || null,
                people_count: peopleCount || 1,
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
        details: details || null,
        title: title || null,
        people_count: peopleCount || 1,
      });
      
      // Also update the linked quote if it exists
      if (existingBooking.quote_id) {
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
            })),
            totals_json: { customerTotal: displayPrice },
          })
          .eq('id', existingBooking.quote_id);
      }
      
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

              {/* Expected People Count */}
              <div className="space-y-2">
                <Label htmlFor="people-count">Expected people count</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="people-count"
                    type="number"
                    min={1}
                    value={peopleCount}
                    onChange={(e) => setPeopleCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20"
                  />
                  <Users className="h-4 w-4 text-muted-foreground" />
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
                      value={sessionType === 'serviced' ? computedEndTime : endTime} 
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
                {sessionType === 'diy' && hours > 0 && (
                  <p className="text-xs text-muted-foreground">{hours} hour{hours !== 1 ? 's' : ''}</p>
                )}
                {sessionType === 'serviced' && sessionDuration > 0 && (
                  <p className="text-xs text-muted-foreground">{formatDuration(sessionDuration)} — synced with Duration step</p>
                )}
              </div>

              {/* Repeat */}
              <RepeatOptions
                config={repeatConfig}
                onChange={setRepeatConfig}
                startDate={date || new Date()}
                startTime={startTime}
              />

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
              )}

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
                            }}
                            placeholder="First name"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Last name *</Label>
                          <Input
                            value={newUserLastName}
                            onChange={(e) => {
                              setNewUserLastName(e.target.value);
                              setCustomerName(`${newUserFirstName} ${e.target.value}`.trim());
                            }}
                            placeholder="Last name"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm">Email *</Label>
                        <Input
                          type="email"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          placeholder="email@example.com"
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
                      <div>
                        <Label className="text-sm">Organization</Label>
                        <Input
                          value={newUserOrganization}
                          onChange={(e) => setNewUserOrganization(e.target.value)}
                          placeholder="Company or organization"
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
                      onClick={() => {
                        setServiceType(service.type);
                        setWantsEditing(null); // Reset editing preference when service changes
                        setEditingItems([]); // Clear editing items when service changes
                        
                        // Auto-select studio based on service type
                        if (SINGLE_STUDIO_SERVICES[service.type]) {
                          const studioType = SINGLE_STUDIO_SERVICES[service.type];
                          const matchedStudio = studios.find(s => s.type === studioType);
                          if (matchedStudio) {
                            setSelectedStudios([matchedStudio.id]);
                          }
                        } else if (MULTI_STUDIO_SERVICES[service.type]) {
                          // For multi-studio services, default to first valid option
                          const validTypes = MULTI_STUDIO_SERVICES[service.type];
                          const matchedStudio = studios.find(s => validTypes.includes(s.type));
                          if (matchedStudio) {
                            setSelectedStudios([matchedStudio.id]);
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
                          onClick={() => setSelectedStudios([studio.id])}
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
              {serviceType && SINGLE_STUDIO_SERVICES[serviceType] && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
                  <Building2 className="h-4 w-4" />
                  <span>
                    {studios.find(s => s.type === SINGLE_STUDIO_SERVICES[serviceType])?.name || 'Studio'} will be reserved
                  </span>
                </div>
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

              {/* Auto-Included Add-ons */}
              {autoIncludedAddons.length > 0 && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      Included with Session
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    {autoIncludedAddons.map(addon => (
                      <div key={addon.id} className="flex items-center justify-between py-1">
                        <span className="text-sm">Photoshoot setup fee (included)</span>
                        <Badge variant="secondary">+${addon.flat_amount}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

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
                      Select editing services and assign production crew
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-3">
                    {videoEditingItems.map(item => {
                      const selectedItem = editingItems.find(e => e.id === item.id);
                      const isSelected = !!selectedItem;
                      const itemCrew = selectedItem?.assignedCrew || { lv1: 0, lv2: 0, lv3: 0 };
                      const crewTotal = (itemCrew.lv1 || 0) + (itemCrew.lv2 || 0) + (itemCrew.lv3 || 0);
                      const customerPrice = Number(item.customer_price || item.base_price * 2);
                      
                      // Calculate item total with crew
                      let itemTotal = 0;
                      if (isSelected && selectedItem) {
                        for (const level of ['lv1', 'lv2', 'lv3'] as const) {
                          const crewCount = itemCrew[level] || 0;
                          if (crewCount > 0) {
                            const provider = providerLevels.find(p => p.level === level);
                            if (provider) {
                              itemTotal += customerPrice + (Number(provider.hourly_rate) * crewCount);
                            }
                          }
                        }
                      }

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
                              </div>
                            </div>
                            <span className="text-sm font-medium">${customerPrice}</span>
                          </div>

                          {/* Crew Assignment when selected */}
                          {isSelected && (
                            <div className="pl-12 space-y-2">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Users className="h-4 w-4" />
                                <span>Assign Production Crew:</span>
                                {crewTotal === 0 && (
                                  <span className="text-xs text-destructive">(min 1 required)</span>
                                )}
                              </div>
                              
                              {(['lv1', 'lv2', 'lv3'] as const).map(level => {
                                const provider = providerLevels.find(p => p.level === level);
                                const levelLabels: Record<string, string> = { lv1: 'Lv1 Entry', lv2: 'Lv2 Experienced', lv3: 'Lv3 Expert' };
                                const count = itemCrew[level] || 0;
                                
                                return (
                                  <div key={level} className="flex items-center justify-between pl-4">
                                    <span className="text-xs text-muted-foreground">
                                      {levelLabels[level]} (${provider?.hourly_rate || 0}/hr)
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => updateEditingCrewAssignment(item.id, level, -1)}
                                        disabled={count <= 0}
                                      >
                                        <Minus className="h-2 w-2" />
                                      </Button>
                                      <span className="w-5 text-center text-xs font-medium">{count}</span>
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => updateEditingCrewAssignment(item.id, level, 1)}
                                      >
                                        <Plus className="h-2 w-2" />
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                              
                              {itemTotal > 0 && (
                                <div className="flex justify-end pt-2">
                                  <span className="text-sm font-bold">= ${itemTotal}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {/* Revisions add-on (hourly) */}
              {revisionsAddon && sessionType === 'serviced' && (
                <Card>
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={selectedAddons.includes(revisionsAddon.id)}
                          onCheckedChange={() => toggleAddon(revisionsAddon.id)}
                        />
                        <div>
                          <CardTitle className="text-sm">{revisionsAddon.name}</CardTitle>
                          {revisionsAddon.description && (
                            <CardDescription className="text-xs">{revisionsAddon.description}</CardDescription>
                          )}
                        </div>
                      </div>
                      <Badge variant="secondary">+${revisionsAddon.flat_amount}/hr</Badge>
                    </div>
                  </CardHeader>
                  {selectedAddons.includes(revisionsAddon.id) && (
                    <CardContent className="p-4 pt-0">
                      <div className="flex items-center justify-between pl-12">
                        <span className="text-xs text-muted-foreground">Hours:</span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateAddonHours(revisionsAddon.id, (addonHours[revisionsAddon.id] || 1) - 1)}
                            disabled={(addonHours[revisionsAddon.id] || 1) <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            value={addonHours[revisionsAddon.id] || 1}
                            onChange={(e) => updateAddonHours(revisionsAddon.id, parseInt(e.target.value) || 1)}
                            className="w-14 h-7 text-center text-sm"
                            min={1}
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateAddonHours(revisionsAddon.id, (addonHours[revisionsAddon.id] || 1) + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm font-medium ml-2">
                            = ${(addonHours[revisionsAddon.id] || 1) * Number(revisionsAddon.flat_amount)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              )}

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
                    <span>{date ? format(date, 'EEEE, MMM d, yyyy') : '-'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Time</span>
                    <span>{startTime} – {computedEndTime}</span>
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
                  {editingItems.filter(item => item.category !== 'photo').length > 0 && (
                    <>
                      <Separator className="my-2" />
                      <div className="space-y-2">
                        <span className="text-sm text-muted-foreground">Video Editing</span>
                        {editingItems
                          .filter(item => item.category !== 'photo')
                          .map((item, idx) => {
                            const crewParts: string[] = [];
                            let itemTotal = 0;
                            if (item.assignedCrew) {
                              for (const level of ['lv1', 'lv2', 'lv3'] as const) {
                                const crewCount = item.assignedCrew[level] || 0;
                                if (crewCount > 0) {
                                  const provider = providerLevels.find(p => p.level === level);
                                  const levelLabels: Record<string, string> = { lv1: 'Entry', lv2: 'Exp', lv3: 'Expert' };
                                  crewParts.push(`${crewCount}× ${levelLabels[level]}`);
                                  if (provider) {
                                    itemTotal += item.customerPrice + (Number(provider.hourly_rate) * crewCount);
                                  }
                                }
                              }
                            }
                            return (
                              <div key={idx} className="flex justify-between text-sm pl-2">
                                <span>{item.name} ({crewParts.join(', ')})</span>
                                <span className="text-muted-foreground">${itemTotal.toFixed(2)}</span>
                              </div>
                            );
                          })}
                      </div>
                    </>
                  )}

                  {/* Photo Editing Add-ons */}
                  {editingItems.filter(item => item.category === 'photo').length > 0 && (
                    <>
                      <Separator className="my-2" />
                      <div className="space-y-2">
                        <span className="text-sm text-muted-foreground">Photo Editing</span>
                        {editingItems
                          .filter(item => item.category === 'photo')
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
