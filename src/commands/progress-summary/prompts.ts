import { input, confirm, password } from '@inquirer/prompts';

function getDefaultDateRange(): { from: string; to: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  // Go back to last Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  // Friday of the same week
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  return {
    from: monday.toISOString().split('T')[0]!,
    to: friday.toISOString().split('T')[0]!,
  };
}

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value));
}

export async function promptGitLabProjects(): Promise<string[]> {
  const raw = await input({
    message: 'GitLab project names (comma-separated):',
    validate: (v) => (v.trim() ? true : 'At least one project name is required'),
  });

  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function promptAsanaProjectId(): Promise<string> {
  return input({
    message: 'Asana project ID:',
    validate: (v) => (v.trim() ? true : 'Project ID is required'),
  });
}

export async function promptSaveConfig(): Promise<boolean> {
  return confirm({
    message: 'Save this configuration for next time?',
    default: true,
  });
}

export async function promptToken(name: string): Promise<string> {
  return password({
    message: `${name}:`,
    mask: '*',
    validate: (v) => (v.trim() ? true : `${name} is required`),
  });
}

export async function promptEnvVar(name: string): Promise<string> {
  return input({
    message: `${name}:`,
    validate: (v) => (v.trim() ? true : `${name} is required`),
  });
}

export async function promptDateRange(): Promise<{ from: string; to: string }> {
  const defaults = getDefaultDateRange();

  const from = await input({
    message: 'Start date (YYYY-MM-DD):',
    default: defaults.from,
    validate: (v) => (isValidDate(v) ? true : 'Invalid date format. Use YYYY-MM-DD'),
  });

  const to = await input({
    message: 'End date (YYYY-MM-DD):',
    default: defaults.to,
    validate: (v) => (isValidDate(v) ? true : 'Invalid date format. Use YYYY-MM-DD'),
  });

  return { from, to };
}
