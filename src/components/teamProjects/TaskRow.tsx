import { ProjectTask, TeamMember, TASK_POINTS, TaskLevel, TaskStatus, areDependenciesMet, getBlockingTasks } from "@/types/teamProject";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, User, X, CalendarIcon, Link2, AlertTriangle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface TaskRowProps {
  task: ProjectTask;
  taskValue: number;
  assignee?: TeamMember;
  teamMembers: TeamMember[];
  allTasks: ProjectTask[];
  projectStartDate?: Date | null;
  projectEndDate?: Date | null;
  onUpdate: (updates: Partial<ProjectTask>) => void;
  onRemove: () => void;
}

const LEVEL_BADGES: Record<TaskLevel, { label: string; points: number; className: string }> = {
  lv1: { label: 'Lv1', points: TASK_POINTS.lv1, className: 'bg-green-500/10 text-green-600 border-green-500/20' },
  lv2: { label: 'Lv2', points: TASK_POINTS.lv2, className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  lv3: { label: 'Lv3', points: TASK_POINTS.lv3, className: 'bg-red-500/10 text-red-600 border-red-500/20' }
};

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' }
];

export function TaskRow({ 
  task, 
  taskValue, 
  assignee, 
  teamMembers,
  allTasks,
  projectStartDate,
  projectEndDate,
  onUpdate, 
  onRemove 
}: TaskRowProps) {
  const [depPopoverOpen, setDepPopoverOpen] = useState(false);
  const levelBadge = LEVEL_BADGES[task.level];
  const dueDate = task.dueDate ? parseISO(task.dueDate) : undefined;
  
  // Dependency logic
  const dependsOn = task.dependsOn || [];
  const blockingTasks = getBlockingTasks(task, allTasks);
  const isBlocked = blockingTasks.length > 0;
  const otherTasks = allTasks.filter(t => t.id !== task.id);

  const handleDateSelect = (date: Date | undefined) => {
    onUpdate({ dueDate: date ? format(date, 'yyyy-MM-dd') : null });
  };

  const isDateDisabled = (date: Date) => {
    if (projectStartDate && date < projectStartDate) return true;
    if (projectEndDate && date > projectEndDate) return true;
    return false;
  };

  const toggleDependency = (depTaskId: string) => {
    const current = task.dependsOn || [];
    if (current.includes(depTaskId)) {
      onUpdate({ dependsOn: current.filter(id => id !== depTaskId) });
    } else {
      onUpdate({ dependsOn: [...current, depTaskId] });
    }
  };

  const getTaskDisplayName = (t: ProjectTask) => {
    return t.title || 'Untitled task';
  };

  return (
    <Card className={cn("border-border", isBlocked && "border-amber-500/50 bg-amber-500/5")}>
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Blocked indicator */}
          {isBlocked && (
            <div className="flex items-center gap-1 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          )}

          {/* Task Title */}
          <Input
            value={task.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Task title"
            className="flex-1 min-w-[150px] h-8"
          />

          {/* Level Selector */}
          <Select value={task.level} onValueChange={(val: TaskLevel) => onUpdate({ level: val })}>
            <SelectTrigger className="w-[100px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lv1">Lv1 (2.5 pts)</SelectItem>
              <SelectItem value="lv2">Lv2 (5 pts)</SelectItem>
              <SelectItem value="lv3">Lv3 (10 pts)</SelectItem>
            </SelectContent>
          </Select>

          {/* Points Badge */}
          <Badge variant="outline" className={levelBadge.className}>
            {levelBadge.points} pts
          </Badge>

          {/* Task Value */}
          <div className="text-sm font-medium text-primary min-w-[80px] text-right">
            ${taskValue.toFixed(2)}
          </div>

          {/* Dependencies Selector */}
          <Popover open={depPopoverOpen} onOpenChange={setDepPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 gap-1",
                  dependsOn.length > 0 && "border-primary/50 text-primary"
                )}
              >
                <Link2 className="h-3 w-3" />
                {dependsOn.length > 0 ? `${dependsOn.length} dep` : "Deps"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="start">
              <div className="space-y-3">
                <div className="font-medium text-sm">Dependencies</div>
                <p className="text-xs text-muted-foreground">
                  Select tasks that must be completed before this one can start.
                </p>
                
                {otherTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No other tasks available</p>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {otherTasks.map(t => {
                      const isChecked = dependsOn.includes(t.id);
                      const isDone = t.status === 'done';
                      const member = teamMembers.find(m => m.id === t.assigneeId);
                      
                      return (
                        <div 
                          key={t.id} 
                          className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50"
                        >
                          <Checkbox
                            id={`dep-${t.id}`}
                            checked={isChecked}
                            onCheckedChange={() => toggleDependency(t.id)}
                          />
                          <label 
                            htmlFor={`dep-${t.id}`}
                            className="flex-1 text-sm cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <span className={cn(isDone && "line-through text-muted-foreground")}>
                                {getTaskDisplayName(t)}
                              </span>
                              {isDone && (
                                <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">
                                  Done
                                </Badge>
                              )}
                            </div>
                            {member && (
                              <span className="text-xs text-muted-foreground">{member.name}</span>
                            )}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {dependsOn.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-muted-foreground"
                    onClick={() => onUpdate({ dependsOn: [] })}
                  >
                    Clear all dependencies
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Due Date Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "w-[120px] h-8 justify-start text-left font-normal",
                  !dueDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-1 h-3 w-3" />
                {dueDate ? format(dueDate, "MMM d") : "Due date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dueDate}
                onSelect={handleDateSelect}
                disabled={isDateDisabled}
                initialFocus
                className="p-3 pointer-events-auto"
              />
              {dueDate && (
                <div className="p-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-muted-foreground"
                    onClick={() => handleDateSelect(undefined)}
                  >
                    Clear date
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Status Selector */}
          <Select value={task.status} onValueChange={(val: TaskStatus) => onUpdate({ status: val })}>
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Assignee Selector */}
          <div className="flex items-center gap-1">
            <Select 
              value={task.assigneeId || 'unassigned'} 
              onValueChange={(val) => onUpdate({ assigneeId: val === 'unassigned' ? null : val })}
            >
              <SelectTrigger className="w-[140px] h-8">
                <div className="flex items-center gap-2">
                  <User className="h-3 w-3" />
                  <span className="truncate">
                    {assignee ? assignee.name || 'Unnamed' : 'Unassigned'}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">
                  <span className="text-muted-foreground">Unassigned</span>
                </SelectItem>
                {teamMembers.map(member => (
                  <SelectItem key={member.id} value={member.id}>
                    <div className="flex flex-col">
                      <span>{member.name || 'Unnamed'}</span>
                      {member.role && (
                        <span className="text-xs text-muted-foreground">{member.role}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {task.assigneeId && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8" 
                onClick={() => onUpdate({ assigneeId: null })}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Remove Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-destructive hover:text-destructive" 
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Dependencies & blocking info */}
        {(isBlocked || (assignee?.role && !isBlocked)) && (
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {isBlocked && (
              <div className="flex items-center gap-1 text-amber-600">
                <AlertTriangle className="h-3 w-3" />
                <span>Blocked by: {blockingTasks.map(t => getTaskDisplayName(t)).join(', ')}</span>
              </div>
            )}
            {assignee?.role && !isBlocked && (
              <span className="text-muted-foreground">
                Assigned to: {assignee.name} ({assignee.role})
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
