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
  dueDate?: string | null; // ISO date string (YYYY-MM-DD)
  dependsOn?: string[]; // Array of task IDs that must be completed first
}

// Check if a task's dependencies are all completed
export function areDependenciesMet(task: ProjectTask, allTasks: ProjectTask[]): boolean {
  if (!task.dependsOn || task.dependsOn.length === 0) return true;
  return task.dependsOn.every(depId => {
    const depTask = allTasks.find(t => t.id === depId);
    return depTask?.status === 'done';
  });
}

// Get blocking tasks (dependencies that are not done)
export function getBlockingTasks(task: ProjectTask, allTasks: ProjectTask[]): ProjectTask[] {
  if (!task.dependsOn || task.dependsOn.length === 0) return [];
  return task.dependsOn
    .map(depId => allTasks.find(t => t.id === depId))
    .filter((t): t is ProjectTask => t !== undefined && t.status !== 'done');
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

// Revenue by status breakdown
export interface MemberStatusBreakdown {
  memberId: string | null;
  memberName: string;
  role?: string;
  doneValue: number;
  inProgressValue: number;
  todoValue: number;
  totalValue: number;
  taskCounts: {
    done: number;
    inProgress: number;
    todo: number;
  };
}

export interface RevenueByStatusResult {
  members: MemberStatusBreakdown[];
  unclaimed: MemberStatusBreakdown;
  totals: MemberStatusBreakdown;
}

export function calculateRevenueByStatus(
  tasks: ProjectTask[],
  teamMembers: TeamMember[],
  teamPool: number,
  totalPoints: number
): RevenueByStatusResult {
  const getTaskValue = (level: TaskLevel): number => {
    const taskPoints = TASK_POINTS[level];
    return totalPoints > 0 ? (taskPoints / totalPoints) * teamPool : 0;
  };

  // Initialize member breakdowns
  const memberMap = new Map<string, MemberStatusBreakdown>();
  teamMembers.forEach(m => {
    memberMap.set(m.id, {
      memberId: m.id,
      memberName: m.name,
      role: m.role,
      doneValue: 0,
      inProgressValue: 0,
      todoValue: 0,
      totalValue: 0,
      taskCounts: { done: 0, inProgress: 0, todo: 0 }
    });
  });

  // Unclaimed tasks
  const unclaimed: MemberStatusBreakdown = {
    memberId: null,
    memberName: 'Unclaimed',
    doneValue: 0,
    inProgressValue: 0,
    todoValue: 0,
    totalValue: 0,
    taskCounts: { done: 0, inProgress: 0, todo: 0 }
  };

  // Process tasks
  tasks.forEach(task => {
    const value = getTaskValue(task.level);
    const target = task.assigneeId && memberMap.has(task.assigneeId) 
      ? memberMap.get(task.assigneeId)! 
      : unclaimed;

    if (task.status === 'done') {
      target.doneValue += value;
      target.taskCounts.done++;
    } else if (task.status === 'in_progress') {
      target.inProgressValue += value;
      target.taskCounts.inProgress++;
    } else {
      target.todoValue += value;
      target.taskCounts.todo++;
    }
    target.totalValue += value;
  });

  const members = Array.from(memberMap.values()).filter(m => m.totalValue > 0);

  // Calculate totals
  const totals: MemberStatusBreakdown = {
    memberId: null,
    memberName: 'TOTAL',
    doneValue: members.reduce((s, m) => s + m.doneValue, 0) + unclaimed.doneValue,
    inProgressValue: members.reduce((s, m) => s + m.inProgressValue, 0) + unclaimed.inProgressValue,
    todoValue: members.reduce((s, m) => s + m.todoValue, 0) + unclaimed.todoValue,
    totalValue: members.reduce((s, m) => s + m.totalValue, 0) + unclaimed.totalValue,
    taskCounts: {
      done: members.reduce((s, m) => s + m.taskCounts.done, 0) + unclaimed.taskCounts.done,
      inProgress: members.reduce((s, m) => s + m.taskCounts.inProgress, 0) + unclaimed.taskCounts.inProgress,
      todo: members.reduce((s, m) => s + m.taskCounts.todo, 0) + unclaimed.taskCounts.todo
    }
  };

  return { members, unclaimed, totals };
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

// Task title templates by role and level for generating realistic tasks
const TASK_TITLE_TEMPLATES: Record<string, Record<TaskLevel, string[]>> = {
  designer: {
    lv1: ['Create moodboard', 'Color palette review', 'Icon set update', 'Asset export', 'Image optimization', 'Font selection'],
    lv2: ['Wireframe layouts', 'Homepage mockup', 'Component library', 'UI kit update', 'Style guide', 'Prototype review'],
    lv3: ['Full design system', 'Brand identity', 'Design audit', 'UX overhaul', 'Complete redesign', 'Design strategy']
  },
  developer: {
    lv1: ['Bug fix', 'Code review', 'Documentation update', 'Unit test', 'Dependency update', 'Config update'],
    lv2: ['API integration', 'Component refactor', 'Feature module', 'Performance fix', 'Testing suite', 'Database migration'],
    lv3: ['Architecture design', 'Full-stack feature', 'System migration', 'Security audit', 'Platform overhaul', 'Tech stack upgrade']
  },
  writer: {
    lv1: ['Homepage copy', 'Meta descriptions', 'Social captions', 'Email subject lines', 'Alt text', 'Tagline options'],
    lv2: ['Blog post', 'Landing page copy', 'Email sequence', 'Case study', 'Product descriptions', 'FAQ section'],
    lv3: ['Content strategy', 'Full website copy', 'Brand voice guide', 'Content audit', 'Messaging framework', 'Editorial calendar']
  },
  'creative director': {
    lv1: ['Creative brief review', 'Asset approval', 'Feedback notes', 'Reference gathering'],
    lv2: ['Campaign concept', 'Competitive analysis', 'Presentation deck', 'Creative review'],
    lv3: ['Brand positioning', 'Campaign strategy', 'Creative direction', 'Vision document']
  },
  'social media': {
    lv1: ['Post scheduling', 'Comment responses', 'Story updates', 'Analytics check', 'Hashtag research'],
    lv2: ['Content calendar', 'Channel audit', 'Engagement report', 'Influencer outreach'],
    lv3: ['Social strategy', 'Platform launch', 'Crisis management', 'Community building']
  },
  'graphic designer': {
    lv1: ['Social templates', 'Email graphics', 'Icon updates', 'Banner resize', 'Image cropping'],
    lv2: ['Ad banner set', 'Infographic', 'Presentation design', 'Marketing collateral'],
    lv3: ['Visual identity', 'Campaign visuals', 'Illustration set', 'Motion graphics']
  },
  copywriter: {
    lv1: ['Ad headlines', 'CTA buttons', 'Social captions', 'Email subjects', 'Product taglines'],
    lv2: ['Email sequence', 'Sales page', 'Ad campaign copy', 'Video script'],
    lv3: ['Brand messaging', 'Full campaign copy', 'Copywriting guide', 'Conversion optimization']
  },
  'video editor': {
    lv1: ['Trim clips', 'Add captions', 'Color correction', 'Audio sync', 'Export versions'],
    lv2: ['Promo teaser', 'Social video', 'Tutorial edit', 'Interview edit'],
    lv3: ['Full campaign video', 'Documentary', 'Brand film', 'Video series']
  },
  default: {
    lv1: ['Quick task', 'Review item', 'Update doc', 'Small fix', 'Minor update', 'Check item'],
    lv2: ['Standard task', 'Medium feature', 'Analysis', 'Implementation', 'Report', 'Module work'],
    lv3: ['Major task', 'Complex feature', 'Strategic work', 'Full project', 'Complete overhaul', 'System design']
  }
};

function getRoleTemplates(role: string | undefined): Record<TaskLevel, string[]> {
  if (!role) return TASK_TITLE_TEMPLATES.default;
  const normalizedRole = role.toLowerCase().trim();
  return TASK_TITLE_TEMPLATES[normalizedRole] || TASK_TITLE_TEMPLATES.default;
}

export function generateTaskTitle(role: string | undefined, level: TaskLevel, existingTitles: string[]): string {
  const templates = getRoleTemplates(role);
  const options = templates[level];
  
  // Find a title that's not already used
  for (const title of options) {
    if (!existingTitles.includes(title)) {
      return title;
    }
  }
  
  // If all are used, add a number suffix
  const baseTitle = options[0];
  let counter = 2;
  while (existingTitles.includes(`${baseTitle} ${counter}`)) {
    counter++;
  }
  return `${baseTitle} ${counter}`;
}

export function syncTasksWithMemberCounts(
  member: TeamMember,
  existingTasks: ProjectTask[]
): ProjectTask[] {
  const tasks = [...existingTasks];
  const levels: TaskLevel[] = ['lv1', 'lv2', 'lv3'];
  
  levels.forEach(level => {
    const targetCount = level === 'lv1' ? member.tasksLv1 : level === 'lv2' ? member.tasksLv2 : member.tasksLv3;
    const memberTasksAtLevel = tasks.filter(t => t.assigneeId === member.id && t.level === level);
    const currentCount = memberTasksAtLevel.length;
    
    if (targetCount > currentCount) {
      // Need to add tasks
      const existingTitles = tasks.map(t => t.title);
      for (let i = 0; i < targetCount - currentCount; i++) {
        const title = generateTaskTitle(member.role, level, existingTitles);
        existingTitles.push(title);
        tasks.push({
          id: crypto.randomUUID(),
          title,
          level,
          status: 'todo',
          assigneeId: member.id
        });
      }
    } else if (targetCount < currentCount) {
      // Need to remove tasks - prioritize removing todo, then in_progress, never done
      const tasksToRemove = currentCount - targetCount;
      let removed = 0;
      
      // First try to remove 'todo' tasks
      for (let i = tasks.length - 1; i >= 0 && removed < tasksToRemove; i--) {
        const task = tasks[i];
        if (task.assigneeId === member.id && task.level === level && task.status === 'todo') {
          tasks.splice(i, 1);
          removed++;
        }
      }
      
      // If still need to remove, try 'in_progress' tasks
      for (let i = tasks.length - 1; i >= 0 && removed < tasksToRemove; i--) {
        const task = tasks[i];
        if (task.assigneeId === member.id && task.level === level && task.status === 'in_progress') {
          tasks.splice(i, 1);
          removed++;
        }
      }
      
      // Don't auto-remove 'done' tasks - they represent completed work
    }
  });
  
  return tasks;
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

// Role complexity mapping for flexible task generation
const ROLE_COMPLEXITY: Record<string, { lv1: number; lv2: number; lv3: number }> = {
  'creative director': { lv1: 0, lv2: 1, lv3: 3 },
  'director': { lv1: 0, lv2: 1, lv3: 3 },
  'lead': { lv1: 0, lv2: 2, lv3: 2 },
  'senior': { lv1: 1, lv2: 2, lv3: 2 },
  'designer': { lv1: 2, lv2: 2, lv3: 1 },
  'developer': { lv1: 1, lv2: 2, lv3: 2 },
  'writer': { lv1: 3, lv2: 2, lv3: 0 },
  'copywriter': { lv1: 2, lv2: 2, lv3: 1 },
  'graphic designer': { lv1: 3, lv2: 2, lv3: 0 },
  'video editor': { lv1: 1, lv2: 2, lv3: 1 },
  'photographer': { lv1: 2, lv2: 2, lv3: 1 },
  'social media': { lv1: 3, lv2: 2, lv3: 0 },
  'producer': { lv1: 1, lv2: 2, lv3: 2 },
  'assistant': { lv1: 4, lv2: 1, lv3: 0 },
  'junior': { lv1: 3, lv2: 2, lv3: 0 },
  'default': { lv1: 2, lv2: 2, lv3: 1 }
};

function getRoleComplexity(role: string): { lv1: number; lv2: number; lv3: number } {
  const normalizedRole = role.toLowerCase().trim();
  
  // Check for exact match first
  if (ROLE_COMPLEXITY[normalizedRole]) {
    return ROLE_COMPLEXITY[normalizedRole];
  }
  
  // Check for partial matches
  for (const [key, complexity] of Object.entries(ROLE_COMPLEXITY)) {
    if (normalizedRole.includes(key) || key.includes(normalizedRole)) {
      return complexity;
    }
  }
  
  return ROLE_COMPLEXITY.default;
}

export interface GeneratedTaskResult {
  members: TeamMember[];
  tasks: ProjectTask[];
}

/**
 * Generate tasks with flexible distribution based on role complexity
 * - Creative directors/leads get more Lv3 tasks
 * - Standard roles get balanced mix
 * - Junior/assistant roles get more Lv1/Lv2 tasks
 */
export function generateFlexibleTasks(
  memberInputs: { name: string; role: string }[],
  projectType: string,
  budget: number
): GeneratedTaskResult {
  const members: TeamMember[] = [];
  const tasks: ProjectTask[] = [];
  const allTitles: string[] = [];
  
  memberInputs.forEach((input, index) => {
    const complexity = getRoleComplexity(input.role);
    const memberId = crypto.randomUUID();
    
    const member: TeamMember = {
      id: memberId,
      name: input.name,
      role: input.role,
      tasksLv1: complexity.lv1,
      tasksLv2: complexity.lv2,
      tasksLv3: complexity.lv3
    };
    members.push(member);
    
    // Generate tasks for each level
    const levels: TaskLevel[] = ['lv1', 'lv2', 'lv3'];
    levels.forEach(level => {
      const count = level === 'lv1' ? complexity.lv1 : level === 'lv2' ? complexity.lv2 : complexity.lv3;
      
      for (let i = 0; i < count; i++) {
        const title = generateTaskTitle(input.role, level, allTitles);
        allTitles.push(title);
        
        tasks.push({
          id: crypto.randomUUID(),
          title,
          level,
          status: 'todo',
          assigneeId: memberId
        });
      }
    });
  });
  
  return { members, tasks };
}

/**
 * Generate tasks with balanced (equal pay) distribution
 * Each member receives approximately the same total points/payout
 */
export function generateBalancedTasks(
  memberInputs: { name: string; role: string }[],
  budget: number
): GeneratedTaskResult {
  const teamPool = budget * 0.5;
  const targetPointsPerPerson = teamPool / memberInputs.length;
  
  // Determine task mix to hit target points per person
  // Lv3=10pts, Lv2=5pts, Lv1=2.5pts
  // Default: 2 Lv3 (20) + 1 Lv2 (5) = 25 pts per person for $250 each
  // Adjust based on budget
  
  const members: TeamMember[] = [];
  const tasks: ProjectTask[] = [];
  const allTitles: string[] = [];
  
  memberInputs.forEach((input) => {
    const memberId = crypto.randomUUID();
    
    // Calculate task distribution to hit target points
    // Try to get close to target with a reasonable number of tasks
    let lv3Count = Math.floor(targetPointsPerPerson / 15); // Aim for ~15 pts per Lv3 slot
    let remaining = targetPointsPerPerson - (lv3Count * TASK_POINTS.lv3);
    
    let lv2Count = Math.floor(remaining / TASK_POINTS.lv2);
    remaining = remaining - (lv2Count * TASK_POINTS.lv2);
    
    let lv1Count = Math.round(remaining / TASK_POINTS.lv1);
    
    // Ensure at least some tasks
    if (lv3Count + lv2Count + lv1Count === 0) {
      lv2Count = 1;
    }
    
    const member: TeamMember = {
      id: memberId,
      name: input.name,
      role: input.role,
      tasksLv1: lv1Count,
      tasksLv2: lv2Count,
      tasksLv3: lv3Count
    };
    members.push(member);
    
    // Generate tasks
    const levels: TaskLevel[] = ['lv1', 'lv2', 'lv3'];
    levels.forEach(level => {
      const count = level === 'lv1' ? lv1Count : level === 'lv2' ? lv2Count : lv3Count;
      
      for (let i = 0; i < count; i++) {
        const title = generateTaskTitle(input.role, level, allTitles);
        allTitles.push(title);
        
        tasks.push({
          id: crypto.randomUUID(),
          title,
          level,
          status: 'todo',
          assigneeId: memberId
        });
      }
    });
  });
  
  return { members, tasks };
}
