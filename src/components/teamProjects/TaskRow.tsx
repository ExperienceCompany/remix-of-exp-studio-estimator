import { ProjectTask, TeamMember, TASK_POINTS, TaskLevel, TaskStatus } from "@/types/teamProject";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, User, X } from "lucide-react";

interface TaskRowProps {
  task: ProjectTask;
  taskValue: number;
  assignee?: TeamMember;
  teamMembers: TeamMember[];
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

export function TaskRow({ task, taskValue, assignee, teamMembers, onUpdate, onRemove }: TaskRowProps) {
  const levelBadge = LEVEL_BADGES[task.level];

  return (
    <Card className="border-border">
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-3 flex-wrap">
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

        {/* Assignee Role Display */}
        {assignee?.role && (
          <div className="mt-2 text-xs text-muted-foreground">
            Assigned to: {assignee.name} ({assignee.role})
          </div>
        )}
      </CardContent>
    </Card>
  );
}