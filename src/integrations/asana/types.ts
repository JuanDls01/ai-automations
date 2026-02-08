export interface AsanaUser {
  gid: string;
  name: string;
  email: string;
}

export interface AsanaSection {
  gid: string;
  name: string;
}

export interface AsanaTaskMembership {
  project: {
    gid: string;
    name: string;
  };
  section: {
    gid: string;
    name: string;
  };
}

export interface AsanaTask {
  gid: string;
  name: string;
  notes: string;
  completed: boolean;
  completed_at: string | null;
  assignee: {
    gid: string;
    name: string;
  } | null;
  memberships: AsanaTaskMembership[];
  permalink_url: string;
  dependencies?: Array<{ gid: string }>;
}

export interface AsanaStory {
  gid: string;
  created_at: string;
  resource_subtype: string;
  text: string;
}
