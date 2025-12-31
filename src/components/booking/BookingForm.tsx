import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useCreateBooking, useStudioBookings } from '@/hooks/useStudioBookings';
import { useSessionAddons, useEditingMenu, useDiyRates, useTimeSlots } from '@/hooks/useEstimatorData';
import { useToast } from '@/hooks/use-toast';
import { format, getDay } from 'date-fns';
import { CheckCircle, Loader2, ArrowLeft, Minus, Plus, ChevronRight } from 'lucide-react';
import { validateBookingCustomer } from '@/lib/bookingValidation';

interface EditingItemSelection {
  id: string;
  name: string;
  quantity: number;
  customerPrice: number;
}

interface BookingFormProps {
  studioId: string;
  studioName: string;
  studioType?: string;
  date: Date;
  startTime: string;
  endTime: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function BookingForm({
  studioId,
  studioName,
  studioType,
  date,
  startTime,
  endTime,
  onSuccess,
  onCancel,
}: BookingFormProps) {
  const createBooking = useCreateBooking();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [internalStep, setInternalStep] = useState<'addons' | 'details'>('addons');

  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    sessionType: 'diy',
    notes: '',
  });

  // Add-on state
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [addonHours, setAddonHours] = useState<Record<string, number>>({});
  const [editingItems, setEditingItems] = useState<EditingItemSelection[]>([]);
  
  // Validation errors
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Fetch data
  const { data: sessionAddons = [] } = useSessionAddons();
  const { data: editingMenu = [] } = useEditingMenu();
  const { data: diyRates = [] } = useDiyRates();
  
  // Fetch existing bookings for overlap check
  const bookingDate = format(date, 'yyyy-MM-dd');
  const { data: existingBookings = [] } = useStudioBookings(studioId, bookingDate, bookingDate);
  const { data: timeSlots = [] } = useTimeSlots();

  const formatTimeDisplay = (time: string) => {
    const [hour, min] = time.split(':').map(Number);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${min.toString().padStart(2, '0')} ${ampm}`;
  };

  const calculateDuration = () => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    return (endMinutes - startMinutes) / 60;
  };

  const durationHours = calculateDuration();

  const formatDurationDisplay = () => {
    const hours = Math.floor(durationHours);
    const mins = Math.round((durationHours - hours) * 60);
    return hours > 0 ? `${hours}hr ${mins > 0 ? `${mins}min` : ''}`.trim() : `${mins}min`;
  };

  // Determine time slot type based on date and time
  const getTimeSlotType = useMemo(() => {
    const dayOfWeek = getDay(date);
    const [startHour] = startTime.split(':').map(Number);
    const isEvening = startHour >= 16;

    if (dayOfWeek >= 1 && dayOfWeek <= 3) {
      return isEvening ? 'mon_wed_eve' : 'mon_wed_day';
    } else if (dayOfWeek >= 4 && dayOfWeek <= 5) {
      return isEvening ? 'thu_fri_eve' : 'thu_fri_day';
    } else {
      return isEvening ? 'sat_sun_eve' : 'sat_sun_day';
    }
  }, [date, startTime]);

  // Calculate base studio cost
  const baseStudioCost = useMemo(() => {
    const rate = diyRates.find(r => 
      r.studio_id === studioId && 
      r.time_slots?.type === getTimeSlotType
    );
    if (!rate) return 0;

    const firstHourRate = Number(rate.first_hour_rate || 0);
    const afterFirstHourRate = Number(rate.after_first_hour_rate || firstHourRate);

    // For Mon-Wed, use same rate for all hours
    const isMonWed = getTimeSlotType.startsWith('mon_wed');
    if (isMonWed) {
      return firstHourRate * durationHours;
    }

    // For Thu-Sun, first hour premium + discounted additional hours
    if (durationHours <= 1) {
      return firstHourRate;
    }
    return firstHourRate + (durationHours - 1) * afterFirstHourRate;
  }, [diyRates, studioId, getTimeSlotType, durationHours]);

  // Filter available session add-ons
  const availableAddons = useMemo(() => {
    return sessionAddons.filter(addon => {
      if (!addon.is_active) return false;
      if (addon.addon_type === 'service') return false;
      
      // Filter by session type
      if (addon.applies_to_session_type) {
        if (addon.applies_to_session_type !== formData.sessionType) return false;
      }
      
      // Filter by studio type
      if (addon.applies_to_studio_types?.length > 0 && studioType) {
        if (!addon.applies_to_studio_types.includes(studioType)) return false;
      }
      
      return true;
    });
  }, [sessionAddons, formData.sessionType, studioType]);

  // Photo editing items (for photoshoot-related studios)
  const photoEditingItems = useMemo(() => {
    return editingMenu.filter(item => 
      item.is_active && item.category === 'photo'
    );
  }, [editingMenu]);

  // Toggle addon selection
  const toggleAddon = (addonId: string) => {
    setSelectedAddons(prev => 
      prev.includes(addonId) 
        ? prev.filter(id => id !== addonId)
        : [...prev, addonId]
    );
    // Initialize hours to duration if hourly
    const addon = sessionAddons.find(a => a.id === addonId);
    if (addon?.is_hourly && !addonHours[addonId]) {
      setAddonHours(prev => ({ ...prev, [addonId]: Math.ceil(durationHours) }));
    }
  };

  // Update addon hours
  const updateAddonHours = (addonId: string, delta: number) => {
    setAddonHours(prev => {
      const current = prev[addonId] || 1;
      const newHours = Math.max(1, Math.min(12, current + delta));
      return { ...prev, [addonId]: newHours };
    });
  };

  // Toggle editing item
  const toggleEditingItem = (item: typeof editingMenu[0]) => {
    const existing = editingItems.find(e => e.id === item.id);
    if (existing) {
      setEditingItems(prev => prev.filter(e => e.id !== item.id));
    } else {
      // Set default quantity (10 minimum for Enhance Edit)
      const defaultQty = item.name.toLowerCase().includes('enhance') ? 10 : 1;
      setEditingItems(prev => [...prev, {
        id: item.id,
        name: item.name,
        quantity: defaultQty,
        customerPrice: Number(item.customer_price || item.base_price),
      }]);
    }
  };

  // Update editing item quantity
  const updateEditingQuantity = (itemId: string, delta: number) => {
    setEditingItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const isEnhance = item.name.toLowerCase().includes('enhance');
      const minQty = isEnhance ? 10 : 1;
      const newQty = Math.max(minQty, item.quantity + delta);
      return { ...item, quantity: newQty };
    }));
  };

  // Calculate total cost
  const totalCost = useMemo(() => {
    let total = baseStudioCost;

    // Add session add-ons
    for (const addonId of selectedAddons) {
      const addon = sessionAddons.find(a => a.id === addonId);
      if (addon) {
        if (addon.is_hourly) {
          const hours = addonHours[addonId] || 1;
          total += Number(addon.flat_amount) * hours;
        } else {
          total += Number(addon.flat_amount);
        }
      }
    }

    // Add editing items
    for (const item of editingItems) {
      total += item.quantity * item.customerPrice;
    }

    return total;
  }, [baseStudioCost, selectedAddons, addonHours, editingItems, sessionAddons]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate customer info with Zod schema
    const validation = validateBookingCustomer({
      customerName: formData.customerName,
      customerEmail: formData.customerEmail,
      customerPhone: formData.customerPhone,
      notes: formData.notes,
    });
    
    if (!validation.success) {
      setValidationErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      toast({ title: 'Validation Error', description: firstError, variant: 'destructive' });
      return;
    }
    
    setValidationErrors({});

    // Check for overlaps with buffer time before submitting
    const BUFFER_MINUTES = 15;
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;
    
    for (const booking of existingBookings) {
      const [bsH, bsM] = booking.start_time.split(':').map(Number);
      const [beH, beM] = booking.end_time.split(':').map(Number);
      const bookingStart = bsH * 60 + bsM;
      const bookingEnd = beH * 60 + beM;
      
      // Check overlap WITH buffer consideration
      if (startMins < (bookingEnd + BUFFER_MINUTES) && endMins > (bookingStart - BUFFER_MINUTES)) {
        toast({ 
          title: 'Time Slot Unavailable', 
          description: 'This time slot conflicts with an existing booking. Please go back and select a different time.',
          variant: 'destructive' 
        });
        return;
      }
    }

    try {
      await createBooking.mutateAsync({
        studio_id: studioId,
        booking_date: format(date, 'yyyy-MM-dd'),
        start_time: startTime,
        end_time: endTime,
        booking_type: 'customer',
        status: 'pending',
        customer_name: formData.customerName,
        customer_email: formData.customerEmail,
        customer_phone: formData.customerPhone || null,
        session_type: formData.sessionType,
        notes: formData.notes || null,
        details: null,
        quote_id: null,
        created_by: null,
        title: null,
        people_count: 1,
        repeat_series_id: null,
        repeat_pattern: null,
      });

      setSubmitted(true);
      toast({ title: 'Booking request submitted!' });
      
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (error: any) {
      // Handle database trigger error for overlaps
      const message = error?.message || '';
      if (message.includes('overlap') || message.includes('conflicts')) {
        toast({ 
          title: 'Time Slot Conflict', 
          description: 'This time slot is no longer available. Please select a different time.',
          variant: 'destructive' 
        });
      } else {
        toast({ title: 'Error submitting booking', variant: 'destructive' });
      }
    }
  };

  if (submitted) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Booking Request Submitted!</h3>
          <p className="text-muted-foreground">
            We'll confirm your booking for {studioName} on{' '}
            {format(date, 'MMMM d, yyyy')} at {formatTimeDisplay(startTime)}.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Step 1: Add-ons Selection
  if (internalStep === 'addons') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Select Add-ons</CardTitle>
          <CardDescription>
            {studioName} • {format(date, 'EEEE, MMMM d, yyyy')}
            <br />
            {formatTimeDisplay(startTime)} – {formatTimeDisplay(endTime)} ({formatDurationDisplay()})
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Session Type Selection */}
          <div className="space-y-2">
            <Label>Session Type</Label>
            <RadioGroup
              value={formData.sessionType}
              onValueChange={(value) => {
                setFormData(prev => ({ ...prev, sessionType: value }));
                setSelectedAddons([]);
              }}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="diy" id="diy-addon" />
                <Label htmlFor="diy-addon" className="font-normal">DIY (Self-Operated)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="serviced" id="serviced-addon" />
                <Label htmlFor="serviced-addon" className="font-normal">Serviced (With Crew)</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Session Add-ons */}
          {availableAddons.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base font-medium">Session Add-ons</Label>
              {availableAddons.map((addon) => {
                const isSelected = selectedAddons.includes(addon.id);
                const hours = addonHours[addon.id] || 1;
                
                return (
                  <div key={addon.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{addon.name}</span>
                          <Badge variant="secondary">
                            +${addon.flat_amount}{addon.is_hourly ? '/hr' : ''}
                          </Badge>
                        </div>
                        {addon.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {addon.description}
                          </p>
                        )}
                      </div>
                      <Switch
                        checked={isSelected}
                        onCheckedChange={() => toggleAddon(addon.id)}
                      />
                    </div>
                    
                    {/* Hour selector for hourly add-ons */}
                    {isSelected && addon.is_hourly && (
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-sm text-muted-foreground">Hours:</span>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateAddonHours(addon.id, -1)}
                            disabled={hours <= 1}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center font-medium">{hours}</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateAddonHours(addon.id, 1)}
                            disabled={hours >= 12}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <span className="text-sm font-medium ml-2">
                            = ${(Number(addon.flat_amount) * hours).toFixed(0)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Photo Editing Add-ons */}
          {photoEditingItems.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base font-medium">Photo Editing</Label>
              <p className="text-sm text-muted-foreground">
                Add post-production editing to your session
              </p>
              {photoEditingItems.map((item) => {
                const selected = editingItems.find(e => e.id === item.id);
                const isEnhance = item.name.toLowerCase().includes('enhance');
                const price = Number(item.customer_price || item.base_price);
                
                return (
                  <div key={item.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.name}</span>
                          <Badge variant="secondary">${price}/edit</Badge>
                        </div>
                        {item.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.description}
                          </p>
                        )}
                        {isEnhance && (
                          <p className="text-xs text-muted-foreground mt-1">
                            10 edit minimum
                          </p>
                        )}
                      </div>
                      <Switch
                        checked={!!selected}
                        onCheckedChange={() => toggleEditingItem(item)}
                      />
                    </div>
                    
                    {/* Quantity selector */}
                    {selected && (
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-sm text-muted-foreground">Quantity:</span>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateEditingQuantity(item.id, -1)}
                            disabled={selected.quantity <= (isEnhance ? 10 : 1)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-10 text-center font-medium">{selected.quantity}</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateEditingQuantity(item.id, 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <span className="text-sm font-medium ml-2">
                            = ${(selected.quantity * price).toFixed(0)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Cost Breakdown */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="font-medium">Cost Breakdown</h4>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>{studioName} ({formatDurationDisplay()})</span>
                <span>${baseStudioCost.toFixed(2)}</span>
              </div>
              {selectedAddons.map(addonId => {
                const addon = sessionAddons.find(a => a.id === addonId);
                if (!addon) return null;
                const hours = addon.is_hourly ? (addonHours[addonId] || 1) : 1;
                const cost = Number(addon.flat_amount) * hours;
                return (
                  <div key={addonId} className="flex justify-between text-muted-foreground">
                    <span>{addon.name}{addon.is_hourly ? ` (${hours}hr)` : ''}</span>
                    <span>${cost.toFixed(2)}</span>
                  </div>
                );
              })}
              {editingItems.map(item => (
                <div key={item.id} className="flex justify-between text-muted-foreground">
                  <span>{item.name} ({item.quantity}x)</span>
                  <span>${(item.quantity * item.customerPrice).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between font-semibold pt-2 border-t">
                <span>Estimated Total</span>
                <span>${totalCost.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button onClick={() => setInternalStep('details')} className="flex-1">
              Continue
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Step 2: Customer Details Form
  return (
    <Card>
      <CardHeader>
        <CardTitle>Complete Your Booking</CardTitle>
        <CardDescription>
          {studioName} • {format(date, 'EEEE, MMMM d, yyyy')}
          <br />
          {formatTimeDisplay(startTime)} – {formatTimeDisplay(endTime)} ({formatDurationDisplay()})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.customerName}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, customerName: e.target.value }));
                if (validationErrors.customerName) {
                  setValidationErrors(prev => ({ ...prev, customerName: '' }));
                }
              }}
              placeholder="Your full name"
              maxLength={100}
              className={validationErrors.customerName ? 'border-destructive' : ''}
            />
            {validationErrors.customerName && (
              <p className="text-sm text-destructive">{validationErrors.customerName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.customerEmail}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, customerEmail: e.target.value }));
                if (validationErrors.customerEmail) {
                  setValidationErrors(prev => ({ ...prev, customerEmail: '' }));
                }
              }}
              placeholder="your@email.com"
              maxLength={255}
              className={validationErrors.customerEmail ? 'border-destructive' : ''}
            />
            {validationErrors.customerEmail && (
              <p className="text-sm text-destructive">{validationErrors.customerEmail}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.customerPhone}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, customerPhone: e.target.value }));
                if (validationErrors.customerPhone) {
                  setValidationErrors(prev => ({ ...prev, customerPhone: '' }));
                }
              }}
              placeholder="(555) 123-4567"
              maxLength={20}
              className={validationErrors.customerPhone ? 'border-destructive' : ''}
            />
            {validationErrors.customerPhone && (
              <p className="text-sm text-destructive">{validationErrors.customerPhone}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, notes: e.target.value }));
                if (validationErrors.notes) {
                  setValidationErrors(prev => ({ ...prev, notes: '' }));
                }
              }}
              placeholder="Any special requests or details about your session..."
              rows={3}
              maxLength={500}
              className={validationErrors.notes ? 'border-destructive' : ''}
            />
            {validationErrors.notes && (
              <p className="text-sm text-destructive">{validationErrors.notes}</p>
            )}
          </div>

          {/* Summary of selections */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="font-medium">Booking Summary</h4>
            <div className="text-sm space-y-1">
              <div className="flex justify-between font-semibold pt-2 border-t">
                <span>Estimated Total</span>
                <span>${totalCost.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setInternalStep('addons')} className="flex-1">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button type="submit" disabled={createBooking.isPending} className="flex-1">
              {createBooking.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit ${totalCost.toFixed(0)}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
