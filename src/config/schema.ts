import { z } from 'zod';

const DEFAULT_SECTION_MAPPING = {
  inProgress: ['EN DESARROLLO', 'CODE REVIEW', 'INTEGRACION'],
  blocked: ['EN PAUSA'],
};

export const configFileSchema = z.object({
  gitlab: z
    .object({
      projectNames: z.array(z.string()).default([]),
    })
    .default({ projectNames: [] }),
  asana: z
    .object({
      projectId: z.string().optional(),
      sectionMapping: z
        .object({
          inProgress: z.array(z.string()).default(DEFAULT_SECTION_MAPPING.inProgress),
          blocked: z.array(z.string()).default(DEFAULT_SECTION_MAPPING.blocked),
        })
        .default(DEFAULT_SECTION_MAPPING),
    })
    .default({ sectionMapping: DEFAULT_SECTION_MAPPING }),
});

export type ConfigFile = z.infer<typeof configFileSchema>;

export const envSchema = z.object({
  GITLAB_TOKEN: z.string().optional(),
  GITLAB_URL: z.string().default('https://gitlab.com/api/v4'),
  ASANA_TOKEN: z.string().optional(),
  ASANA_WORKSPACE_GID: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export interface ResolvedEnv {
  GITLAB_TOKEN: string;
  GITLAB_URL: string;
  ASANA_TOKEN: string;
  ASANA_WORKSPACE_GID: string;
  GOOGLE_GENERATIVE_AI_API_KEY: string;
}

export interface AppConfig {
  env: EnvConfig;
  gitlab: {
    projectNames: string[];
  };
  asana: {
    projectId: string;
    workspaceGid: string;
    sectionMapping: {
      inProgress: string[];
      blocked: string[];
    };
  };
}
