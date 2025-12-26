import { useState } from "react";
import { 
  TeamMember, 
  ProjectPhase, 
  calculatePhaseTotals,
  EXAMPLE_WEBSITE_PROJECT,
  EXAMPLE_MARKETING_CAMPAIGN
} from "@/types/teamProject";
import { MemberTaskInput } from "./MemberTaskInput";
import { PayoutDashboard } from "./PayoutDashboard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, UserPlus, Layers, Sparkles, FileDown } from "lucide-react";
import { generateProjectPayoutPdf } from "@/lib/generateProjectPayoutPdf";
import { format } from "date-fns";

export function TeamProjectEstimator() {
  const [projectName, setProjectName] = useState("");
  const [phases, setPhases] = useState<ProjectPhase[]>([
    {
      id: crypto.randomUUID(),
      name: "Phase 1",
      revenue: 5000,
      teamMembers: []
    }
  ]);

  const addPhase = () => {
    setPhases([
      ...phases,
      {
        id: crypto.randomUUID(),
        name: `Phase ${phases.length + 1}`,
        revenue: 5000,
        teamMembers: []
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
      updatePhase(phaseId, {
        teamMembers: phase.teamMembers.map(m =>
          m.id === memberId ? updates : m
        )
      });
    }
  };

  const removeMember = (phaseId: string, memberId: string) => {
    const phase = phases.find(p => p.id === phaseId);
    if (phase) {
      updatePhase(phaseId, {
        teamMembers: phase.teamMembers.filter(m => m.id !== memberId)
      });
    }
  };

  const loadExample = (type: 'website' | 'marketing') => {
    if (type === 'website') {
      setProjectName("Website Project");
      setPhases([{ ...EXAMPLE_WEBSITE_PROJECT, id: crypto.randomUUID() }]);
    } else {
      setProjectName("Marketing Campaign");
      setPhases(EXAMPLE_MARKETING_CAMPAIGN.map(p => ({ ...p, id: crypto.randomUUID() })));
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
              onClick={() => generateProjectPayoutPdf({
                projectName,
                reportDate: format(new Date(), 'MMMM d, yyyy'),
                phases: allPhaseTotals,
                grandTotals
              })}
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
                  <PayoutDashboard phaseTotals={phaseTotals} projectName={projectName} />
                </div>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
