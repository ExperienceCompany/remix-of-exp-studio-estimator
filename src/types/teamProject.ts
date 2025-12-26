export const TASK_POINTS = {
  lv1: 2.5,   // Easy / Quick
  lv2: 5,     // Fair / Medium  
  lv3: 10     // Lengthy / Expert
} as const;

export type TaskLevel = 'lv1' | 'lv2' | 'lv3';
export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface ProjectTask {
  id: string;
  title: string;
  level: TaskLevel;
  status: TaskStatus;
  assigneeId: string | null;
}

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
  tasks?: ProjectTask[];
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

// Pre-built example templates with tasks
export const EXAMPLE_WEBSITE_PROJECT: ProjectPhase = {
  id: 'website-1',
  name: 'Website Project',
  revenue: 5000,
  teamMembers: [
    { id: '1', name: 'Sarah', role: 'Designer', tasksLv1: 2, tasksLv2: 2, tasksLv3: 1 },
    { id: '2', name: 'Mike', role: 'Developer', tasksLv1: 0, tasksLv2: 1, tasksLv3: 2 },
    { id: '3', name: 'Lisa', role: 'Writer', tasksLv1: 4, tasksLv2: 1, tasksLv3: 0 }
  ],
  tasks: [
    // Sarah (Designer): 2 Lv1, 2 Lv2, 1 Lv3
    { id: 't1', title: 'Create moodboard', level: 'lv1', status: 'done', assigneeId: '1' },
    { id: 't2', title: 'Style guide document', level: 'lv1', status: 'done', assigneeId: '1' },
    { id: 't3', title: 'Wireframe layouts', level: 'lv2', status: 'in_progress', assigneeId: '1' },
    { id: 't4', title: 'Homepage mockup', level: 'lv2', status: 'todo', assigneeId: '1' },
    { id: 't5', title: 'Full design system', level: 'lv3', status: 'todo', assigneeId: '1' },
    // Mike (Developer): 0 Lv1, 1 Lv2, 2 Lv3
    { id: 't6', title: 'Set up dev environment', level: 'lv2', status: 'done', assigneeId: '2' },
    { id: 't7', title: 'Build frontend components', level: 'lv3', status: 'in_progress', assigneeId: '2' },
    { id: 't8', title: 'Deploy & optimize', level: 'lv3', status: 'todo', assigneeId: '2' },
    // Lisa (Writer): 4 Lv1, 1 Lv2, 0 Lv3
    { id: 't9', title: 'Homepage copy', level: 'lv1', status: 'done', assigneeId: '3' },
    { id: 't10', title: 'About page copy', level: 'lv1', status: 'done', assigneeId: '3' },
    { id: 't11', title: 'SEO meta tags', level: 'lv1', status: 'in_progress', assigneeId: '3' },
    { id: 't12', title: 'Blog post templates', level: 'lv1', status: 'todo', assigneeId: '3' },
    { id: 't13', title: 'Full content audit', level: 'lv2', status: 'todo', assigneeId: '3' }
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
    ],
    tasks: [
      // Alex (Creative Director): 0 Lv1, 1 Lv2, 2 Lv3
      { id: 'm1t1', title: 'Define brand positioning', level: 'lv3', status: 'done', assigneeId: '1' },
      { id: 'm1t2', title: 'Create campaign brief', level: 'lv3', status: 'in_progress', assigneeId: '1' },
      { id: 'm1t3', title: 'Competitive analysis', level: 'lv2', status: 'todo', assigneeId: '1' },
      // Jordan (Social Media Mgr): 2 Lv1, 1 Lv2, 0 Lv3
      { id: 'm1t4', title: 'Audit social channels', level: 'lv2', status: 'done', assigneeId: '2' },
      { id: 'm1t5', title: 'Content calendar draft', level: 'lv1', status: 'in_progress', assigneeId: '2' },
      { id: 'm1t6', title: 'Set up analytics', level: 'lv1', status: 'todo', assigneeId: '2' }
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
    ],
    tasks: [
      // Casey (Graphic Designer): 3 Lv1, 2 Lv2, 0 Lv3
      { id: 'm2t1', title: 'Social media templates', level: 'lv1', status: 'done', assigneeId: '3' },
      { id: 'm2t2', title: 'Email header graphics', level: 'lv1', status: 'done', assigneeId: '3' },
      { id: 'm2t3', title: 'Story highlight covers', level: 'lv1', status: 'in_progress', assigneeId: '3' },
      { id: 'm2t4', title: 'Ad banner set', level: 'lv2', status: 'todo', assigneeId: '3' },
      { id: 'm2t5', title: 'Landing page design', level: 'lv2', status: 'todo', assigneeId: '3' },
      // Taylor (Copywriter): 2 Lv1, 2 Lv2, 0 Lv3
      { id: 'm2t6', title: 'Ad headlines', level: 'lv1', status: 'done', assigneeId: '4' },
      { id: 'm2t7', title: 'Social post captions', level: 'lv1', status: 'in_progress', assigneeId: '4' },
      { id: 'm2t8', title: 'Email sequence', level: 'lv2', status: 'todo', assigneeId: '4' },
      { id: 'm2t9', title: 'Landing page copy', level: 'lv2', status: 'todo', assigneeId: '4' },
      // Morgan (Video Editor): 0 Lv1, 1 Lv2, 1 Lv3
      { id: 'm2t10', title: 'Edit promo teaser', level: 'lv2', status: 'in_progress', assigneeId: '5' },
      { id: 'm2t11', title: 'Full campaign video', level: 'lv3', status: 'todo', assigneeId: '5' }
    ]
  },
  {
    id: 'marketing-3',
    name: 'Phase 3: Launch',
    revenue: 6000,
    teamMembers: [
      { id: '2', name: 'Jordan', role: 'Social Media Mgr', tasksLv1: 4, tasksLv2: 1, tasksLv3: 0 },
      { id: '1', name: 'Alex', role: 'Creative Director', tasksLv1: 0, tasksLv2: 0, tasksLv3: 1 }
    ],
    tasks: [
      // Jordan (Social Media Mgr): 4 Lv1, 1 Lv2, 0 Lv3
      { id: 'm3t1', title: 'Schedule all posts', level: 'lv1', status: 'done', assigneeId: '2' },
      { id: 'm3t2', title: 'Engage with comments', level: 'lv1', status: 'in_progress', assigneeId: '2' },
      { id: 'm3t3', title: 'Story updates', level: 'lv1', status: 'todo', assigneeId: '2' },
      { id: 'm3t4', title: 'Influencer outreach', level: 'lv1', status: 'todo', assigneeId: '2' },
      { id: 'm3t5', title: 'Weekly analytics report', level: 'lv2', status: 'todo', assigneeId: '2' },
      // Alex (Creative Director): 0 Lv1, 0 Lv2, 1 Lv3
      { id: 'm3t6', title: 'Campaign performance review', level: 'lv3', status: 'todo', assigneeId: '1' }
    ]
  }
];
