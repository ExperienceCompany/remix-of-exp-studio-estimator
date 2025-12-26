import { ProjectTask, TeamMember, TaskStatus, TASK_POINTS } from "@/types/teamProject";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { differenceInDays, parseISO, format, isWithinInterval, addDays, startOfDay } from "date-fns";
import { useMemo } from "react";

interface TaskTimelineProps {
  tasks: ProjectTask[];
  teamMembers: TeamMember[];
  projectStartDate: Date | null;
  projectEndDate: Date | null;
  teamPool: number;
  totalPoints: number;
}

const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: 'bg-muted-foreground/30',
  in_progress: 'bg-amber-500',
  done: 'bg-green-500'
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done'
};

export function TaskTimeline({ 
  tasks, 
  teamMembers, 
  projectStartDate, 
  projectEndDate,
  teamPool,
  totalPoints
}: TaskTimelineProps) {
  const today = startOfDay(new Date());
  
  // Calculate timeline parameters
  const { days, startDate, endDate } = useMemo(() => {
    if (!projectStartDate || !projectEndDate) {
      // Fallback: use next 30 days
      const start = today;
      const end = addDays(today, 30);
      return { days: 30, startDate: start, endDate: end };
    }
    const dayCount = differenceInDays(projectEndDate, projectStartDate) + 1;
    return { days: Math.max(dayCount, 7), startDate: projectStartDate, endDate: projectEndDate };
  }, [projectStartDate, projectEndDate, today]);

  // Group tasks by assignee
  const tasksByAssignee = useMemo(() => {
    const grouped: Record<string, ProjectTask[]> = {};
    const unassigned: ProjectTask[] = [];
    
    tasks.forEach(task => {
      if (task.assigneeId) {
        if (!grouped[task.assigneeId]) grouped[task.assigneeId] = [];
        grouped[task.assigneeId].push(task);
      } else {
        unassigned.push(task);
      }
    });
    
    return { grouped, unassigned };
  }, [tasks]);

  const getTaskValue = (task: ProjectTask) => {
    const taskPoints = TASK_POINTS[task.level];
    return totalPoints > 0 ? (taskPoints / totalPoints) * teamPool : 0;
  };

  const getMemberById = (id: string) => teamMembers.find(m => m.id === id);

  const getTaskPosition = (task: ProjectTask) => {
    if (!task.dueDate) return null;
    const taskDate = parseISO(task.dueDate);
    const dayOffset = differenceInDays(taskDate, startDate);
    if (dayOffset < 0 || dayOffset >= days) return null;
    return (dayOffset / days) * 100;
  };

  // Generate date markers
  const dateMarkers = useMemo(() => {
    const markers: { date: Date; label: string; position: number }[] = [];
    const interval = Math.ceil(days / 7); // Show ~7 markers
    
    for (let i = 0; i <= days; i += Math.max(1, interval)) {
      const date = addDays(startDate, i);
      markers.push({
        date,
        label: format(date, 'MMM d'),
        position: (i / days) * 100
      });
    }
    return markers;
  }, [days, startDate]);

  // Today marker position
  const todayPosition = useMemo(() => {
    if (!isWithinInterval(today, { start: startDate, end: endDate })) return null;
    const dayOffset = differenceInDays(today, startDate);
    return (dayOffset / days) * 100;
  }, [today, startDate, endDate, days]);

  if (!projectStartDate || !projectEndDate) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>Set project start and end dates to view the timeline.</p>
          <p className="text-sm">Go to the Task Board Generator to set project dates.</p>
        </CardContent>
      </Card>
    );
  }

  const renderTaskBar = (task: ProjectTask) => {
    const position = getTaskPosition(task);
    if (position === null) return null;
    
    const value = getTaskValue(task);
    const member = task.assigneeId ? getMemberById(task.assigneeId) : null;

    return (
      <TooltipProvider key={task.id}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={`absolute h-6 rounded-md cursor-pointer transition-all hover:opacity-80 flex items-center px-2 text-xs text-white font-medium truncate ${STATUS_COLORS[task.status]}`}
              style={{
                left: `${position}%`,
                width: `${Math.max(100 / days * 2, 3)}%`,
                minWidth: '60px'
              }}
            >
              {task.title || 'Untitled'}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-medium">{task.title || 'Untitled'}</p>
              <p className="text-xs">Due: {task.dueDate ? format(parseISO(task.dueDate), 'MMM d, yyyy') : 'No date'}</p>
              <p className="text-xs">Status: {STATUS_LABELS[task.status]}</p>
              <p className="text-xs">Value: ${value.toFixed(2)}</p>
              {member && <p className="text-xs">Assignee: {member.name}</p>}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const renderMemberRow = (memberId: string, memberTasks: ProjectTask[]) => {
    const member = getMemberById(memberId);
    const tasksWithDates = memberTasks.filter(t => t.dueDate);
    
    return (
      <div key={memberId} className="flex border-b border-border last:border-b-0">
        <div className="w-40 flex-shrink-0 p-3 border-r border-border bg-muted/30">
          <div className="font-medium text-sm truncate">{member?.name || 'Unknown'}</div>
          {member?.role && (
            <div className="text-xs text-muted-foreground truncate">{member.role}</div>
          )}
          <Badge variant="secondary" className="text-xs mt-1">
            {memberTasks.length} tasks
          </Badge>
        </div>
        <div className="flex-1 relative h-16 p-2">
          {tasksWithDates.map(task => renderTaskBar(task))}
          {tasksWithDates.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
              No tasks with due dates
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardContent className="p-0">
        {/* Legend */}
        <div className="flex items-center gap-4 p-4 border-b border-border">
          <span className="text-sm font-medium">Status:</span>
          {(Object.keys(STATUS_COLORS) as TaskStatus[]).map(status => (
            <div key={status} className="flex items-center gap-1">
              <div className={`w-3 h-3 rounded ${STATUS_COLORS[status]}`} />
              <span className="text-xs">{STATUS_LABELS[status]}</span>
            </div>
          ))}
        </div>

        {/* Timeline Header */}
        <div className="flex border-b border-border">
          <div className="w-40 flex-shrink-0 p-3 border-r border-border bg-muted/30">
            <span className="text-sm font-medium">Team Member</span>
          </div>
          <div className="flex-1 relative h-10">
            {dateMarkers.map((marker, i) => (
              <div
                key={i}
                className="absolute top-0 h-full border-l border-border/50 flex items-center"
                style={{ left: `${marker.position}%` }}
              >
                <span className="text-xs text-muted-foreground ml-1">{marker.label}</span>
              </div>
            ))}
            {todayPosition !== null && (
              <div
                className="absolute top-0 h-full border-l-2 border-primary z-10"
                style={{ left: `${todayPosition}%` }}
              >
                <span className="absolute -top-0 left-1 text-xs font-medium text-primary">Today</span>
              </div>
            )}
          </div>
        </div>

        {/* Member Rows */}
        <div className="divide-y divide-border">
          {Object.entries(tasksByAssignee.grouped).map(([memberId, memberTasks]) =>
            renderMemberRow(memberId, memberTasks)
          )}
          
          {tasksByAssignee.unassigned.length > 0 && (
            <div className="flex border-b border-border">
              <div className="w-40 flex-shrink-0 p-3 border-r border-border bg-muted/30">
                <div className="font-medium text-sm text-muted-foreground">Unassigned</div>
                <Badge variant="outline" className="text-xs mt-1">
                  {tasksByAssignee.unassigned.length} tasks
                </Badge>
              </div>
              <div className="flex-1 relative h-16 p-2">
                {tasksByAssignee.unassigned.filter(t => t.dueDate).map(task => renderTaskBar(task))}
              </div>
            </div>
          )}
        </div>

        {tasks.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No tasks to display. Add tasks in the Task Board view.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
