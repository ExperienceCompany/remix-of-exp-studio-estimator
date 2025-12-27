import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronDown, Plus, X } from 'lucide-react';
import { useBookingColorRules, useCreateBookingColorRule, useUpdateBookingColorRule, useDeleteBookingColorRule, ColorCondition, BookingColorRule } from '@/hooks/useBookingColorRules';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#6b7280', '#1f2937', '#000000',
];

const FIELD_OPTIONS = [
  { value: 'booking_type', label: 'the booking type' },
  { value: 'session_type', label: 'the session type' },
  { value: 'title', label: 'the title' },
  { value: 'holder_name', label: "the holder's name/org/email" },
  { value: 'holder_tags', label: "the holder's set of tags" },
];

const OPERATOR_OPTIONS = [
  { value: 'is_equal_to', label: 'is equal to' },
  { value: 'is_not_equal_to', label: 'is not equal to' },
  { value: 'contains', label: 'contains' },
  { value: 'does_not_contain', label: 'does not contain' },
];

const BOOKING_TYPE_VALUES = [
  { value: 'customer', label: 'User booking' },
  { value: 'internal', label: 'Internal booking' },
  { value: 'unavailable', label: 'Unavailable time' },
];

const SESSION_TYPE_VALUES = [
  { value: 'diy', label: 'DIY' },
  { value: 'serviced', label: 'Serviced' },
];

function ColorPicker({ color, onChange }: { color: string; onChange: (color: string) => void }) {
  const [open, setOpen] = useState(false);
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-16 h-9 p-1 gap-1">
          <div 
            className="w-5 h-5 rounded-sm border border-border"
            style={{ backgroundColor: color }}
          />
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2 bg-popover z-50" align="start">
        <div className="grid grid-cols-6 gap-1">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              className={cn(
                "w-6 h-6 rounded-sm border transition-all",
                color === c ? "ring-2 ring-primary ring-offset-2" : "border-border hover:scale-110"
              )}
              style={{ backgroundColor: c }}
              onClick={() => { onChange(c); setOpen(false); }}
            />
          ))}
        </div>
        <div className="mt-2 pt-2 border-t">
          <Input
            type="color"
            value={color}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-8 p-0 cursor-pointer"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ConditionRow({ 
  condition, 
  index, 
  isFirst,
  onChange, 
  onRemove 
}: { 
  condition: ColorCondition; 
  index: number;
  isFirst: boolean;
  onChange: (condition: ColorCondition) => void; 
  onRemove: () => void;
}) {
  const showTypeSelector = condition.field === 'booking_type';
  const showSessionTypeSelector = condition.field === 'session_type';
  const showTextOperators = ['title', 'holder_name', 'holder_tags'].includes(condition.field);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* AND/OR prefix for non-first conditions */}
      <Select
        value={isFirst ? 'none' : (condition.type || 'and')}
        onValueChange={(v) => onChange({ ...condition, type: v as 'and' | 'or' })}
        disabled={isFirst}
      >
        <SelectTrigger className={cn("w-28", isFirst && "invisible")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-popover z-50">
          <SelectItem value="none" disabled className="hidden">—</SelectItem>
          <SelectItem value="and">and</SelectItem>
          <SelectItem value="or">or</SelectItem>
        </SelectContent>
      </Select>

      {/* Field selector */}
      <Select
        value={condition.field}
        onValueChange={(v) => onChange({ 
          ...condition, 
          field: v as ColorCondition['field'],
          operator: v === 'booking_type' || v === 'session_type' ? 'is_equal_to' : condition.operator,
          value: v === 'booking_type' ? 'customer' : v === 'session_type' ? 'diy' : ''
        })}
      >
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-popover z-50">
          {FIELD_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Operator selector */}
      <Select
        value={condition.operator}
        onValueChange={(v) => onChange({ ...condition, operator: v as ColorCondition['operator'] })}
      >
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-popover z-50">
          {showTypeSelector || showSessionTypeSelector ? (
            <>
              <SelectItem value="is_equal_to">is equal to</SelectItem>
              <SelectItem value="is_not_equal_to">is not equal to</SelectItem>
            </>
          ) : (
            OPERATOR_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      {/* Value selector/input */}
      {showTypeSelector ? (
        <Select
          value={condition.value}
          onValueChange={(v) => onChange({ ...condition, value: v })}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            {BOOKING_TYPE_VALUES.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : showSessionTypeSelector ? (
        <Select
          value={condition.value}
          onValueChange={(v) => onChange({ ...condition, value: v })}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            {SESSION_TYPE_VALUES.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          value={condition.value}
          onChange={(e) => onChange({ ...condition, value: e.target.value })}
          placeholder="Enter value..."
          className="w-40"
        />
      )}

      {/* Remove button */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

function ColorRuleCard({ 
  rule, 
  onUpdate, 
  onDelete 
}: { 
  rule: BookingColorRule; 
  onUpdate: (updates: Partial<BookingColorRule>) => void;
  onDelete: () => void;
}) {
  const [localConditions, setLocalConditions] = useState<ColorCondition[]>(rule.conditions || []);
  const [localColor, setLocalColor] = useState(rule.color);

  useEffect(() => {
    setLocalConditions(rule.conditions || []);
    setLocalColor(rule.color);
  }, [rule]);

  const handleColorChange = (color: string) => {
    setLocalColor(color);
    onUpdate({ color });
  };

  const handleConditionChange = (index: number, condition: ColorCondition) => {
    const newConditions = [...localConditions];
    newConditions[index] = condition;
    setLocalConditions(newConditions);
    onUpdate({ conditions: newConditions });
  };

  const handleAddCondition = (type: 'and' | 'or') => {
    const newCondition: ColorCondition = {
      type,
      field: 'booking_type',
      operator: 'is_equal_to',
      value: 'customer',
    };
    const newConditions = [...localConditions, newCondition];
    setLocalConditions(newConditions);
    onUpdate({ conditions: newConditions });
  };

  const handleRemoveCondition = (index: number) => {
    if (localConditions.length === 1) {
      // If removing last condition, delete the entire rule
      onDelete();
      return;
    }
    const newConditions = localConditions.filter((_, i) => i !== index);
    // If we removed the first condition, clear the type of the new first condition
    if (index === 0 && newConditions.length > 0) {
      newConditions[0] = { ...newConditions[0], type: undefined };
    }
    setLocalConditions(newConditions);
    onUpdate({ conditions: newConditions });
  };

  return (
    <div className="border rounded-lg p-4 bg-muted/30">
      {/* Header with color picker */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-sm font-medium">Use</span>
        <ColorPicker color={localColor} onChange={handleColorChange} />
        <span className="text-sm text-muted-foreground">when...</span>
      </div>

      {/* Conditions */}
      <div className="space-y-2 ml-4">
        {localConditions.map((condition, index) => (
          <ConditionRow
            key={index}
            condition={condition}
            index={index}
            isFirst={index === 0}
            onChange={(c) => handleConditionChange(index, c)}
            onRemove={() => handleRemoveCondition(index)}
          />
        ))}
      </div>

      {/* Add condition buttons */}
      <div className="flex gap-2 mt-4 ml-4">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleAddCondition('and')}
          className="gap-1"
        >
          <Plus className="h-3 w-3" />
          and
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleAddCondition('or')}
          className="gap-1"
        >
          <Plus className="h-3 w-3" />
          or
        </Button>
      </div>
    </div>
  );
}

export function ColoringEditor() {
  const { data: rules, isLoading } = useBookingColorRules();
  const createRule = useCreateBookingColorRule();
  const updateRule = useUpdateBookingColorRule();
  const deleteRule = useDeleteBookingColorRule();
  const [saved, setSaved] = useState(false);

  const handleUpdate = async (id: string, updates: Partial<BookingColorRule>) => {
    try {
      await updateRule.mutateAsync({ id, ...updates });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      toast.error('Failed to update color rule');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRule.mutateAsync(id);
      toast.success('Color rule deleted');
    } catch {
      toast.error('Failed to delete color rule');
    }
  };

  const handleAddRule = async () => {
    try {
      await createRule.mutateAsync({
        color: '#3b82f6',
        conditions: [{ field: 'booking_type', operator: 'is_equal_to', value: 'customer' }],
        display_order: (rules?.length || 0),
        is_active: true,
      });
      toast.success('Color rule added');
    } catch {
      toast.error('Failed to add color rule');
    }
  };

  if (isLoading) {
    return <div className="animate-pulse text-muted-foreground">Loading color rules...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          We color each booking based on the <em>first matching</em> condition below. 
          If <em>no</em> conditions match, <span className="inline-block w-3 h-3 bg-primary rounded-sm align-middle mx-1"></span> is used.
          Note that this color scheme is shown to admins only.
        </p>
        {saved && (
          <div className="flex items-center gap-1 text-sm text-green-600">
            <Check className="h-4 w-4" />
            Saved
          </div>
        )}
      </div>

      {/* Color rules */}
      <div className="space-y-4">
        {rules?.map((rule) => (
          <ColorRuleCard
            key={rule.id}
            rule={rule}
            onUpdate={(updates) => handleUpdate(rule.id, updates)}
            onDelete={() => handleDelete(rule.id)}
          />
        ))}
      </div>

      {/* Add condition button */}
      <Button onClick={handleAddRule} className="gap-2">
        <Plus className="h-4 w-4" />
        Add a condition
      </Button>
    </div>
  );
}
