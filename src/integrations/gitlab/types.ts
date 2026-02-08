export interface GitLabMergeRequest {
  id: number;
  iid: number;
  title: string;
  description: string;
  state: string;
  created_at: string;
  merged_at: string | null;
  author: {
    name: string;
    username: string;
  };
  web_url: string;
  project_id: number;
}

export interface GitLabMergeRequestEnriched extends GitLabMergeRequest {
  project_name: string;
}
