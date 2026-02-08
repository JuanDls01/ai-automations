import { GitLabClient } from '../../integrations/gitlab/client.js';
import { AsanaClient } from '../../integrations/asana/client.js';
import { generateProgressSummary } from '../../ai/provider.js';
import { withSpinner } from '../../utils/spinner.js';
import { summary as formatSummary } from '../../utils/ui.js';
import type { ProgressData } from './types.js';
import type { AsanaTask } from '../../integrations/asana/types.js';

export interface HandlerConfig {
  dateRange: { from: string; to: string };
  gitlab: {
    projectNames: string[];
  };
  asana: {
    workspaceGid: string;
    projectGid: string;
    sectionMapping: {
      inProgress: string[];
      blocked: string[];
    };
  };
}

const DEFAULT_SECTION_MAPPING = {
  inProgress: ['EN DESARROLLO', 'CODE REVIEW', 'INTEGRACION'],
  blocked: ['EN PAUSA'],
};

export async function handleProgressSummary(
  gitlabClient: GitLabClient,
  asanaClient: AsanaClient,
  config: HandlerConfig
): Promise<string> {
  const sectionMapping = {
    ...DEFAULT_SECTION_MAPPING,
    ...config.asana.sectionMapping,
  };

  // Step 1: Fetch data in parallel
  const [mergedMRs, openMRs, completedTasks, incompleteTasks] = await withSpinner(
    'Fetching data from GitLab and Asana...',
    () =>
      Promise.all([
        gitlabClient.getMergedMRs(config.gitlab.projectNames, config.dateRange),
        gitlabClient.getOpenMRs(config.gitlab.projectNames, config.dateRange),
        asanaClient.getCompletedTasks(config.asana.workspaceGid, config.dateRange),
        asanaClient.getMyIncompleteTasksInProject(
          config.asana.workspaceGid,
          config.asana.projectGid
        ),
      ])
  );

  // Display summary of fetched data
  console.log();
  console.log(
    formatSummary([
      { label: 'Merged MRs', value: mergedMRs.length },
      { label: 'Open MRs', value: openMRs.length },
      { label: 'Completed tasks', value: completedTasks.length },
      { label: 'Incomplete tasks', value: incompleteTasks.length },
    ])
  );
  console.log();

  // Step 2: Categorize incomplete tasks by section
  const inProgressTasks: AsanaTask[] = [];
  const blockedTasks: AsanaTask[] = [];

  for (const task of incompleteTasks) {
    const sectionName = getTaskSection(task, config.asana.projectGid);
    if (!sectionName) continue;

    const upperSection = sectionName.toUpperCase();
    if (sectionMapping.inProgress.some((s) => upperSection.includes(s.toUpperCase()))) {
      inProgressTasks.push(task);
    } else if (sectionMapping.blocked.some((s) => upperSection.includes(s.toUpperCase()))) {
      blockedTasks.push(task);
    }
  }

  // Step 3: Fetch section transitions for completed tasks
  const completedTasksWithTransitions = await withSpinner('Fetching section transitions...', () =>
    Promise.all(
      completedTasks.map(async (task) => {
        try {
          const transitions = await asanaClient.getTaskSectionChanges(task.gid, config.dateRange);
          return { task, transitions };
        } catch {
          return { task, transitions: [] };
        }
      })
    )
  );

  // Step 4: Enrich merged MRs with Asana task data
  const enrichedMergedMRs = await withSpinner('Enriching MRs with Asana data...', () =>
    Promise.all(
      mergedMRs.map(async (mr) => {
        const asanaTaskId = GitLabClient.extractAsanaTaskId(mr.description);
        if (!asanaTaskId) return { mr, linkedTask: null };

        try {
          const task = await asanaClient.getTask(asanaTaskId);
          return { mr, linkedTask: task };
        } catch {
          return { mr, linkedTask: null };
        }
      })
    )
  );

  // Step 4: Build ProgressData
  const progressData: ProgressData = {
    dateRange: config.dateRange,

    completed: {
      asanaTasks: completedTasksWithTransitions.map(({ task: t, transitions }) => ({
        name: t.name,
        description: t.notes || '',
        completedAt: t.completed_at || '',
        ...(transitions.length > 0 ? { sectionTransitions: transitions } : {}),
      })),
      mergedMRs: enrichedMergedMRs.map(({ mr, linkedTask }) => ({
        title: mr.title,
        description: mr.description || '',
        project: mr.project_name,
        url: mr.web_url,
        mergedAt: mr.merged_at || '',
        ...(linkedTask
          ? {
              linkedAsanaTask: {
                name: linkedTask.name,
                currentSection: getTaskSection(linkedTask, config.asana.projectGid) || '',
                currentAssignee: linkedTask.assignee?.name || '',
              },
            }
          : {}),
      })),
    },

    inProgress: {
      asanaTasks: inProgressTasks.map((t) => ({
        name: t.name,
        description: t.notes || '',
        section: getTaskSection(t, config.asana.projectGid) || '',
      })),
      openMRs: openMRs.map((mr) => ({
        title: mr.title,
        description: mr.description || '',
        project: mr.project_name,
        url: mr.web_url,
      })),
    },

    blocked: {
      asanaTasks: blockedTasks.map((t) => ({
        name: t.name,
        description: t.notes || '',
        hasDependencies: (t.dependencies?.length ?? 0) > 0,
      })),
    },
  };

  // Step 5: Generate summary with AI
  const summary = await withSpinner('Generating summary with AI...', () =>
    generateProgressSummary(progressData)
  );

  return summary;
}

function getTaskSection(task: AsanaTask, projectGid: string): string | null {
  const membership = task.memberships?.find((m) => m.project?.gid === projectGid);
  if (membership) return membership.section?.name ?? null;

  // Fallback: use first membership's section
  const first = task.memberships?.[0];
  return first?.section?.name ?? null;
}
