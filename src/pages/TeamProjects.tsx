import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { TeamProjectEstimator } from "@/components/teamProjects/TeamProjectEstimator";
import { TaskBoardGenerator, GeneratorOutput } from "@/components/teamProjects/TaskBoardGenerator";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Wand2, Calculator, Save, Check, FileDown } from "lucide-react";
import { useAdminLogById, useCreateAdminLog, useUpdateAdminLog } from "@/hooks/useAdminLogs";
import { useToast } from "@/hooks/use-toast";
import { ProjectPhase, calculatePhaseTotals, calculateRevenueByStatus, TASK_POINTS } from "@/types/teamProject";
import { generateProjectPayoutPdf, TaskPdfData, PhasePdfData } from "@/lib/generateProjectPayoutPdf";
import { format } from "date-fns";

export default function TeamProjects() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const logId = searchParams.get('logId');
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<string>(logId ? "editor" : "generator");
  const [generatedProject, setGeneratedProject] = useState<GeneratorOutput | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const { data: existingLog, isLoading: isLoadingLog } = useAdminLogById(logId);
  const createLogMutation = useCreateAdminLog();
  const updateLogMutation = useUpdateAdminLog();

  // Load project from log if logId is present
  useEffect(() => {
    if (existingLog && existingLog.data_json) {
      const data = existingLog.data_json as Record<string, unknown>;
      setGeneratedProject({
        projectName: (data.projectName as string) || existingLog.log_name || 'Untitled Project',
        projectType: (data.projectType as string) || 'custom',
        budget: existingLog.customer_total || 5000,
        description: (data.description as string) || '',
        allocationMode: (data.allocationMode as 'flexible' | 'balanced') || 'flexible',
        startDate: (data.startDate as string) || null,
        endDate: (data.endDate as string) || null,
        phases: (data.phases as ProjectPhase[]) || []
      });
      setActiveTab("editor");
    }
  }, [existingLog]);

  const handleGenerate = async (output: GeneratorOutput) => {
    setGeneratedProject(output);
    setActiveTab("editor");
    
    // Auto-save to admin logs
    try {
      const totalRevenue = output.phases.reduce((sum, p) => sum + p.revenue, 0);
      const teamPool = totalRevenue * 0.5;
      
      const result = await createLogMutation.mutateAsync({
        log_type: 'team_project',
        log_name: output.projectName,
        customer_total: totalRevenue,
        provider_payout: teamPool,
        gross_margin: teamPool,
        data_json: {
          projectName: output.projectName,
          projectType: output.projectType,
          description: output.description,
          allocationMode: output.allocationMode,
          startDate: output.startDate,
          endDate: output.endDate,
          phases: output.phases,
          generatedAt: new Date().toISOString()
        }
      });
      
      // Update URL with new log ID
      setSearchParams({ logId: result.id });
      
      toast({
        title: "Project created & saved",
        description: "Your task board has been generated and saved to logs."
      });
    } catch (error) {
      toast({
        title: "Failed to save project",
        description: "The task board was generated but could not be saved.",
        variant: "destructive"
      });
    }
  };

  const handleProjectUpdate = (phases: ProjectPhase[], projectName: string) => {
    if (generatedProject) {
      setGeneratedProject({
        ...generatedProject,
        projectName,
        phases
      });
      setHasUnsavedChanges(true);
    }
  };

  const handleSaveChanges = async () => {
    if (!logId || !generatedProject) return;
    
    try {
      const totalRevenue = generatedProject.phases.reduce((sum, p) => sum + p.revenue, 0);
      const teamPool = totalRevenue * 0.5;
      
      await updateLogMutation.mutateAsync({
        id: logId,
        log_name: generatedProject.projectName,
        customer_total: totalRevenue,
        provider_payout: teamPool,
        gross_margin: teamPool,
        data_json: {
          projectName: generatedProject.projectName,
          projectType: generatedProject.projectType,
          description: generatedProject.description,
          allocationMode: generatedProject.allocationMode,
          startDate: generatedProject.startDate,
          endDate: generatedProject.endDate,
          phases: generatedProject.phases,
          updatedAt: new Date().toISOString()
        }
      });
      
      setHasUnsavedChanges(false);
      toast({
        title: "Changes saved",
        description: "Your project has been updated."
      });
    } catch (error) {
      toast({
        title: "Failed to save",
        description: "Could not save your changes.",
        variant: "destructive"
      });
    }
  };

  const handleNewProject = () => {
    setGeneratedProject(null);
    setSearchParams({});
    setActiveTab("generator");
    setHasUnsavedChanges(false);
  };

  const handleExportPdf = () => {
    if (!generatedProject) return;
    
    const allPhaseTotals = generatedProject.phases.map(calculatePhaseTotals);
    const grandTotals = {
      revenue: allPhaseTotals.reduce((sum, p) => sum + p.phaseRevenue, 0),
      studioShare: allPhaseTotals.reduce((sum, p) => sum + p.studioShare, 0),
      teamPool: allPhaseTotals.reduce((sum, p) => sum + p.teamPool, 0)
    };

    const phasesWithTasks: PhasePdfData[] = generatedProject.phases.map((phase, i) => {
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
          dependsOn: task.dependsOn || [],
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
      projectName: generatedProject.projectName,
      reportDate: format(new Date(), 'MMMM d, yyyy'),
      startDate: generatedProject.startDate,
      endDate: generatedProject.endDate,
      phases: phasesWithTasks,
      grandTotals
    });
    
    toast({
      title: "PDF exported",
      description: "Your task board report has been downloaded."
    });
  };

  if (isLoadingLog && logId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading project...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Team Projects</h1>
              <p className="text-sm text-muted-foreground">
                {logId ? 'Editing saved project' : 'Points-Based Split System'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {generatedProject && (
              <Button variant="outline" onClick={handleExportPdf} className="gap-2">
                <FileDown className="h-4 w-4" />
                Export PDF
              </Button>
            )}
            {logId && hasUnsavedChanges && (
              <Button onClick={handleSaveChanges} className="gap-2">
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            )}
            {logId && !hasUnsavedChanges && (
              <Button variant="outline" disabled className="gap-2">
                <Check className="h-4 w-4" />
                Saved
              </Button>
            )}
            {generatedProject && (
              <Button variant="outline" onClick={handleNewProject}>
                New Project
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {!generatedProject ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="generator" className="gap-2">
                <Wand2 className="h-4 w-4" />
                Generator
              </TabsTrigger>
              <TabsTrigger value="editor" className="gap-2">
                <Calculator className="h-4 w-4" />
                Manual Editor
              </TabsTrigger>
            </TabsList>

            <TabsContent value="generator">
              <TaskBoardGenerator onGenerate={handleGenerate} />
            </TabsContent>

            <TabsContent value="editor">
              <TeamProjectEstimator />
            </TabsContent>
          </Tabs>
        ) : (
          <TeamProjectEstimator 
            initialData={generatedProject}
            onProjectUpdate={handleProjectUpdate}
          />
        )}
      </main>
    </div>
  );
}
