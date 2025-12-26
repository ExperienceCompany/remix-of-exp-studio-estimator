import { useState } from "react";
import { ProjectTask, ProjectPhase, TeamMember, TASK_POINTS, TaskLevel, TaskStatus, calculateRevenueByStatus } from "@/types/teamProject";
import { TaskRow } from "./TaskRow";
import { TaskTimeline } from "./TaskTimeline";
import { TaskCalendar } from "./TaskCalendar";
import { RevenueByStatusTable } from "./RevenueByStatusTable";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Plus, Circle, Clock, CheckCircle2, ChevronDown, ChevronRight, Users, LayoutList, GanttChart, CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type ViewMode = 'board' | 'timeline' | 'calendar';

interface TaskBoardViewProps {
  phase: ProjectPhase;
  teamPool: number;
  totalPoints: number;
  projectStartDate?: Date | null;
  projectEndDate?: Date | null;
  onUpdateTask: (taskId: string, updates: Partial<ProjectTask>) => void;
  onRemoveTask: (taskId: string) => void;
  onAddTask: () => void;
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; icon: React.ElementType; className: string }> = {
  todo: { label: 'To Do', icon: Circle, className: 'text-muted-foreground' },
  in_progress: { label: 'In Progress', icon: Clock, className: 'text-amber-500' },
  done: { label: 'Done', icon: CheckCircle2, className: 'text-green-500' }
};

export function calculateTaskValue(level: TaskLevel, totalPoints: number, teamPool: number): number {
  const taskPoints = TASK_POINTS[level];
  return totalPoints > 0 ? (taskPoints / totalPoints) * teamPool : 0;
}

export function TaskBoardView({ 
  phase, 
  teamPool, 
  totalPoints,
  projectStartDate,
  projectEndDate,
  onUpdateTask, 
  onRemoveTask, 
  onAddTask 
}: TaskBoardViewProps) {
  const tasks = phase.tasks || [];
  
  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  
  // Filter state
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  
  // Collapsible state for each status section
  const [expandedSections, setExpandedSections] = useState<Record<TaskStatus, boolean>>({
    todo: true,
    in_progress: true,
    done: true
  });

  const toggleSection = (status: TaskStatus) => {
    setExpandedSections(prev => ({
      ...prev,
      [status]: !prev[status]
    }));
  };

  // Apply filter
  const filteredTasks = selectedMemberId 
    ? tasks.filter(t => t.assigneeId === selectedMemberId)
    : tasks;
  
  const groupedTasks = {
    todo: filteredTasks.filter(t => t.status === 'todo'),
    in_progress: filteredTasks.filter(t => t.status === 'in_progress'),
    done: filteredTasks.filter(t => t.status === 'done')
  };

  const getMemberById = (id: string | null): TeamMember | undefined => {
    return phase.teamMembers.find(m => m.id === id);
  };

  // Calculate revenue by status for display
  const revenueByStatus = calculateRevenueByStatus(tasks, phase.teamMembers, teamPool, totalPoints);

  return (
    <div className="space-y-4">
      {/* Revenue by Status Table */}
      <RevenueByStatusTable revenueData={revenueByStatus} />

      {/* Header with Filters and View Toggle */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Stats */}
            <div className="flex gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">Phase Revenue:</span>{" "}
                <span className="font-semibold">${phase.revenue.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Team Pool:</span>{" "}
                <span className="font-semibold">${teamPool.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total Points:</span>{" "}
                <span className="font-semibold">{totalPoints}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Person Filter */}
              <Select 
                value={selectedMemberId || 'all'} 
                onValueChange={(val) => setSelectedMemberId(val === 'all' ? null : val)}
              >
                <SelectTrigger className="w-[180px] h-8">
                  <div className="flex items-center gap-2">
                    <Users className="h-3 w-3" />
                    <span className="truncate">
                      {selectedMemberId 
                        ? getMemberById(selectedMemberId)?.name || 'Unknown' 
                        : 'All Members'}
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Team Members</SelectItem>
                  {phase.teamMembers.map(member => (
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

              {/* View Mode Toggle */}
              <ToggleGroup 
                type="single" 
                value={viewMode} 
                onValueChange={(val) => val && setViewMode(val as ViewMode)}
                className="border rounded-md"
              >
                <ToggleGroupItem value="board" aria-label="Board view" className="h-8 px-3">
                  <LayoutList className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="timeline" aria-label="Timeline view" className="h-8 px-3">
                  <GanttChart className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="calendar" aria-label="Calendar view" className="h-8 px-3">
                  <CalendarDays className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>

              {viewMode === 'board' && (
                <Button size="sm" onClick={onAddTask} className="gap-1">
                  <Plus className="h-4 w-4" />
                  Add Task
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Content */}
      {viewMode === 'board' && (
        <div className="space-y-4">
          {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map(status => {
            const config = STATUS_CONFIG[status];
            const statusTasks = groupedTasks[status];
            const Icon = config.icon;
            const isExpanded = expandedSections[status];

            return (
              <Collapsible key={status} open={isExpanded} onOpenChange={() => toggleSection(status)}>
                <div className="space-y-2">
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center gap-2 w-full text-left hover:bg-muted/50 rounded-md p-2 -ml-2 transition-colors">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <Icon className={`h-4 w-4 ${config.className}`} />
                      <h3 className="font-semibold text-sm">{config.label}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {statusTasks.length}
                      </Badge>
                    </button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    {statusTasks.length === 0 ? (
                      <Card className="border-dashed">
                        <CardContent className="py-4 text-center text-muted-foreground text-sm">
                          No tasks
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-2">
                        {statusTasks.map(task => {
                          const member = getMemberById(task.assigneeId);
                          const taskValue = calculateTaskValue(task.level, totalPoints, teamPool);
                          
                          return (
                            <TaskRow
                              key={task.id}
                              task={task}
                              taskValue={taskValue}
                              assignee={member}
                              teamMembers={phase.teamMembers}
                              projectStartDate={projectStartDate}
                              projectEndDate={projectEndDate}
                              onUpdate={(updates) => onUpdateTask(task.id, updates)}
                              onRemove={() => onRemoveTask(task.id)}
                            />
                          );
                        })}
                      </div>
                    )}
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      )}

      {viewMode === 'timeline' && (
        <TaskTimeline
          tasks={filteredTasks}
          teamMembers={phase.teamMembers}
          projectStartDate={projectStartDate || null}
          projectEndDate={projectEndDate || null}
          teamPool={teamPool}
          totalPoints={totalPoints}
        />
      )}

      {viewMode === 'calendar' && (
        <TaskCalendar
          tasks={tasks}
          teamMembers={phase.teamMembers}
          projectStartDate={projectStartDate || null}
          projectEndDate={projectEndDate || null}
          teamPool={teamPool}
          totalPoints={totalPoints}
          selectedMemberId={selectedMemberId}
        />
      )}
    </div>
  );
}
