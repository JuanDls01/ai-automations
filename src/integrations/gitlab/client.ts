import type { GitLabMergeRequest, GitLabMergeRequestEnriched } from './types.js';

interface DateRange {
  from: string;
  to: string;
}

interface GitLabProject {
  id: number;
  name: string;
  path_with_namespace: string;
}

export class GitLabClient {
  private baseUrl: string;
  private token: string;
  private currentUser?: { id: number; username: string };
  private resolvedProjects?: GitLabProject[];

  constructor(token: string, baseUrl: string = 'https://gitlab.com/api/v4') {
    this.token = token;
    this.baseUrl = baseUrl;
  }

  private async fetch<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      headers: { 'PRIVATE-TOKEN': this.token },
    });

    if (!response.ok) {
      throw new Error(`GitLab API error: ${response.status} ${response.statusText} - ${url}`);
    }

    return response.json() as Promise<T>;
  }

  async getCurrentUser(): Promise<{ id: number; username: string }> {
    if (!this.currentUser) {
      this.currentUser = await this.fetch<{ id: number; username: string }>('/user');
    }
    return this.currentUser;
  }

  /**
   * Resolve project names to GitLab projects with IDs.
   * Searches the user's projects and matches by name.
   */
  async resolveProjectsByName(projectNames: string[]): Promise<GitLabProject[]> {
    if (this.resolvedProjects) return this.resolvedProjects;

    const projects: GitLabProject[] = [];

    for (const name of projectNames) {
      try {
        const params = new URLSearchParams({
          search: name,
          membership: 'true',
          per_page: '10',
        });

        const results = await this.fetch<GitLabProject[]>(`/projects?${params.toString()}`);
        const match = results.find(
          (p) => p.name === name || p.path_with_namespace.endsWith(`/${name}`)
        );

        if (match) {
          projects.push(match);
        } else {
          console.warn(`GitLab project not found: "${name}"`);
        }
      } catch (error) {
        console.warn(`Failed to resolve project "${name}":`, error);
      }
    }

    this.resolvedProjects = projects;
    return projects;
  }

  /**
   * Get MRs merged in the date range for the given project names
   */
  async getMergedMRs(
    projectNames: string[],
    dateRange: DateRange
  ): Promise<GitLabMergeRequestEnriched[]> {
    const user = await this.getCurrentUser();
    const projects = await this.resolveProjectsByName(projectNames);
    const results: GitLabMergeRequestEnriched[] = [];

    for (const project of projects) {
      try {
        const params = new URLSearchParams({
          author_username: user.username,
          state: 'merged',
          updated_after: dateRange.from,
          updated_before: dateRange.to,
          per_page: '100',
        });

        const mrs = await this.fetch<GitLabMergeRequest[]>(
          `/projects/${project.id}/merge_requests?${params.toString()}`
        );

        const filtered = mrs.filter((mr) => {
          if (!mr.merged_at) return false;
          return mr.merged_at >= dateRange.from && mr.merged_at <= dateRange.to;
        });

        for (const mr of filtered) {
          results.push({ ...mr, project_name: project.name });
        }
      } catch (error) {
        console.warn(`Failed to fetch merged MRs from "${project.name}":`, error);
      }
    }

    return results;
  }

  /**
   * Get currently open MRs for the given project names.
   * Only includes MRs updated within the date range to avoid stale MRs.
   */
  async getOpenMRs(
    projectNames: string[],
    dateRange: DateRange
  ): Promise<GitLabMergeRequestEnriched[]> {
    const user = await this.getCurrentUser();
    const projects = await this.resolveProjectsByName(projectNames);
    const results: GitLabMergeRequestEnriched[] = [];

    for (const project of projects) {
      try {
        const params = new URLSearchParams({
          author_username: user.username,
          state: 'opened',
          updated_after: dateRange.from,
          per_page: '100',
        });

        const mrs = await this.fetch<GitLabMergeRequest[]>(
          `/projects/${project.id}/merge_requests?${params.toString()}`
        );

        for (const mr of mrs) {
          results.push({ ...mr, project_name: project.name });
        }
      } catch (error) {
        console.warn(`Failed to fetch open MRs from "${project.name}":`, error);
      }
    }

    return results;
  }

  /**
   * Extract Asana task GID from an MR description.
   * Matches URLs like https://app.asana.com/0/PROJECT_ID/TASK_ID
   */
  static extractAsanaTaskId(description: string): string | null {
    if (!description) return null;

    const urlPattern = /https:\/\/app\.asana\.com\/\d+\/\d+\/(\d+)/;
    const match = description.match(urlPattern);
    return match?.[1] ?? null;
  }
}
