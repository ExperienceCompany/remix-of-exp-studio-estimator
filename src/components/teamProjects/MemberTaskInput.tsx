import { TeamMember, TASK_POINTS, calculateMemberPoints } from "@/types/teamProject";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Trash2, User } from "lucide-react";

interface MemberTaskInputProps {
  member: TeamMember;
  onUpdate: (updated: TeamMember) => void;
  onRemove: () => void;
}

export function MemberTaskInput({ member, onUpdate, onRemove }: MemberTaskInputProps) {
  const lv1Points = member.tasksLv1 * TASK_POINTS.lv1;
  const lv2Points = member.tasksLv2 * TASK_POINTS.lv2;
  const lv3Points = member.tasksLv3 * TASK_POINTS.lv3;
  const totalPoints = calculateMemberPoints(member);

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor={`name-${member.id}`} className="text-xs text-muted-foreground">Name</Label>
                <Input
                  id={`name-${member.id}`}
                  value={member.name}
                  onChange={(e) => onUpdate({ ...member, name: e.target.value })}
                  placeholder="Member name"
                  className="h-8"
                />
              </div>
              <div>
                <Label htmlFor={`role-${member.id}`} className="text-xs text-muted-foreground">Role</Label>
                <Input
                  id={`role-${member.id}`}
                  value={member.role || ''}
                  onChange={(e) => onUpdate({ ...member, role: e.target.value })}
                  placeholder="Role (optional)"
                  className="h-8"
                />
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onRemove} className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lv1 Tasks */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Lv1 Tasks ({TASK_POINTS.lv1} pts each)</span>
            <span className="font-medium">{member.tasksLv1} tasks = {lv1Points} pts</span>
          </div>
          <Slider
            value={[member.tasksLv1]}
            onValueChange={([val]) => onUpdate({ ...member, tasksLv1: val })}
            max={20}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0</span>
            <span>20</span>
          </div>
        </div>

        {/* Lv2 Tasks */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Lv2 Tasks ({TASK_POINTS.lv2} pts each)</span>
            <span className="font-medium">{member.tasksLv2} tasks = {lv2Points} pts</span>
          </div>
          <Slider
            value={[member.tasksLv2]}
            onValueChange={([val]) => onUpdate({ ...member, tasksLv2: val })}
            max={10}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0</span>
            <span>10</span>
          </div>
        </div>

        {/* Lv3 Tasks */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Lv3 Tasks ({TASK_POINTS.lv3} pts each)</span>
            <span className="font-medium">{member.tasksLv3} tasks = {lv3Points} pts</span>
          </div>
          <Slider
            value={[member.tasksLv3]}
            onValueChange={([val]) => onUpdate({ ...member, tasksLv3: val })}
            max={5}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0</span>
            <span>5</span>
          </div>
        </div>

        {/* Total */}
        <div className="pt-2 border-t border-border">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Total Points</span>
            <span className="text-lg font-bold text-primary">{totalPoints} pts</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
