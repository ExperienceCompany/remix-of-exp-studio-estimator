import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Plus } from 'lucide-react';
import { useAllStudios } from '@/hooks/useStudiosAdmin';

interface Condition {
  id: string;
  condition_group: number;
  condition_field: string;
  condition_operator: string;
  condition_values: string[];
}

interface FieldInclusionConditionsProps {
  conditions: Condition[];
  onChange: (conditions: Condition[]) => void;
}

const CONDITION_FIELDS = [
  { value: 'spaces', label: 'the spaces' },
  { value: 'creator_tags', label: "the creator's tags" },
  { value: 'booking_type', label: 'the booking type' },
];

const CONDITION_OPERATORS = [
  { value: 'contains_any', label: 'contains any of' },
  { value: 'contains_none', label: 'contains none of' },
];

const BOOKING_TYPES = [
  { value: 'customer', label: 'Customer' },
  { value: 'internal', label: 'Internal' },
  { value: 'unavailable', label: 'Unavailable' },
];

// Sample tags - in real app, fetch from profiles
const SAMPLE_TAGS = ['Team', 'VIP', 'Partner', 'Affiliate', 'Staff'];

export function FieldInclusionConditions({ conditions, onChange }: FieldInclusionConditionsProps) {
  const { data: studios = [] } = useAllStudios();

  const getMaxGroup = () => {
    if (conditions.length === 0) return -1;
    return Math.max(...conditions.map(c => c.condition_group));
  };

  const addConditionToGroup = (group: number) => {
    const newCondition: Condition = {
      id: crypto.randomUUID(),
      condition_group: group,
      condition_field: 'spaces',
      condition_operator: 'contains_any',
      condition_values: [],
    };
    onChange([...conditions, newCondition]);
  };

  const addNewGroup = () => {
    const newGroup = getMaxGroup() + 1;
    addConditionToGroup(newGroup);
  };

  const removeCondition = (id: string) => {
    onChange(conditions.filter(c => c.id !== id));
  };

  const updateCondition = (id: string, updates: Partial<Condition>) => {
    onChange(conditions.map(c => 
      c.id === id ? { ...c, ...updates } : c
    ));
  };

  const getValuesOptions = (field: string) => {
    switch (field) {
      case 'spaces':
        return studios.map(s => ({ value: s.id, label: s.name }));
      case 'creator_tags':
        return SAMPLE_TAGS.map(t => ({ value: t, label: t }));
      case 'booking_type':
        return BOOKING_TYPES;
      default:
        return [];
    }
  };

  const groupedConditions = conditions.reduce((acc, condition) => {
    const group = condition.condition_group;
    if (!acc[group]) acc[group] = [];
    acc[group].push(condition);
    return acc;
  }, {} as Record<number, Condition[]>);

  const groups = Object.keys(groupedConditions).map(Number).sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium">Include when...</div>
      
      {groups.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          No conditions set - field will always appear.
        </div>
      ) : (
        groups.map((groupNum, groupIndex) => (
          <div key={groupNum} className="space-y-2">
            {groupIndex > 0 && (
              <div className="text-sm font-medium text-muted-foreground uppercase">or</div>
            )}
            <div className="border rounded-lg p-3 space-y-2 bg-muted/20">
              {groupedConditions[groupNum].map((condition, conditionIndex) => (
                <div key={condition.id} className="space-y-2">
                  {conditionIndex > 0 && (
                    <div className="text-xs font-medium text-muted-foreground uppercase pl-2">and</div>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Select
                      value={condition.condition_field}
                      onValueChange={(value) => updateCondition(condition.id, { 
                        condition_field: value,
                        condition_values: [] 
                      })}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONDITION_FIELDS.map(f => (
                          <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={condition.condition_operator}
                      onValueChange={(value) => updateCondition(condition.id, { condition_operator: value })}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONDITION_OPERATORS.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={condition.condition_values[0] || ''}
                      onValueChange={(value) => {
                        const current = condition.condition_values;
                        const updated = current.includes(value)
                          ? current.filter(v => v !== value)
                          : [...current, value];
                        updateCondition(condition.id, { condition_values: updated });
                      }}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select...">
                          {condition.condition_values.length > 0 
                            ? `${condition.condition_values.length} selected`
                            : 'Select...'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {getValuesOptions(condition.condition_field).map(opt => (
                          <SelectItem 
                            key={opt.value} 
                            value={opt.value}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={condition.condition_values.includes(opt.value)}
                                readOnly
                                className="pointer-events-none"
                              />
                              {opt.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCondition(condition.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => addConditionToGroup(groupNum)}
                className="text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                and
              </Button>
            </div>
          </div>
        ))
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addNewGroup}
        className="text-xs"
      >
        <Plus className="h-3 w-3 mr-1" />
        {conditions.length === 0 ? 'Add condition' : 'or'}
      </Button>
    </div>
  );
}
