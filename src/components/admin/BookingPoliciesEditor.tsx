import { useState, useEffect } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, HelpCircle, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useBookingPolicies, useUpdateBookingPolicy, useAvailableTags } from '@/hooks/useBookingPolicies';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function BookingPoliciesEditor() {
  const { data: policies, isLoading } = useBookingPolicies();
  const { data: availableTags = [] } = useAvailableTags();
  const updatePolicy = useUpdateBookingPolicy();
  
  const lockInPolicy = policies?.find(p => p.policy_type === 'lock_in');
  const repeatPolicy = policies?.find(p => p.policy_type === 'repeat_bookings');

  // Local state for lock-in policy
  const [lockInValue, setLockInValue] = useState('strict');
  const [hoursBeforeStart, setHoursBeforeStart] = useState(24);
  const [hoursAfterEnd, setHoursAfterEnd] = useState(0);
  
  // Local state for repeat bookings policy
  const [repeatValue, setRepeatValue] = useState('tag_restricted');
  const [selectedTags, setSelectedTags] = useState<string[]>(['Team']);
  
  // Saved indicators
  const [lockInSaved, setLockInSaved] = useState(false);
  const [repeatSaved, setRepeatSaved] = useState(false);

  // Initialize from DB
  useEffect(() => {
    if (lockInPolicy) {
      setLockInValue(lockInPolicy.policy_value);
      setHoursBeforeStart(lockInPolicy.hours_before_start);
      setHoursAfterEnd(lockInPolicy.hours_after_end);
    }
  }, [lockInPolicy]);

  useEffect(() => {
    if (repeatPolicy) {
      setRepeatValue(repeatPolicy.policy_value);
      setSelectedTags(repeatPolicy.allowed_tags || []);
    }
  }, [repeatPolicy]);

  const handleLockInChange = async (value: string) => {
    setLockInValue(value);
    if (lockInPolicy) {
      try {
        await updatePolicy.mutateAsync({
          id: lockInPolicy.id,
          policy_value: value,
        });
        setLockInSaved(true);
        setTimeout(() => setLockInSaved(false), 2000);
      } catch {
        toast.error('Failed to update lock-in policy');
      }
    }
  };

  const handleHoursBeforeChange = async (hours: number) => {
    setHoursBeforeStart(hours);
    if (lockInPolicy) {
      try {
        await updatePolicy.mutateAsync({
          id: lockInPolicy.id,
          hours_before_start: hours,
        });
        setLockInSaved(true);
        setTimeout(() => setLockInSaved(false), 2000);
      } catch {
        toast.error('Failed to update hours');
      }
    }
  };

  const handleHoursAfterChange = async (hours: number) => {
    setHoursAfterEnd(hours);
    if (lockInPolicy) {
      try {
        await updatePolicy.mutateAsync({
          id: lockInPolicy.id,
          hours_after_end: hours,
        });
        setLockInSaved(true);
        setTimeout(() => setLockInSaved(false), 2000);
      } catch {
        toast.error('Failed to update hours');
      }
    }
  };

  const handleRepeatChange = async (value: string) => {
    setRepeatValue(value);
    if (repeatPolicy) {
      try {
        await updatePolicy.mutateAsync({
          id: repeatPolicy.id,
          policy_value: value,
        });
        setRepeatSaved(true);
        setTimeout(() => setRepeatSaved(false), 2000);
      } catch {
        toast.error('Failed to update repeat policy');
      }
    }
  };

  const handleTagToggle = async (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    
    setSelectedTags(newTags);
    if (repeatPolicy) {
      try {
        await updatePolicy.mutateAsync({
          id: repeatPolicy.id,
          allowed_tags: newTags,
        });
        setRepeatSaved(true);
        setTimeout(() => setRepeatSaved(false), 2000);
      } catch {
        toast.error('Failed to update tags');
      }
    }
  };

  if (isLoading) {
    return <div className="animate-pulse text-muted-foreground">Loading policies...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Lock-in Policy Section */}
      <div className="border rounded-lg">
        <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm uppercase tracking-wide">Lock-in Policy</span>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Controls when users can modify or cancel their bookings</p>
              </TooltipContent>
            </Tooltip>
          </div>
          {lockInSaved && (
            <div className="flex items-center gap-1 text-sm text-green-600">
              <Check className="h-4 w-4" />
              Saved
            </div>
          )}
        </div>
        
        <div className="p-4 space-y-4">
          <RadioGroup value={lockInValue} onValueChange={handleLockInChange}>
            {/* Open */}
            <div className="flex items-start gap-3 p-3 rounded-md hover:bg-muted/30 transition-colors">
              <RadioGroupItem value="open" id="open" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="open" className="font-medium cursor-pointer">Open</Label>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Users can change/cancel bookings up to{' '}
                  {lockInValue === 'open' ? (
                    <Input
                      type="number"
                      min={0}
                      value={hoursAfterEnd}
                      onChange={(e) => handleHoursAfterChange(Number(e.target.value))}
                      className="w-16 h-7 inline-block mx-1 text-center"
                    />
                  ) : (
                    <span className="font-medium">{hoursAfterEnd}</span>
                  )}{' '}
                  hours after they end, and end them early whilst in progress
                </p>
              </div>
            </div>

            {/* Flexible */}
            <div className="flex items-start gap-3 p-3 rounded-md hover:bg-muted/30 transition-colors">
              <RadioGroupItem value="flexible" id="flexible" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="flexible" className="font-medium cursor-pointer">Flexible</Label>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Users can change/cancel their bookings any time before they begin, and end them early whilst in progress
                </p>
              </div>
            </div>

            {/* Moderate */}
            <div className="flex items-start gap-3 p-3 rounded-md hover:bg-muted/30 transition-colors">
              <RadioGroupItem value="moderate" id="moderate" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="moderate" className="font-medium cursor-pointer">Moderate</Label>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Users can change/cancel their bookings any time before they begin, but can't change them whilst in progress
                </p>
              </div>
            </div>

            {/* Strict */}
            <div className="flex items-start gap-3 p-3 rounded-md hover:bg-muted/30 transition-colors">
              <RadioGroupItem value="strict" id="strict" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="strict" className="font-medium cursor-pointer">Strict</Label>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Users can change/cancel only up to a certain number of hours before they start
                </p>
                {lockInValue === 'strict' && (
                  <div className="mt-3 p-3 bg-muted/50 rounded-md">
                    <div className="flex items-center gap-2 text-sm">
                      <span>Cancel/change up to</span>
                      <Input
                        type="number"
                        min={0}
                        value={hoursBeforeStart}
                        onChange={(e) => handleHoursBeforeChange(Number(e.target.value))}
                        className="w-16 h-8 text-center"
                      />
                      <span>hour(s) before start</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </RadioGroup>
        </div>
      </div>

      {/* Repeat Bookings Section */}
      <div className="border rounded-lg">
        <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm uppercase tracking-wide">Ability to Repeat Bookings</span>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Controls which users can create recurring/repeating bookings</p>
              </TooltipContent>
            </Tooltip>
          </div>
          {repeatSaved && (
            <div className="flex items-center gap-1 text-sm text-green-600">
              <Check className="h-4 w-4" />
              Saved
            </div>
          )}
        </div>
        
        <div className="p-4 space-y-4">
          <RadioGroup value={repeatValue} onValueChange={handleRepeatChange}>
            {/* All Users */}
            <div className="flex items-start gap-3 p-3 rounded-md hover:bg-muted/30 transition-colors">
              <RadioGroupItem value="all" id="all" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="all" className="font-medium cursor-pointer">All users</Label>
                <p className="text-sm text-muted-foreground mt-0.5">
                  All users that are able to book can create repeating bookings
                </p>
              </div>
            </div>

            {/* Tag Restricted */}
            <div className="flex items-start gap-3 p-3 rounded-md hover:bg-muted/30 transition-colors">
              <RadioGroupItem value="tag_restricted" id="tag_restricted" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="tag_restricted" className="font-medium cursor-pointer">Tag restricted</Label>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Only users that are able to book AND have any of the following tags can create repeating bookings
                </p>
                {repeatValue === 'tag_restricted' && (
                  <div className="mt-3 p-3 bg-muted/50 rounded-md">
                    <div className="flex flex-wrap gap-2">
                      {availableTags.length > 0 ? (
                        availableTags.map((tag) => (
                          <Badge
                            key={tag}
                            variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                            className={cn(
                              'cursor-pointer transition-colors',
                              selectedTags.includes(tag) && 'bg-primary'
                            )}
                            onClick={() => handleTagToggle(tag)}
                          >
                            {tag}
                            {selectedTags.includes(tag) && (
                              <X className="h-3 w-3 ml-1" />
                            )}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No tags found. Add tags to user profiles first.
                        </p>
                      )}
                    </div>
                    {selectedTags.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Selected: {selectedTags.join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </RadioGroup>
        </div>
      </div>
    </div>
  );
}
