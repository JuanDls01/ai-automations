import 'dotenv/config';
import { GitLabClient } from './integrations/gitlab/client.js';
import { AsanaClient } from './integrations/asana/client.js';
import { handleProgressSummary } from './commands/progress-summary/handler.js';

async function main() {
  const gitlabToken = process.env['GITLAB_TOKEN'];
  const asanaToken = process.env['ASANA_TOKEN'];
  const gitlabUrl = process.env['GITLAB_URL'];

  if (!gitlabToken || !asanaToken) {
    console.error('Missing GITLAB_TOKEN or ASANA_TOKEN in .env');
    process.exit(1);
  }

  const gitlabClient = new GitLabClient(gitlabToken, gitlabUrl);
  const asanaClient = new AsanaClient(asanaToken);

  // TODO: Replace these with your actual values
  const config = {
    dateRange: {
      from: '2026-02-01',
      to: '2026-02-07',
    },
    gitlab: {
      projectNames: ['at-web-app', 'at-ccw', 'ccw-global'],
    },
    asana: {
      workspaceGid: process.env['ASANA_WORKSPACE_GID'] || '',
      projectGid: '1204646899903680',
      sectionMapping: {
        inProgress: ['EN DESARROLLO', 'CODE REVIEW', 'INTEGRACION'],
        blocked: ['EN PAUSA'],
      },
    },
  };

  console.log(
    `\nRunning progress-summary for ${config.dateRange.from} to ${config.dateRange.to}\n`
  );

  const summary = await handleProgressSummary(gitlabClient, asanaClient, config);

  console.log('\n--- RESULT ---\n');
  console.log(summary);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
