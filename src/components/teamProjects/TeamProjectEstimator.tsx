import { useState, useEffect } from "react";
import { 
  TeamMember, 
  ProjectPhase,
  ProjectTask,
  calculatePhaseTotals,
  calculateRevenueByStatus,
  syncTasksWithMemberCounts,
  EXAMPLE_WEBSITE_PROJECT,
  EXAMPLE_MARKETING_CAMPAIGN,
  TASK_POINTS
} from "@/types/teamProject";
import { MemberTaskInput } from "./MemberTaskInput";
import { PayoutDashboard } from "./PayoutDashboard";
import { TaskBoardView } from "./TaskBoardView";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, UserPlus, Layers, Sparkles, FileDown, Users, ClipboardList } from "lucide-react";
import { generateProjectPayoutPdf, TaskPdfData, PhasePdfData } from "@/lib/generateProjectPayoutPdf";
import { format, parseISO } from "date-fns";

type ViewMode = 'team' | 'tasks';

interface InitialData {
  projectName: string;
  projectType?: string;
  budget?: number;
  description?: string;
  allocationMode?: 'flexible' | 'balanced';
  startDate?: string | null;
  endDate?: string | null;
  phases: ProjectPhase[];
}

interface TeamProjectEstimatorProps {
  initialData?: InitialData;
  onProjectUpdate?: (phases: ProjectPhase[], projectName: string) => void;
}

export function TeamProjectEstimator({ initialData, onProjectUpdate }: TeamProjectEstimatorProps) {
  const [projectName, setProjectName] = useState(initialData?.projectName || "");
  const [phases, setPhases] = useState<ProjectPhase[]>(
    initialData?.phases || [{
      id: crypto.randomUUID(),
      name: "Phase 1",
      revenue: 5000,
      teamMembers: [],
      tasks: []
    }]
  );
  const [viewMode, setViewMode] = useState<ViewMode>('team');

  // Sync with initialData when it changes
  useEffect(() => {
    if (initialData) {
      setProjectName(initialData.projectName);
      setPhases(initialData.phases);
    }
  }, [initialData]);

  // Notify parent of changes
  useEffect(() => {
    if (onProjectUpdate) {
      onProjectUpdate(phases, projectName);
    }
  }, [phases, projectName]);

  const addPhase = () => {
    setPhases([
      ...phases,
      {
        id: crypto.randomUUID(),
        name: `Phase ${phases.length + 1}`,
        revenue: 5000,
        teamMembers: [],
        tasks: []
      }
    ]);
  };

  const updatePhase = (phaseId: string, updates: Partial<ProjectPhase>) => {
    setPhases(phases.map(p => 
      p.id === phaseId ? { ...p, ...updates } : p
    ));
  };

  const removePhase = (phaseId: string) => {
    if (phases.length > 1) {
      setPhases(phases.filter(p => p.id !== phaseId));
    }
  };

  const addMember = (phaseId: string) => {
    const phase = phases.find(p => p.id === phaseId);
    if (phase) {
      const newMember: TeamMember = {
        id: crypto.randomUUID(),
        name: "",
        role: "",
        tasksLv1: 0,
        tasksLv2: 0,
        tasksLv3: 0
      };
      updatePhase(phaseId, {
        teamMembers: [...phase.teamMembers, newMember]
      });
    }
  };

  const updateMember = (phaseId: string, memberId: string, updates: TeamMember) => {
    const phase = phases.find(p => p.id === phaseId);
    if (phase) {
      const oldMember = phase.teamMembers.find(m => m.id === memberId);
      
      // Check if task counts changed
      const countsChanged = oldMember && (
        oldMember.tasksLv1 !== updates.tasksLv1 ||
        oldMember.tasksLv2 !== updates.tasksLv2 ||
        oldMember.tasksLv3 !== updates.tasksLv3
      );
      
      let updatedTasks = phase.tasks || [];
      if (countsChanged) {
        updatedTasks = syncTasksWithMemberCounts(updates, phase.tasks || []);
      }
      
      updatePhase(phaseId, {
        teamMembers: phase.teamMembers.map(m => m.id === memberId ? updates : m),
        tasks: updatedTasks
      });
    }
  };

  const removeMember = (phaseId: string, memberId: string) => {
    const phase = phases.find(p => p.id === phaseId);
    if (phase) {
      // Also remove tasks assigned to this member
      const updatedTasks = (phase.tasks || []).map(t => 
        t.assigneeId === memberId ? { ...t, assigneeId: null } : t
      );
      updatePhase(phaseId, {
        teamMembers: phase.teamMembers.filter(m => m.id !== memberId),
        tasks: updatedTasks
      });
    }
  };

  // Task management
  const addTask = (phaseId: string) => {
    const phase = phases.find(p => p.id === phaseId);
    if (phase) {
      const newTask: ProjectTask = {
        id: crypto.randomUUID(),
        title: "",
        level: 'lv2',
        status: 'todo',
        assigneeId: null
      };
      updatePhase(phaseId, {
        tasks: [...(phase.tasks || []), newTask]
      });
    }
  };

  const updateTask = (phaseId: string, taskId: string, updates: Partial<ProjectTask>) => {
    const phase = phases.find(p => p.id === phaseId);
    if (phase) {
      const updatedTasks = (phase.tasks || []).map(t =>
        t.id === taskId ? { ...t, ...updates } : t
      );
      
      // Sync member task counts based on task assignments
      const memberTaskCounts = new Map<string, { lv1: number; lv2: number; lv3: number }>();
      phase.teamMembers.forEach(m => {
        memberTaskCounts.set(m.id, { lv1: 0, lv2: 0, lv3: 0 });
      });
      
      updatedTasks.forEach(task => {
        if (task.assigneeId && memberTaskCounts.has(task.assigneeId)) {
          const counts = memberTaskCounts.get(task.assigneeId)!;
          if (task.level === 'lv1') counts.lv1++;
          else if (task.level === 'lv2') counts.lv2++;
          else if (task.level === 'lv3') counts.lv3++;
        }
      });

      const updatedMembers = phase.teamMembers.map(m => {
        const counts = memberTaskCounts.get(m.id);
        if (counts) {
          return {
            ...m,
            tasksLv1: counts.lv1,
            tasksLv2: counts.lv2,
            tasksLv3: counts.lv3
          };
        }
        return m;
      });

      updatePhase(phaseId, {
        tasks: updatedTasks,
        teamMembers: updatedMembers
      });
    }
  };

  const removeTask = (phaseId: string, taskId: string) => {
    const phase = phases.find(p => p.id === phaseId);
    if (phase) {
      const taskToRemove = (phase.tasks || []).find(t => t.id === taskId);
      const updatedTasks = (phase.tasks || []).filter(t => t.id !== taskId);
      
      // Update member task counts if task was assigned
      let updatedMembers = phase.teamMembers;
      if (taskToRemove?.assigneeId) {
        updatedMembers = phase.teamMembers.map(m => {
          if (m.id === taskToRemove.assigneeId) {
            return {
              ...m,
              tasksLv1: taskToRemove.level === 'lv1' ? m.tasksLv1 - 1 : m.tasksLv1,
              tasksLv2: taskToRemove.level === 'lv2' ? m.tasksLv2 - 1 : m.tasksLv2,
              tasksLv3: taskToRemove.level === 'lv3' ? m.tasksLv3 - 1 : m.tasksLv3
            };
          }
          return m;
        });
      }
      
      updatePhase(phaseId, {
        tasks: updatedTasks,
        teamMembers: updatedMembers
      });
    }
  };

  const loadExample = (type: 'website' | 'marketing') => {
    if (type === 'website') {
      setProjectName("Website Project");
      setPhases([{ 
        ...EXAMPLE_WEBSITE_PROJECT, 
        id: crypto.randomUUID(),
        tasks: EXAMPLE_WEBSITE_PROJECT.tasks?.map(t => ({ ...t, id: crypto.randomUUID() })) || []
      }]);
    } else {
      setProjectName("Marketing Campaign");
      setPhases(EXAMPLE_MARKETING_CAMPAIGN.map(p => ({ 
        ...p, 
        id: crypto.randomUUID(),
        tasks: p.tasks?.map(t => ({ ...t, id: crypto.randomUUID() })) || []
      })));
    }
  };

  // Calculate totals for all phases
  const allPhaseTotals = phases.map(calculatePhaseTotals);
  const grandTotals = {
    revenue: allPhaseTotals.reduce((sum, p) => sum + p.phaseRevenue, 0),
    studioShare: allPhaseTotals.reduce((sum, p) => sum + p.studioShare, 0),
    teamPool: allPhaseTotals.reduce((sum, p) => sum + p.teamPool, 0)
  };

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <Card>
        <CardHeader>
          <CardTitle>Team-Based Project Estimator</CardTitle>
          <CardDescription>
            Calculate payouts using the 50/50 points-based split system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="project-name">Project Name</Label>
            <Input
              id="project-name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter project name"
            />
          </div>

          {/* Quick Load Examples */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground self-center">Load example:</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => loadExample('website')}
              className="gap-1"
            >
              <Sparkles className="h-3 w-3" />
              Website Project
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => loadExample('marketing')}
              className="gap-1"
            >
              <Sparkles className="h-3 w-3" />
              Marketing Campaign
            </Button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <span className="text-sm text-muted-foreground">View:</span>
            <div className="flex gap-1">
              <Button
                variant={viewMode === 'team' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('team')}
                className="gap-1"
              >
                <Users className="h-3 w-3" />
                Team View
              </Button>
              <Button
                variant={viewMode === 'tasks' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('tasks')}
                className="gap-1"
              >
                <ClipboardList className="h-3 w-3" />
                Task Board
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grand Totals (if multiple phases) */}
      {phases.length > 1 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">${grandTotals.revenue.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Revenue</div>
              </div>
              <div>
                <div className="text-2xl font-bold">${grandTotals.studioShare.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Studio Share</div>
              </div>
              <div>
                <div className="text-2xl font-bold">${grandTotals.teamPool.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Team Pool</div>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => {
                // Build phases with tasks for PDF
                const phasesWithTasks: PhasePdfData[] = phases.map((phase, i) => {
                  const phaseTotals = allPhaseTotals[i];
                  const tasks = phase.tasks || [];
                  
                  const taskPdfData: TaskPdfData[] = tasks.map(task => {
                    const taskPoints = TASK_POINTS[task.level];
                    const value = phaseTotals.totalPoints > 0 ? (taskPoints / phaseTotals.totalPoints) * phaseTotals.teamPool : 0;
                    const member = phase.teamMembers.find(m => m.id === task.assigneeId);
                    return {
                      id: task.id,
                      title: task.title,
                      level: task.level,
                      status: task.status,
                      assigneeName: member?.name || null,
                      dueDate: task.dueDate || null,
                      value
                    };
                  });
                  
                  const revenueByStatus = calculateRevenueByStatus(tasks, phase.teamMembers, phaseTotals.teamPool, phaseTotals.totalPoints);
                  
                  return {
                    ...phaseTotals,
                    tasks: taskPdfData,
                    revenueByStatus
                  };
                });
                
                generateProjectPayoutPdf({
                  projectName,
                  reportDate: format(new Date(), 'MMMM d, yyyy'),
                  phases: phasesWithTasks,
                  grandTotals
                });
              }}
            >
              <FileDown className="h-4 w-4" />
              Download Full Project Report
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Phases */}
      <Tabs defaultValue={phases[0]?.id} className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="h-auto flex-wrap">
            {phases.map((phase, index) => (
              <TabsTrigger key={phase.id} value={phase.id} className="gap-1">
                <Layers className="h-3 w-3" />
                {phase.name || `Phase ${index + 1}`}
              </TabsTrigger>
            ))}
          </TabsList>
          <Button variant="outline" size="sm" onClick={addPhase} className="gap-1">
            <Plus className="h-4 w-4" />
            Add Phase
          </Button>
        </div>

        {phases.map((phase, index) => {
          const phaseTotals = calculatePhaseTotals(phase);
          
          return (
            <TabsContent key={phase.id} value={phase.id} className="mt-0">
              {viewMode === 'team' ? (
                // Team View
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Left: Phase Setup & Members */}
                  <div className="space-y-4">
                    {/* Phase Config */}
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-base">Phase Settings</CardTitle>
                          {phases.length > 1 && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => removePhase(phase.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              Remove Phase
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <Label htmlFor={`phase-name-${phase.id}`}>Phase Name</Label>
                          <Input
                            id={`phase-name-${phase.id}`}
                            value={phase.name}
                            onChange={(e) => updatePhase(phase.id, { name: e.target.value })}
                            placeholder="Phase name"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`phase-revenue-${phase.id}`}>Phase Revenue ($)</Label>
                          <Input
                            id={`phase-revenue-${phase.id}`}
                            type="number"
                            value={phase.revenue}
                            onChange={(e) => updatePhase(phase.id, { revenue: Number(e.target.value) })}
                            min={0}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Team Members */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Team Members</h3>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => addMember(phase.id)}
                          className="gap-1"
                        >
                          <UserPlus className="h-4 w-4" />
                          Add Member
                        </Button>
                      </div>

                      {phase.teamMembers.length === 0 ? (
                        <Card className="border-dashed">
                          <CardContent className="py-8 text-center text-muted-foreground">
                            <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No team members yet</p>
                            <p className="text-sm">Add members to assign tasks and calculate payouts</p>
                          </CardContent>
                        </Card>
                      ) : (
                        phase.teamMembers.map(member => (
                          <MemberTaskInput
                            key={member.id}
                            member={member}
                            onUpdate={(updated) => updateMember(phase.id, member.id, updated)}
                            onRemove={() => removeMember(phase.id, member.id)}
                          />
                        ))
                      )}
                    </div>
                  </div>

                  {/* Right: Payout Dashboard */}
                  <div>
                    <PayoutDashboard 
                      phaseTotals={phaseTotals} 
                      projectName={projectName}
                      tasks={phase.tasks || []}
                      teamMembers={phase.teamMembers}
                    />
                  </div>
                </div>
              ) : (
                // Task Board View
                <div className="grid lg:grid-cols-2 gap-6">
                  <div className="lg:col-span-2">
                    <TaskBoardView
                      phase={phase}
                      teamPool={phaseTotals.teamPool}
                      totalPoints={phaseTotals.totalPoints}
                      projectStartDate={initialData?.startDate ? parseISO(initialData.startDate) : null}
                      projectEndDate={initialData?.endDate ? parseISO(initialData.endDate) : null}
                      onUpdateTask={(taskId, updates) => updateTask(phase.id, taskId, updates)}
                      onRemoveTask={(taskId) => removeTask(phase.id, taskId)}
                      onAddTask={() => addTask(phase.id)}
                    />
                  </div>
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}