export interface ProgressData {
  dateRange: {
    from: string;
    to: string;
  };

  completed: {
    asanaTasks: Array<{
      name: string;
      description: string;
      completedAt: string;
      subtasks?: string[];
      sectionTransitions?: Array<{ from: string; to: string; at: string }>;
    }>;
    mergedMRs: Array<{
      title: string;
      description: string;
      project: string;
      url: string;
      mergedAt: string;
      linkedAsanaTask?: {
        name: string;
        currentSection: string;
        currentAssignee: string;
      };
    }>;
  };

  inProgress: {
    asanaTasks: Array<{
      name: string;
      description: string;
      section: string;
    }>;
    openMRs: Array<{
      title: string;
      description: string;
      project: string;
      url: string;
    }>;
  };

  blocked: {
    asanaTasks: Array<{
      name: string;
      description: string;
      hasDependencies: boolean;
    }>;
  };
}
