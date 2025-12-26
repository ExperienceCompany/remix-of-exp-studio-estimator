export const TASK_POINTS = {
  lv1: 2.5,   // Easy / Quick
  lv2: 5,     // Fair / Medium  
  lv3: 10     // Lengthy / Expert
} as const;

export interface TeamMember {
  id: string;
  name: string;
  role?: string;
  tasksLv1: number;
  tasksLv2: number;
  tasksLv3: number;
}

export interface ProjectPhase {
  id: string;
  name: string;
  revenue: number;
  teamMembers: TeamMember[];
}

export interface TeamProject {
  name: string;
  phases: ProjectPhase[];
}

export interface MemberPayout {
  memberId: string;
  memberName: string;
  role?: string;
  lv1Tasks: number;
  lv2Tasks: number;
  lv3Tasks: number;
  lv1Points: number;
  lv2Points: number;
  lv3Points: number;
  totalPoints: number;
  percentOfPool: number;
  payout: number;
}

export interface PhaseTotals {
  phaseName: string;
  phaseRevenue: number;
  studioShare: number;      // 50%
  teamPool: number;         // 50%
  totalPoints: number;
  memberPayouts: MemberPayout[];
}

export function calculateMemberPoints(member: TeamMember): number {
  return (
    member.tasksLv1 * TASK_POINTS.lv1 +
    member.tasksLv2 * TASK_POINTS.lv2 +
    member.tasksLv3 * TASK_POINTS.lv3
  );
}

export function calculatePhaseTotals(phase: ProjectPhase): PhaseTotals {
  const studioShare = phase.revenue * 0.5;
  const teamPool = phase.revenue * 0.5;
  
  // Calculate total points for all members
  const totalPoints = phase.teamMembers.reduce(
    (sum, member) => sum + calculateMemberPoints(member),
    0
  );
  
  // Calculate each member's payout
  const memberPayouts: MemberPayout[] = phase.teamMembers.map(member => {
    const lv1Points = member.tasksLv1 * TASK_POINTS.lv1;
    const lv2Points = member.tasksLv2 * TASK_POINTS.lv2;
    const lv3Points = member.tasksLv3 * TASK_POINTS.lv3;
    const memberPoints = lv1Points + lv2Points + lv3Points;
    const percentOfPool = totalPoints > 0 ? memberPoints / totalPoints : 0;
    const payout = teamPool * percentOfPool;
    
    return {
      memberId: member.id,
      memberName: member.name,
      role: member.role,
      lv1Tasks: member.tasksLv1,
      lv2Tasks: member.tasksLv2,
      lv3Tasks: member.tasksLv3,
      lv1Points,
      lv2Points,
      lv3Points,
      totalPoints: memberPoints,
      percentOfPool: percentOfPool * 100,
      payout
    };
  });
  
  return {
    phaseName: phase.name,
    phaseRevenue: phase.revenue,
    studioShare,
    teamPool,
    totalPoints,
    memberPayouts
  };
}

// Pre-built example templates
export const EXAMPLE_WEBSITE_PROJECT: ProjectPhase = {
  id: 'website-1',
  name: 'Website Project',
  revenue: 5000,
  teamMembers: [
    { id: '1', name: 'Sarah', role: 'Designer', tasksLv1: 2, tasksLv2: 2, tasksLv3: 1 },
    { id: '2', name: 'Mike', role: 'Developer', tasksLv1: 0, tasksLv2: 1, tasksLv3: 2 },
    { id: '3', name: 'Lisa', role: 'Writer', tasksLv1: 4, tasksLv2: 1, tasksLv3: 0 }
  ]
};

export const EXAMPLE_MARKETING_CAMPAIGN: ProjectPhase[] = [
  {
    id: 'marketing-1',
    name: 'Phase 1: Strategy',
    revenue: 8000,
    teamMembers: [
      { id: '1', name: 'Alex', role: 'Creative Director', tasksLv1: 0, tasksLv2: 1, tasksLv3: 2 },
      { id: '2', name: 'Jordan', role: 'Social Media Mgr', tasksLv1: 2, tasksLv2: 1, tasksLv3: 0 }
    ]
  },
  {
    id: 'marketing-2',
    name: 'Phase 2: Content Creation',
    revenue: 10000,
    teamMembers: [
      { id: '3', name: 'Casey', role: 'Graphic Designer', tasksLv1: 3, tasksLv2: 2, tasksLv3: 0 },
      { id: '4', name: 'Taylor', role: 'Copywriter', tasksLv1: 2, tasksLv2: 2, tasksLv3: 0 },
      { id: '5', name: 'Morgan', role: 'Video Editor', tasksLv1: 0, tasksLv2: 1, tasksLv3: 1 }
    ]
  },
  {
    id: 'marketing-3',
    name: 'Phase 3: Launch',
    revenue: 6000,
    teamMembers: [
      { id: '2', name: 'Jordan', role: 'Social Media Mgr', tasksLv1: 4, tasksLv2: 1, tasksLv3: 0 },
      { id: '1', name: 'Alex', role: 'Creative Director', tasksLv1: 0, tasksLv2: 0, tasksLv3: 1 }
    ]
  }
];
