import { useState, useMemo } from 'react';
import { 
  format, 
  addDays, 
  addWeeks, 
  addMonths, 
  addYears, 
  isWeekend, 
  getDay, 
  setDate, 
  getDaysInMonth,
  isSameDay,
  startOfMonth,
  getDate,
} from 'date-fns';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon, ChevronDown, Info, X } from 'lucide-react';

// Types
export type RepeatFrequency = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export type DailyRule = 'weekdays' | 'weekends' | 'every_n_days';
export type MonthlyRuleType = 'day_of_month' | 'nth_weekday';
export type YearlyRuleType = 'specific_date' | 'nth_weekday';
export type EndType = 'by_date' | 'after_occurrences';

export interface WeeklyRule {
  interval: number;
  dayOfWeek: number;
}

export interface MonthlyRule {
  type: MonthlyRuleType;
  dayOfMonth: number;
  nthWeek: string;
  dayOfWeek: number;
  interval: number;
}

export interface YearlyRule {
  type: YearlyRuleType;
  month: number;
  dayOfMonth: number;
  nthWeek: string;
  dayOfWeek: number;
}

export interface RepeatConfig {
  frequency: RepeatFrequency;
  dailyRule: DailyRule;
  dailyInterval: number;
  weeklyRule: WeeklyRule;
  monthlyRule: MonthlyRule;
  yearlyRule: YearlyRule;
  endType: EndType;
  endByDate: Date | null;
  endAfterOccurrences: number;
  exceptions: Date[];
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const NTH_LABELS = ['1st', '2nd', '3rd', '4th', 'last'];

// Get the Nth weekday of a month
function getNthWeekdayOfMonth(year: number, month: number, dayOfWeek: number, nth: string): Date {
  const firstDay = startOfMonth(new Date(year, month));
  let date = firstDay;
  
  // Find first occurrence of the day of week
  while (getDay(date) !== dayOfWeek) {
    date = addDays(date, 1);
  }
  
  if (nth === 'last') {
    // Find last occurrence
    let lastOccurrence = date;
    while (date.getMonth() === month) {
      lastOccurrence = date;
      date = addDays(date, 7);
    }
    return lastOccurrence;
  }
  
  // Add weeks for nth occurrence
  const nthIndex = NTH_LABELS.indexOf(nth);
  if (nthIndex > 0) {
    date = addDays(date, nthIndex * 7);
  }
  
  // Check if still in same month
  if (date.getMonth() !== month) {
    return addDays(date, -7); // Return last occurrence if gone past
  }
  
  return date;
}

// Calculate the week position of a date (1st, 2nd, 3rd, 4th, or last)
function getWeekPosition(date: Date): string {
  const dayOfMonth = getDate(date);
  const daysInMonth = getDaysInMonth(date);
  
  // Check if it's the last occurrence of this weekday in the month
  if (dayOfMonth + 7 > daysInMonth) {
    return 'last';
  }
  
  const weekNum = Math.ceil(dayOfMonth / 7);
  return NTH_LABELS[weekNum - 1] || '4th';
}

interface RepeatOptionsProps {
  config: RepeatConfig;
  onChange: (config: RepeatConfig) => void;
  startDate: Date;
  startTime: string;
}

export function RepeatOptions({ config, onChange, startDate, startTime }: RepeatOptionsProps) {
  const [exceptionsOpen, setExceptionsOpen] = useState(false);

  const updateConfig = (updates: Partial<RepeatConfig>) => {
    onChange({ ...config, ...updates });
  };

  // Calculate occurrence dates based on config
  const occurrences = useMemo(() => {
    if (config.frequency === 'none') return [];

    const dates: Date[] = [startDate];
    let currentDate = startDate;
    let count = 1;
    const maxOccurrences = config.endType === 'after_occurrences' ? config.endAfterOccurrences : 100;
    const maxDate = config.endType === 'by_date' && config.endByDate 
      ? config.endByDate 
      : addMonths(startDate, 12);

    while (count < maxOccurrences) {
      let nextDate: Date | null = null;

      switch (config.frequency) {
        case 'daily':
          if (config.dailyRule === 'every_n_days') {
            nextDate = addDays(currentDate, config.dailyInterval);
          } else if (config.dailyRule === 'weekdays') {
            nextDate = addDays(currentDate, 1);
            while (isWeekend(nextDate)) {
              nextDate = addDays(nextDate, 1);
            }
          } else if (config.dailyRule === 'weekends') {
            nextDate = addDays(currentDate, 1);
            while (!isWeekend(nextDate)) {
              nextDate = addDays(nextDate, 1);
            }
          }
          break;

        case 'weekly':
          nextDate = addWeeks(currentDate, config.weeklyRule.interval);
          break;

        case 'monthly':
          const nextMonth = addMonths(currentDate, config.monthlyRule.interval);
          if (config.monthlyRule.type === 'day_of_month') {
            const maxDay = getDaysInMonth(nextMonth);
            nextDate = setDate(nextMonth, Math.min(config.monthlyRule.dayOfMonth, maxDay));
          } else {
            nextDate = getNthWeekdayOfMonth(
              nextMonth.getFullYear(),
              nextMonth.getMonth(),
              config.monthlyRule.dayOfWeek,
              config.monthlyRule.nthWeek
            );
          }
          break;

        case 'yearly':
          const nextYear = addYears(currentDate, 1);
          if (config.yearlyRule.type === 'specific_date') {
            const targetMonth = new Date(nextYear.getFullYear(), config.yearlyRule.month, 1);
            const maxDay = getDaysInMonth(targetMonth);
            nextDate = new Date(nextYear.getFullYear(), config.yearlyRule.month, Math.min(config.yearlyRule.dayOfMonth, maxDay));
          } else {
            nextDate = getNthWeekdayOfMonth(
              nextYear.getFullYear(),
              config.yearlyRule.month,
              config.yearlyRule.dayOfWeek,
              config.yearlyRule.nthWeek
            );
          }
          break;
      }

      if (!nextDate || nextDate > maxDate) break;

      // Check for exceptions
      const isException = config.exceptions.some(ex => isSameDay(ex, nextDate!));
      if (!isException) {
        dates.push(nextDate);
        count++;
      }

      currentDate = nextDate;
    }

    return dates;
  }, [config, startDate]);

  // Generate repeat summary
  const repeatSummary = useMemo(() => {
    if (config.frequency === 'none') return '';

    let pattern = '';
    switch (config.frequency) {
      case 'daily':
        if (config.dailyRule === 'weekdays') {
          pattern = 'On Monday to Friday';
        } else if (config.dailyRule === 'weekends') {
          pattern = 'On Saturday & Sunday';
        } else {
          pattern = config.dailyInterval === 1 ? 'Every day' : `Every ${config.dailyInterval} days`;
        }
        break;
      case 'weekly':
        pattern = config.weeklyRule.interval === 1 
          ? `Every week on ${DAYS_OF_WEEK[config.weeklyRule.dayOfWeek]}`
          : `Every ${config.weeklyRule.interval} weeks on ${DAYS_OF_WEEK[config.weeklyRule.dayOfWeek]}`;
        break;
      case 'monthly':
        if (config.monthlyRule.type === 'day_of_month') {
          pattern = config.monthlyRule.interval === 1
            ? `Day ${config.monthlyRule.dayOfMonth} of every month`
            : `Day ${config.monthlyRule.dayOfMonth} of every ${config.monthlyRule.interval} months`;
        } else {
          pattern = `The ${config.monthlyRule.nthWeek} ${DAYS_OF_WEEK[config.monthlyRule.dayOfWeek]} of every ${config.monthlyRule.interval === 1 ? 'month' : `${config.monthlyRule.interval} months`}`;
        }
        break;
      case 'yearly':
        if (config.yearlyRule.type === 'specific_date') {
          pattern = `Every ${MONTHS[config.yearlyRule.month]} ${config.yearlyRule.dayOfMonth}`;
        } else {
          pattern = `The ${config.yearlyRule.nthWeek} ${DAYS_OF_WEEK[config.yearlyRule.dayOfWeek]} of ${MONTHS[config.yearlyRule.month]}`;
        }
        break;
    }

    const begin = `Begin on ${format(startDate, 'EEEE, MMMM d, yyyy')} at ${startTime}`;
    const end = config.endType === 'by_date' && config.endByDate
      ? `End by ${format(config.endByDate, 'EEEE, MMMM d, yyyy')}`
      : `End after ${config.endAfterOccurrences} occurrence(s)`;

    const exceptionsText = config.exceptions.length > 0 
      ? ` (${config.exceptions.length} exception${config.exceptions.length > 1 ? 's' : ''})`
      : '';

    return `${pattern}. ${begin}. ${end}.${exceptionsText}`;
  }, [config, startDate, startTime]);

  const toggleException = (date: Date) => {
    const exists = config.exceptions.some(ex => isSameDay(ex, date));
    if (exists) {
      updateConfig({ 
        exceptions: config.exceptions.filter(ex => !isSameDay(ex, date)) 
      });
    } else {
      updateConfig({ 
        exceptions: [...config.exceptions, date] 
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Frequency Selection */}
      <div className="space-y-2">
        <Label>Repeat *</Label>
        <Select 
          value={config.frequency} 
          onValueChange={(v: RepeatFrequency) => updateConfig({ frequency: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.frequency !== 'none' && (
        <>
          {/* Daily Rule Options */}
          {config.frequency === 'daily' && (
            <div className="space-y-3 p-3 border rounded-md bg-muted/30">
              <Label className="text-sm">Daily rule *</Label>
              <RadioGroup 
                value={config.dailyRule} 
                onValueChange={(v: DailyRule) => updateConfig({ dailyRule: v })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="weekdays" id="weekdays" />
                  <label htmlFor="weekdays" className="text-sm cursor-pointer">Monday to Friday</label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="weekends" id="weekends" />
                  <label htmlFor="weekends" className="text-sm cursor-pointer">Saturday & Sunday</label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="every_n_days" id="every_n_days" />
                  <label htmlFor="every_n_days" className="text-sm cursor-pointer flex items-center gap-2">
                    Every
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      value={config.dailyInterval}
                      onChange={(e) => updateConfig({ dailyInterval: parseInt(e.target.value) || 1 })}
                      className="w-16 h-8"
                      disabled={config.dailyRule !== 'every_n_days'}
                    />
                    day(s)
                  </label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Weekly Rule Options */}
          {config.frequency === 'weekly' && (
            <div className="space-y-3 p-3 border rounded-md bg-muted/30">
              <Label className="text-sm">Weekly rule *</Label>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm">Every</span>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={config.weeklyRule.interval}
                  onChange={(e) => updateConfig({ 
                    weeklyRule: { ...config.weeklyRule, interval: parseInt(e.target.value) || 1 }
                  })}
                  className="w-16 h-8"
                />
                <span className="text-sm">week(s) on</span>
                <Select 
                  value={config.weeklyRule.dayOfWeek.toString()} 
                  onValueChange={(v) => updateConfig({ 
                    weeklyRule: { ...config.weeklyRule, dayOfWeek: parseInt(v) }
                  })}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((day, idx) => (
                      <SelectItem key={idx} value={idx.toString()}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Monthly Rule Options */}
          {config.frequency === 'monthly' && (
            <div className="space-y-3 p-3 border rounded-md bg-muted/30">
              <Label className="text-sm">Monthly rule *</Label>
              <RadioGroup 
                value={config.monthlyRule.type} 
                onValueChange={(v: MonthlyRuleType) => updateConfig({ 
                  monthlyRule: { ...config.monthlyRule, type: v }
                })}
              >
                <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                  <RadioGroupItem value="day_of_month" id="day_of_month" />
                  <label htmlFor="day_of_month" className="text-sm cursor-pointer flex items-center gap-2 flex-wrap">
                    Day
                    <Select 
                      value={config.monthlyRule.dayOfMonth.toString()}
                      onValueChange={(v) => updateConfig({ 
                        monthlyRule: { ...config.monthlyRule, dayOfMonth: parseInt(v) }
                      })}
                      disabled={config.monthlyRule.type !== 'day_of_month'}
                    >
                      <SelectTrigger className="w-20 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                          <SelectItem key={day} value={day.toString()}>{day}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    of every
                    <Input
                      type="number"
                      min={1}
                      max={12}
                      value={config.monthlyRule.interval}
                      onChange={(e) => updateConfig({ 
                        monthlyRule: { ...config.monthlyRule, interval: parseInt(e.target.value) || 1 }
                      })}
                      className="w-16 h-8"
                      disabled={config.monthlyRule.type !== 'day_of_month'}
                    />
                    month(s)
                  </label>
                </div>
                <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                  <RadioGroupItem value="nth_weekday" id="nth_weekday" />
                  <label htmlFor="nth_weekday" className="text-sm cursor-pointer flex items-center gap-2 flex-wrap">
                    The
                    <Select 
                      value={config.monthlyRule.nthWeek}
                      onValueChange={(v) => updateConfig({ 
                        monthlyRule: { ...config.monthlyRule, nthWeek: v }
                      })}
                      disabled={config.monthlyRule.type !== 'nth_weekday'}
                    >
                      <SelectTrigger className="w-20 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {NTH_LABELS.map(nth => (
                          <SelectItem key={nth} value={nth}>{nth}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select 
                      value={config.monthlyRule.dayOfWeek.toString()}
                      onValueChange={(v) => updateConfig({ 
                        monthlyRule: { ...config.monthlyRule, dayOfWeek: parseInt(v) }
                      })}
                      disabled={config.monthlyRule.type !== 'nth_weekday'}
                    >
                      <SelectTrigger className="w-32 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map((day, idx) => (
                          <SelectItem key={idx} value={idx.toString()}>{day}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    of every
                    <Input
                      type="number"
                      min={1}
                      max={12}
                      value={config.monthlyRule.interval}
                      onChange={(e) => updateConfig({ 
                        monthlyRule: { ...config.monthlyRule, interval: parseInt(e.target.value) || 1 }
                      })}
                      className="w-16 h-8"
                      disabled={config.monthlyRule.type !== 'nth_weekday'}
                    />
                    month(s)
                  </label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Yearly Rule Options */}
          {config.frequency === 'yearly' && (
            <div className="space-y-3 p-3 border rounded-md bg-muted/30">
              <Label className="text-sm">Yearly rule *</Label>
              <RadioGroup 
                value={config.yearlyRule.type} 
                onValueChange={(v: YearlyRuleType) => updateConfig({ 
                  yearlyRule: { ...config.yearlyRule, type: v }
                })}
              >
                <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                  <RadioGroupItem value="specific_date" id="specific_date" />
                  <label htmlFor="specific_date" className="text-sm cursor-pointer flex items-center gap-2 flex-wrap">
                    Every
                    <Select 
                      value={config.yearlyRule.month.toString()}
                      onValueChange={(v) => updateConfig({ 
                        yearlyRule: { ...config.yearlyRule, month: parseInt(v) }
                      })}
                      disabled={config.yearlyRule.type !== 'specific_date'}
                    >
                      <SelectTrigger className="w-32 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((month, idx) => (
                          <SelectItem key={idx} value={idx.toString()}>{month}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    on day
                    <Select 
                      value={config.yearlyRule.dayOfMonth.toString()}
                      onValueChange={(v) => updateConfig({ 
                        yearlyRule: { ...config.yearlyRule, dayOfMonth: parseInt(v) }
                      })}
                      disabled={config.yearlyRule.type !== 'specific_date'}
                    >
                      <SelectTrigger className="w-20 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                          <SelectItem key={day} value={day.toString()}>{day}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                </div>
                <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                  <RadioGroupItem value="nth_weekday" id="yearly_nth_weekday" />
                  <label htmlFor="yearly_nth_weekday" className="text-sm cursor-pointer flex items-center gap-2 flex-wrap">
                    The
                    <Select 
                      value={config.yearlyRule.nthWeek}
                      onValueChange={(v) => updateConfig({ 
                        yearlyRule: { ...config.yearlyRule, nthWeek: v }
                      })}
                      disabled={config.yearlyRule.type !== 'nth_weekday'}
                    >
                      <SelectTrigger className="w-20 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {NTH_LABELS.map(nth => (
                          <SelectItem key={nth} value={nth}>{nth}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select 
                      value={config.yearlyRule.dayOfWeek.toString()}
                      onValueChange={(v) => updateConfig({ 
                        yearlyRule: { ...config.yearlyRule, dayOfWeek: parseInt(v) }
                      })}
                      disabled={config.yearlyRule.type !== 'nth_weekday'}
                    >
                      <SelectTrigger className="w-32 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map((day, idx) => (
                          <SelectItem key={idx} value={idx.toString()}>{day}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    of
                    <Select 
                      value={config.yearlyRule.month.toString()}
                      onValueChange={(v) => updateConfig({ 
                        yearlyRule: { ...config.yearlyRule, month: parseInt(v) }
                      })}
                      disabled={config.yearlyRule.type !== 'nth_weekday'}
                    >
                      <SelectTrigger className="w-32 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((month, idx) => (
                          <SelectItem key={idx} value={idx.toString()}>{month}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* End Condition */}
          <div className="space-y-3 p-3 border rounded-md bg-muted/30">
            <Label className="text-sm">End *</Label>
            <RadioGroup 
              value={config.endType} 
              onValueChange={(v: EndType) => updateConfig({ endType: v })}
            >
              <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                <RadioGroupItem value="by_date" id="end_by_date" />
                <label htmlFor="end_by_date" className="text-sm cursor-pointer flex items-center gap-2">
                  End by
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "h-8 justify-start text-left font-normal",
                          !config.endByDate && "text-muted-foreground"
                        )}
                        disabled={config.endType !== 'by_date'}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {config.endByDate ? format(config.endByDate, "MMM d, yyyy") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={config.endByDate || undefined}
                        onSelect={(d) => updateConfig({ endByDate: d || null })}
                        initialFocus
                        className="pointer-events-auto"
                        disabled={(date) => date < startDate}
                      />
                    </PopoverContent>
                  </Popover>
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="after_occurrences" id="end_after" />
                <label htmlFor="end_after" className="text-sm cursor-pointer flex items-center gap-2">
                  End after
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={config.endAfterOccurrences}
                    onChange={(e) => updateConfig({ endAfterOccurrences: parseInt(e.target.value) || 1 })}
                    className="w-16 h-8"
                    disabled={config.endType !== 'after_occurrences'}
                  />
                  occurrence(s)
                </label>
              </div>
            </RadioGroup>
          </div>

          {/* Exceptions */}
          <div className="space-y-2">
            <Collapsible open={exceptionsOpen} onOpenChange={setExceptionsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    Exceptions
                    {config.exceptions.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {config.exceptions.length}
                      </Badge>
                    )}
                  </span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", exceptionsOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="border rounded-md p-3 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Select dates to exclude from the repeat pattern:
                  </p>
                  <Calendar
                    mode="multiple"
                    selected={config.exceptions}
                    onSelect={(dates) => updateConfig({ exceptions: dates || [] })}
                    className="pointer-events-auto"
                    disabled={(date) => date < startDate}
                  />
                  {config.exceptions.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {config.exceptions.map((ex, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs gap-1">
                          {format(ex, 'MMM d')}
                          <X 
                            className="h-3 w-3 cursor-pointer hover:text-destructive" 
                            onClick={() => toggleException(ex)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Repeat Summary */}
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-md">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="space-y-1 flex-1">
                <p className="text-sm font-medium text-primary">Repeat summary</p>
                <p className="text-xs text-muted-foreground">{repeatSummary}</p>
                {occurrences.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    <strong>Occurrences:</strong> {occurrences.slice(0, 6).map(d => format(d, 'M/d/yy')).join(', ')}
                    {occurrences.length > 6 && ` +${occurrences.length - 6} more`}
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Export helper to create default config from a date
export function createDefaultRepeatConfig(startDate: Date): RepeatConfig {
  const dayOfWeek = getDay(startDate);
  const dayOfMonth = getDate(startDate);
  const month = startDate.getMonth();
  const nthWeek = getWeekPosition(startDate);

  return {
    frequency: 'none',
    dailyRule: 'every_n_days',
    dailyInterval: 1,
    weeklyRule: { interval: 1, dayOfWeek },
    monthlyRule: {
      type: 'nth_weekday',
      dayOfMonth,
      nthWeek,
      dayOfWeek,
      interval: 1,
    },
    yearlyRule: {
      type: 'nth_weekday',
      month,
      dayOfMonth,
      nthWeek,
      dayOfWeek,
    },
    endType: 'by_date',
    endByDate: addWeeks(startDate, 2),
    endAfterOccurrences: 4,
    exceptions: [],
  };
}

// Export helper to calculate all repeat dates
export function calculateRepeatDates(config: RepeatConfig, startDate: Date): Date[] {
  if (config.frequency === 'none') return [startDate];

  const dates: Date[] = [startDate];
  let currentDate = startDate;
  let count = 1;
  const maxOccurrences = config.endType === 'after_occurrences' ? config.endAfterOccurrences : 100;
  const maxDate = config.endType === 'by_date' && config.endByDate 
    ? config.endByDate 
    : addMonths(startDate, 12);

  while (count < maxOccurrences) {
    let nextDate: Date | null = null;

    switch (config.frequency) {
      case 'daily':
        if (config.dailyRule === 'every_n_days') {
          nextDate = addDays(currentDate, config.dailyInterval);
        } else if (config.dailyRule === 'weekdays') {
          nextDate = addDays(currentDate, 1);
          while (isWeekend(nextDate)) {
            nextDate = addDays(nextDate, 1);
          }
        } else if (config.dailyRule === 'weekends') {
          nextDate = addDays(currentDate, 1);
          while (!isWeekend(nextDate)) {
            nextDate = addDays(nextDate, 1);
          }
        }
        break;

      case 'weekly':
        nextDate = addWeeks(currentDate, config.weeklyRule.interval);
        break;

      case 'monthly':
        const nextMonth = addMonths(currentDate, config.monthlyRule.interval);
        if (config.monthlyRule.type === 'day_of_month') {
          const maxDay = getDaysInMonth(nextMonth);
          nextDate = setDate(nextMonth, Math.min(config.monthlyRule.dayOfMonth, maxDay));
        } else {
          nextDate = getNthWeekdayOfMonth(
            nextMonth.getFullYear(),
            nextMonth.getMonth(),
            config.monthlyRule.dayOfWeek,
            config.monthlyRule.nthWeek
          );
        }
        break;

      case 'yearly':
        const nextYear = addYears(currentDate, 1);
        if (config.yearlyRule.type === 'specific_date') {
          const targetMonth = new Date(nextYear.getFullYear(), config.yearlyRule.month, 1);
          const maxDay = getDaysInMonth(targetMonth);
          nextDate = new Date(nextYear.getFullYear(), config.yearlyRule.month, Math.min(config.yearlyRule.dayOfMonth, maxDay));
        } else {
          nextDate = getNthWeekdayOfMonth(
            nextYear.getFullYear(),
            config.yearlyRule.month,
            config.yearlyRule.dayOfWeek,
            config.yearlyRule.nthWeek
          );
        }
        break;
    }

    if (!nextDate || nextDate > maxDate) break;

    const isException = config.exceptions.some(ex => isSameDay(ex, nextDate!));
    if (!isException) {
      dates.push(nextDate);
      count++;
    }

    currentDate = nextDate;
  }

  return dates;
}
