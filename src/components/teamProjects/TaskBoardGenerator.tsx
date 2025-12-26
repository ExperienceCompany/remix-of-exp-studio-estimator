import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Wand2, UserPlus } from "lucide-react";
import { generateFlexibleTasks, generateBalancedTasks, ProjectPhase } from "@/types/teamProject";

interface TeamMemberInput {
  id: string;
  name: string;
  role: string;
}

export interface GeneratorOutput {
  projectName: string;
  projectType: string;
  budget: number;
  description: string;
  allocationMode: 'flexible' | 'balanced';
  phases: ProjectPhase[];
}

interface TaskBoardGeneratorProps {
  onGenerate: (output: GeneratorOutput) => void;
}

const PROJECT_TYPES = [
  { value: 'website', label: 'Website' },
  { value: 'marketing', label: 'Marketing Campaign' },
  { value: 'video', label: 'Video Production' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'photo', label: 'Photo Project' },
  { value: 'custom', label: 'Custom' }
];

const ROLE_SUGGESTIONS = [
  'Designer',
  'Developer',
  'Writer',
  'Creative Director',
  'Social Media Mgr',
  'Graphic Designer',
  'Copywriter',
  'Video Editor',
  'Photographer',
  'Producer'
];

export function TaskBoardGenerator({ onGenerate }: TaskBoardGeneratorProps) {
  const [projectName, setProjectName] = useState("");
  const [projectType, setProjectType] = useState("website");
  const [budget, setBudget] = useState(5000);
  const [description, setDescription] = useState("");
  const [allocationMode, setAllocationMode] = useState<'flexible' | 'balanced'>('flexible');
  const [teamMembers, setTeamMembers] = useState<TeamMemberInput[]>([
    { id: crypto.randomUUID(), name: '', role: 'Designer' }
  ]);

  const addTeamMember = () => {
    setTeamMembers([
      ...teamMembers,
      { id: crypto.randomUUID(), name: '', role: '' }
    ]);
  };

  const updateTeamMember = (id: string, updates: Partial<TeamMemberInput>) => {
    setTeamMembers(teamMembers.map(m => 
      m.id === id ? { ...m, ...updates } : m
    ));
  };

  const removeTeamMember = (id: string) => {
    if (teamMembers.length > 1) {
      setTeamMembers(teamMembers.filter(m => m.id !== id));
    }
  };

  const handleGenerate = () => {
    const validMembers = teamMembers.filter(m => m.name.trim());
    
    if (validMembers.length === 0) {
      return;
    }

    const memberInputs = validMembers.map(m => ({
      name: m.name.trim(),
      role: m.role.trim()
    }));

    // Generate tasks based on allocation mode
    const result = allocationMode === 'balanced'
      ? generateBalancedTasks(memberInputs, budget)
      : generateFlexibleTasks(memberInputs, projectType, budget);

    // Create the project phase
    const phase: ProjectPhase = {
      id: crypto.randomUUID(),
      name: projectName || 'Main Phase',
      revenue: budget,
      teamMembers: result.members,
      tasks: result.tasks
    };

    onGenerate({
      projectName: projectName || 'Untitled Project',
      projectType,
      budget,
      description,
      allocationMode,
      phases: [phase]
    });
  };

  const isValid = teamMembers.some(m => m.name.trim()) && budget > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5" />
          Task Board Generator
        </CardTitle>
        <CardDescription>
          Enter project details and team members to auto-generate a task board
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Project Details */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="project-name">Project Title</Label>
            <Input
              id="project-name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g., Company Website Redesign"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="project-type">Project Type</Label>
            <Select value={projectType} onValueChange={setProjectType}>
              <SelectTrigger id="project-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="budget">Project Budget ($)</Label>
          <Input
            id="budget"
            type="number"
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            min={0}
            step={100}
          />
          <p className="text-xs text-muted-foreground">
            Team pool will be 50% of budget (${(budget * 0.5).toLocaleString()})
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Project Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the project scope, deliverables, and key requirements..."
            rows={4}
          />
        </div>

        {/* Team Members */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Team Members</Label>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={addTeamMember}
              className="gap-1"
            >
              <UserPlus className="h-4 w-4" />
              Add Member
            </Button>
          </div>

          <div className="space-y-2">
            {teamMembers.map((member, index) => (
              <div key={member.id} className="flex gap-2 items-center">
                <Input
                  value={member.name}
                  onChange={(e) => updateTeamMember(member.id, { name: e.target.value })}
                  placeholder={`Member ${index + 1} name`}
                  className="flex-1"
                />
                <Select 
                  value={member.role} 
                  onValueChange={(v) => updateTeamMember(member.id, { role: v })}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_SUGGESTIONS.map(role => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeTeamMember(member.id)}
                  disabled={teamMembers.length === 1}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Allocation Mode */}
        <div className="space-y-3 pt-4 border-t border-border">
          <Label>Task Allocation Mode</Label>
          
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="space-y-1">
              <div className="font-medium">
                {allocationMode === 'flexible' ? 'Flexible Allocation' : 'Balanced Allocation'}
              </div>
              <div className="text-sm text-muted-foreground">
                {allocationMode === 'flexible' 
                  ? 'Tasks distributed by role complexity (leads get more Lv3, juniors get more Lv1/Lv2)'
                  : 'Equal pay distribution — each member receives the same total payout'
                }
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Flexible</span>
              <Switch
                checked={allocationMode === 'balanced'}
                onCheckedChange={(checked) => setAllocationMode(checked ? 'balanced' : 'flexible')}
              />
              <span className="text-sm text-muted-foreground">Balanced</span>
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <Button 
          onClick={handleGenerate}
          disabled={!isValid}
          className="w-full gap-2"
          size="lg"
        >
          <Wand2 className="h-4 w-4" />
          Generate Task Board
        </Button>
      </CardContent>
    </Card>
  );
}
