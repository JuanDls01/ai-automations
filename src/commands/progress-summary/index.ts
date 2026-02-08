import { Command } from 'commander';
import { handleProgressSummary } from './handler.js';
import {
  promptDateRange,
  promptGitLabProjects,
  promptAsanaProjectId,
  promptSaveConfig,
  promptToken,
  promptEnvVar,
} from './prompts.js';
import { loadConfig, saveConfigFile, saveEnvFile } from '../../config/manager.js';
import type { ResolvedEnv } from '../../config/schema.js';
import { GitLabClient } from '../../integrations/gitlab/client.js';
import { AsanaClient } from '../../integrations/asana/client.js';
import { logger } from '../../utils/logger.js';
import { box, separator } from '../../utils/ui.js';
import chalk from 'chalk';

const REQUIRED_ENV_VARS: Array<{ key: keyof ResolvedEnv; label: string; secret: boolean }> = [
  { key: 'GITLAB_TOKEN', label: 'GitLab Token', secret: true },
  { key: 'GITLAB_URL', label: 'GitLab API URL', secret: false },
  { key: 'ASANA_TOKEN', label: 'Asana Token', secret: true },
  { key: 'ASANA_WORKSPACE_GID', label: 'Asana Workspace GID', secret: false },
  { key: 'GOOGLE_GENERATIVE_AI_API_KEY', label: 'Google AI API Key', secret: true },
];

async function resolveEnv(
  env: Record<string, string | undefined>
): Promise<{ resolved: ResolvedEnv; prompted: Record<string, string> }> {
  const prompted: Record<string, string> = {};
  const resolved: Record<string, string> = {};

  for (const { key, label, secret } of REQUIRED_ENV_VARS) {
    const existing = env[key];
    if (existing) {
      resolved[key] = existing;
    } else {
      const value = secret ? await promptToken(label) : await promptEnvVar(label);
      resolved[key] = value;
      prompted[key] = value;
    }
  }

  return { resolved: resolved as unknown as ResolvedEnv, prompted };
}

export function createProgressSummaryCommand(): Command {
  return new Command('progress-summary')
    .description('Generate a weekly progress summary from GitLab and Asana')
    .option('--from <date>', 'Start date (YYYY-MM-DD)')
    .option('--to <date>', 'End date (YYYY-MM-DD)')
    .option('--gitlab-projects <names>', 'GitLab project names (comma-separated)')
    .option('--asana-project <id>', 'Asana project ID')
    .action(
      async (options: {
        from?: string;
        to?: string;
        gitlabProjects?: string;
        asanaProject?: string;
      }) => {
        try {
          const config = loadConfig();

          // Resolve env vars: existing → interactive prompt
          const { resolved: env, prompted: promptedEnv } = await resolveEnv(config.env);

          // Resolve date range: CLI flags → interactive prompt
          let dateRange: { from: string; to: string };
          if (options.from && options.to) {
            dateRange = { from: options.from, to: options.to };
          } else {
            dateRange = await promptDateRange();
          }

          // Resolve GitLab projects: CLI flag → config file → interactive prompt
          let gitlabProjectNames: string[];
          if (options.gitlabProjects) {
            gitlabProjectNames = options.gitlabProjects.split(',').map((s) => s.trim());
          } else if (config.gitlab.projectNames.length) {
            gitlabProjectNames = config.gitlab.projectNames;
          } else {
            gitlabProjectNames = await promptGitLabProjects();
          }

          // Resolve Asana project: CLI flag → config file → interactive prompt
          let asanaProjectId: string;
          if (options.asanaProject) {
            asanaProjectId = options.asanaProject;
          } else if (config.asana.projectId) {
            asanaProjectId = config.asana.projectId;
          } else {
            asanaProjectId = await promptAsanaProjectId();
          }

          // Offer to save if any values came from prompts
          const hasPromptedEnv = Object.keys(promptedEnv).length > 0;
          const hasPromptedConfig =
            !options.gitlabProjects &&
            !options.asanaProject &&
            (!config.gitlab.projectNames.length || !config.asana.projectId);

          if (hasPromptedEnv || hasPromptedConfig) {
            const shouldSave = await promptSaveConfig();
            if (shouldSave) {
              if (hasPromptedEnv) {
                saveEnvFile(promptedEnv);
                logger.success('Tokens saved to ~/.ai-automations/.env');
              }
              if (hasPromptedConfig) {
                saveConfigFile({
                  gitlab: { projectNames: gitlabProjectNames },
                  asana: { projectId: asanaProjectId },
                });
                logger.success('Configuration saved to ~/.ai-automations/config.json');
              }
            }
          }

          // Show execution info
          console.log();
          console.log(separator());
          logger.info(`Period: ${chalk.cyan(dateRange.from)} to ${chalk.cyan(dateRange.to)}`);
          logger.info(`GitLab projects: ${chalk.cyan(gitlabProjectNames.join(', '))}`);
          logger.info(`Asana project: ${chalk.cyan(asanaProjectId)}`);
          console.log(separator());
          console.log();

          const gitlabClient = new GitLabClient(env.GITLAB_TOKEN, env.GITLAB_URL);
          const asanaClient = new AsanaClient(env.ASANA_TOKEN);

          const summary = await handleProgressSummary(gitlabClient, asanaClient, {
            dateRange,
            gitlab: { projectNames: gitlabProjectNames },
            asana: {
              workspaceGid: env.ASANA_WORKSPACE_GID,
              projectGid: asanaProjectId,
              sectionMapping: config.asana.sectionMapping,
            },
          });

          // Display result in a nice box
          console.log();
          console.log(box(summary, 'Progress Summary'));
          console.log();
        } catch (error) {
          logger.error(error instanceof Error ? error.message : String(error));
          process.exit(1);
        }
      }
    );
}
