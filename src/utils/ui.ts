import chalk from 'chalk';

/**
 * UI utilities for enhanced terminal output
 */

// Icons
export const icons = {
  success: chalk.green('✓'),
  error: chalk.red('✗'),
  warning: chalk.yellow('!'),
  info: chalk.cyan('◆'),
  bullet: chalk.dim('•'),
  arrow: chalk.cyan('→'),
  check: chalk.green('✓'),
};

/**
 * Create a badge with background color
 */
export function badge(text: string, color: 'cyan' | 'green' | 'yellow' | 'red' = 'cyan'): string {
  const colorFn = {
    cyan: chalk.bgCyan.black,
    green: chalk.bgGreen.black,
    yellow: chalk.bgYellow.black,
    red: chalk.bgRed.black,
  }[color];

  return colorFn(` ${text} `);
}

/**
 * Create a horizontal separator line
 */
export function separator(length: number = 50, char: string = '─'): string {
  return chalk.dim(char.repeat(length));
}

/**
 * Create a section header with optional badge
 */
export function sectionHeader(title: string, badgeText?: string): string {
  const header = badgeText ? `${badge(badgeText)} ${chalk.bold(title)}` : chalk.bold.cyan(title);
  return `\n${header}\n${separator()}`;
}

/**
 * Create an ASCII banner
 */
export function banner(text: string): string {
  // Simple ASCII art style
  const lines = createASCIIText(text);
  return chalk.bold.cyan(lines.join('\n'));
}

/**
 * Create simple block-style ASCII text
 */
function createASCIIText(text: string): string[] {
  const upper = text.toUpperCase();
  const chars: Record<string, string[]> = {
    A: ['▄▀█', '█▀█'],
    I: ['█', '█'],
    ' ': [' ', ' '],
    '-': ['   ', '───'],
    U: ['█ █', '█▄█'],
    T: ['▀█▀', ' █ '],
    O: ['█▀█', '█▄█'],
    M: ['█▀▄▀█', '█ ▀ █'],
    N: ['█▄░█', '█░▀█'],
    S: ['█▀', '▄█'],
  };

  const line1: string[] = [];
  const line2: string[] = [];

  for (const char of upper) {
    const ascii = chars[char] || ['?', '?'];
    line1.push(ascii[0]!);
    line2.push(ascii[1]!);
  }

  return [line1.join(' '), line2.join(' ')];
}

/**
 * Create a list item with icon
 */
export function listItem(text: string, icon: string = icons.bullet): string {
  return `${icon} ${text}`;
}

/**
 * Create a box around text
 */
export function box(content: string, title?: string): string {
  const lines = content.split('\n');
  const maxLength = Math.max(...lines.map((l) => l.length), title?.length || 0);
  const width = maxLength + 4;

  const top = title
    ? `╭─ ${chalk.bold(title)} ${'─'.repeat(Math.max(0, width - title.length - 5))}╮`
    : `╭${'─'.repeat(width - 2)}╮`;

  const bottom = `╰${'─'.repeat(width - 2)}╯`;

  const boxedLines = lines.map((line) => {
    const padding = ' '.repeat(Math.max(0, maxLength - line.length));
    return `│ ${line}${padding} │`;
  });

  return [top, ...boxedLines, bottom].join('\n');
}

/**
 * Format a key-value pair
 */
export function keyValue(key: string, value: string): string {
  return `${chalk.dim(key + ':')} ${chalk.cyan(value)}`;
}

/**
 * Create a success message box
 */
export function successBox(message: string): string {
  const lines = message.split('\n');
  const content = lines.map((line) => `${icons.success} ${line}`).join('\n');
  return chalk.green(box(content, 'Success'));
}

/**
 * Create an error message box
 */
export function errorBox(message: string): string {
  const lines = message.split('\n');
  const content = lines.map((line) => `${icons.error} ${line}`).join('\n');
  return chalk.red(box(content, 'Error'));
}

/**
 * Create a styled header with banner
 */
export function header(title: string, subtitle?: string): string {
  const output = ['\n', banner(title)];

  if (subtitle) {
    output.push(chalk.dim(subtitle));
  }

  output.push('');
  return output.join('\n');
}

/**
 * Format a summary section
 */
export function summary(items: Array<{ label: string; value: string | number }>): string {
  return items
    .map(({ label, value }) => {
      return `  ${icons.info} ${chalk.bold(label)}: ${chalk.cyan(value)}`;
    })
    .join('\n');
}
