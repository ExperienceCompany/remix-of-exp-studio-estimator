import { ProjectTask, ProjectPhase, TeamMember, TASK_POINTS, TaskLevel, TaskStatus } from "@/types/teamProject";
import { TaskRow } from "./TaskRow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Circle, Clock, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TaskBoardViewProps {
  phase: ProjectPhase;
  teamPool: number;
  totalPoints: number;
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
  onUpdateTask, 
  onRemoveTask, 
  onAddTask 
}: TaskBoardViewProps) {
  const tasks = phase.tasks || [];
  
  const groupedTasks = {
    todo: tasks.filter(t => t.status === 'todo'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    done: tasks.filter(t => t.status === 'done')
  };

  const getMemberById = (id: string | null): TeamMember | undefined => {
    return phase.teamMembers.find(m => m.id === id);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
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
            <Button size="sm" onClick={onAddTask} className="gap-1">
              <Plus className="h-4 w-4" />
              Add Task
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Task Columns */}
      <div className="space-y-6">
        {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map(status => {
          const config = STATUS_CONFIG[status];
          const statusTasks = groupedTasks[status];
          const Icon = config.icon;

          return (
            <div key={status} className="space-y-2">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${config.className}`} />
                <h3 className="font-semibold text-sm">{config.label}</h3>
                <Badge variant="secondary" className="text-xs">
                  {statusTasks.length}
                </Badge>
              </div>
              
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
                        onUpdate={(updates) => onUpdateTask(task.id, updates)}
                        onRemove={() => onRemoveTask(task.id)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}