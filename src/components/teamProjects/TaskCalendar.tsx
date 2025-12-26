import { useState, useMemo } from "react";
import { ProjectTask, TeamMember, TaskStatus, TASK_POINTS } from "@/types/teamProject";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  addMonths, 
  subMonths, 
  format, 
  isSameMonth, 
  isSameDay, 
  parseISO,
  isToday
} from "date-fns";

interface TaskCalendarProps {
  tasks: ProjectTask[];
  teamMembers: TeamMember[];
  projectStartDate: Date | null;
  projectEndDate: Date | null;
  teamPool: number;
  totalPoints: number;
  selectedMemberId: string | null;
}

const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: 'bg-muted-foreground',
  in_progress: 'bg-amber-500',
  done: 'bg-green-500'
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done'
};

export function TaskCalendar({ 
  tasks, 
  teamMembers, 
  projectStartDate, 
  projectEndDate,
  teamPool,
  totalPoints,
  selectedMemberId
}: TaskCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(projectStartDate || new Date());

  const filteredTasks = useMemo(() => {
    if (!selectedMemberId) return tasks;
    return tasks.filter(t => t.assigneeId === selectedMemberId);
  }, [tasks, selectedMemberId]);

  const getTaskValue = (task: ProjectTask) => {
    const taskPoints = TASK_POINTS[task.level];
    return totalPoints > 0 ? (taskPoints / totalPoints) * teamPool : 0;
  };

  const getMemberById = (id: string | null) => {
    if (!id) return null;
    return teamMembers.find(m => m.id === id);
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days: Date[] = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const grouped: Record<string, ProjectTask[]> = {};
    filteredTasks.forEach(task => {
      if (task.dueDate) {
        const dateKey = task.dueDate;
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(task);
      }
    });
    return grouped;
  }, [filteredTasks]);

  const renderTaskBadge = (task: ProjectTask) => {
    const member = getMemberById(task.assigneeId);
    const value = getTaskValue(task);

    return (
      <Dialog key={task.id}>
        <DialogTrigger asChild>
          <div
            className={`text-xs text-white px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80 ${STATUS_COLORS[task.status]}`}
          >
            {task.title || 'Untitled'}
          </div>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{task.title || 'Untitled Task'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Badge className={STATUS_COLORS[task.status]}>{STATUS_LABELS[task.status]}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Level:</span>
              <Badge variant="outline">Lv{task.level.replace('lv', '')} ({TASK_POINTS[task.level]} pts)</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Value:</span>
              <span className="font-medium">${value.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Due:</span>
              <span>{task.dueDate ? format(parseISO(task.dueDate), 'MMMM d, yyyy') : 'No due date'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Assignee:</span>
              <span>{member ? `${member.name}${member.role ? ` (${member.role})` : ''}` : 'Unassigned'}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const renderDay = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const dayTasks = tasksByDate[dateKey] || [];
    const isCurrentMonth = isSameMonth(day, currentMonth);
    const isProjectDay = projectStartDate && projectEndDate && 
      day >= projectStartDate && day <= projectEndDate;

    return (
      <div
        key={dateKey}
        className={`min-h-[100px] border border-border p-1 ${
          !isCurrentMonth ? 'bg-muted/30' : ''
        } ${isToday(day) ? 'ring-2 ring-primary ring-inset' : ''} ${
          isProjectDay ? 'bg-primary/5' : ''
        }`}
      >
        <div className={`text-sm font-medium mb-1 ${
          !isCurrentMonth ? 'text-muted-foreground' : ''
        } ${isToday(day) ? 'text-primary' : ''}`}>
          {format(day, 'd')}
        </div>
        <div className="space-y-0.5">
          {dayTasks.slice(0, 3).map(task => renderTaskBadge(task))}
          {dayTasks.length > 3 && (
            <div className="text-xs text-muted-foreground text-center">
              +{dayTasks.length - 3} more
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {format(currentMonth, 'MMMM yyyy')}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(projectStartDate || new Date())}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-4 mt-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          {(Object.keys(STATUS_COLORS) as TaskStatus[]).map(status => (
            <div key={status} className="flex items-center gap-1">
              <div className={`w-3 h-3 rounded ${STATUS_COLORS[status]}`} />
              <span className="text-xs">{STATUS_LABELS[status]}</span>
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-2">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 mb-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map(day => renderDay(day))}
        </div>

        {filteredTasks.filter(t => t.dueDate).length === 0 && (
          <div className="py-8 text-center text-muted-foreground">
            No tasks with due dates{selectedMemberId ? ' for selected member' : ''}.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
