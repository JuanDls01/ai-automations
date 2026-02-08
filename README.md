# AI Automations CLI

Interactive CLI to run automated tasks powered by GenAI.

![Terminal Demo](./assets/new-terminal-demo.png)

## Installation

### For team members (recommended)

Install directly from the Git repository:

```bash
npm install -g git+https://github.com/JuanDls01/ai-automations.git
```

To install a specific version (using Git tags):

```bash
npm install -g git+https://github.com/JuanDls01/ai-automations.git#v1.0.0
```

To update to the latest version:

```bash
npm update -g ai-automations
```

### For local development

```bash
npm install
npm run build
npm link        # Makes `ai-auto` available globally
```

## Usage

```bash
ai-auto                # Interactive menu
ai-auto progress-summary --from 2026-02-03 --to 2026-02-07  # Direct mode
```

On first run, the CLI will prompt for any missing configuration and offer to save it for next time.

## Commands

### `progress-summary`

Generates a weekly progress summary by pulling data from GitLab (merge requests) and Asana (tasks), then uses AI to group and format the output.

**Options:**

| Flag                        | Description                            |
| --------------------------- | -------------------------------------- |
| `--from <date>`             | Start date (YYYY-MM-DD)                |
| `--to <date>`               | End date (YYYY-MM-DD)                  |
| `--gitlab-projects <names>` | GitLab project names (comma-separated) |
| `--asana-project <id>`      | Asana project ID                       |

If no flags are provided, the CLI will prompt interactively.

## Configuration

All configuration is stored in `~/.ai-automations/`:

| File          | Contents                                                                            |
| ------------- | ----------------------------------------------------------------------------------- |
| `.env`        | API tokens and secrets                                                              |
| `config.json` | Project-specific settings (GitLab project names, Asana project ID, section mapping) |

### Required Tokens

#### GitLab Token

1. Go to your GitLab instance → **Settings** → **Access Tokens** (or `/-/user_settings/personal_access_tokens`)
2. Create a new token with the `read_api` scope
3. Copy the generated token (starts with `glpat-`)

#### GitLab API URL

The base URL for the GitLab API. Defaults to `https://gitlab.com/api/v4`.

If you use a self-hosted instance, set it to `https://your-gitlab.com/api/v4`.

#### Asana Token

1. Go to [Asana Developer Console](https://app.asana.com/0/developer-console)
2. Click **Create new token** under **Personal access tokens**
3. Copy the generated token

#### Asana Workspace GID

1. Open [Asana API Explorer](https://developers.asana.com/reference/getworkspaces) or run:
   ```bash
   curl -s -H "Authorization: Bearer YOUR_ASANA_TOKEN" \
     https://app.asana.com/api/1.0/workspaces | jq '.data[] | {gid, name}'
   ```
2. Copy the `gid` of your workspace

#### Asana Project ID

1. Open the project board in Asana
2. The URL looks like `https://app.asana.com/0/XXXXXXXXXX/...` — the number after `/0/` is the project ID

#### Google AI API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Click **Create API Key**
3. Copy the generated key

### Config File Example

`~/.ai-automations/config.json`:

```json
{
  "gitlab": {
    "projectNames": ["my-app", "my-api"]
  },
  "asana": {
    "projectId": "1234567890",
    "sectionMapping": {
      "inProgress": ["EN DESARROLLO", "CODE REVIEW", "INTEGRACION"],
      "blocked": ["EN PAUSA"]
    }
  }
}
```

The `sectionMapping` is optional and has sensible defaults. Customize it if your Asana board uses different column names.

## Development

### Prerequisites

- Node.js >= 18.0.0
- npm

### Setup

```bash
npm install
```

### Scripts

- `npm run dev` - Run in development mode with tsx
- `npm run build` - Build for production with tsup
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run lint` - Lint code with ESLint
- `npm run lint:fix` - Fix linting issues
- `npm run type-check` - Check TypeScript types

## Commit Conventions

This project follows [Conventional Commits](https://www.conventionalcommits.org/).

### Pre-commit Hooks

The following checks run automatically before each commit:

1. **Lint-staged**: Runs ESLint and Prettier on staged files
2. **Commitlint**: Validates commit message format

If any check fails, the commit will be blocked. Fix the issues and try again.

## License

ISC
