import type { AsanaUser, AsanaSection, AsanaTask, AsanaStory } from './types.js';

export class AsanaClient {
  private baseUrl = 'https://app.asana.com/api/1.0';
  private token: string;
  private currentUser?: AsanaUser;

  constructor(token: string) {
    this.token = token;
  }

  private async fetch<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `Asana API error: ${response.status} ${response.statusText} - ${endpoint}\n${body}`
      );
    }

    const json = (await response.json()) as { data: T };
    return json.data;
  }

  async getCurrentUser(): Promise<AsanaUser> {
    if (!this.currentUser) {
      this.currentUser = await this.fetch<AsanaUser>('/users/me');
    }
    return this.currentUser;
  }

  async getProjectSections(projectGid: string): Promise<AsanaSection[]> {
    return this.fetch<AsanaSection[]>(`/projects/${projectGid}/sections`);
  }

  /**
   * Get all incomplete tasks assigned to the current user in a project.
   * Returns tasks with section info so the caller can categorize them.
   */
  async getMyIncompleteTasksInProject(
    workspaceGid: string,
    projectGid: string
  ): Promise<AsanaTask[]> {
    const user = await this.getCurrentUser();

    const params = new URLSearchParams({
      'assignee.any': user.gid,
      'projects.any': projectGid,
      completed: 'false',
      opt_fields: [
        'name',
        'notes',
        'assignee',
        'assignee.name',
        'memberships.section.name',
        'memberships.project.name',
        'dependencies',
      ].join(','),
    });

    return this.fetch<AsanaTask[]>(`/workspaces/${workspaceGid}/tasks/search?${params.toString()}`);
  }

  /**
   * Get tasks completed in the date range, assigned to the current user.
   */
  async getCompletedTasks(
    workspaceGid: string,
    dateRange: { from: string; to: string }
  ): Promise<AsanaTask[]> {
    const user = await this.getCurrentUser();

    const params = new URLSearchParams({
      'assignee.any': user.gid,
      completed: 'true',
      'completed_on.after': dateRange.from,
      'completed_on.before': dateRange.to,
      opt_fields: [
        'name',
        'notes',
        'completed_at',
        'memberships.section.name',
        'memberships.project.name',
      ].join(','),
    });

    return this.fetch<AsanaTask[]>(`/workspaces/${workspaceGid}/tasks/search?${params.toString()}`);
  }

  /**
   * Get section change stories for a task within a date range.
   * Returns transitions like "moved from X to Y".
   */
  async getTaskSectionChanges(
    taskGid: string,
    dateRange: { from: string; to: string }
  ): Promise<Array<{ from: string; to: string; at: string }>> {
    const stories = await this.fetch<AsanaStory[]>(
      `/tasks/${taskGid}/stories?opt_fields=created_at,resource_subtype,text`
    );

    const sectionPattern = /moved this task from (.+) to (.+)/i;

    return stories
      .filter((s) => {
        if (s.resource_subtype !== 'section_changed') return false;
        return s.created_at >= dateRange.from && s.created_at <= dateRange.to;
      })
      .map((s) => {
        const match = s.text.match(sectionPattern);
        return {
          from: match?.[1] ?? '',
          to: match?.[2] ?? '',
          at: s.created_at,
        };
      })
      .filter((t) => t.from && t.to);
  }

  /**
   * Get a single task by GID (for enrichment from MR references)
   */
  async getTask(taskGid: string): Promise<AsanaTask> {
    const params = new URLSearchParams({
      opt_fields: [
        'name',
        'notes',
        'assignee',
        'assignee.name',
        'memberships.section.name',
        'memberships.project.name',
        'completed',
      ].join(','),
    });

    return this.fetch<AsanaTask>(`/tasks/${taskGid}?${params.toString()}`);
  }
}
