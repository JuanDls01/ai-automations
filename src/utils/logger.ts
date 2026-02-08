import chalk from 'chalk';
import { icons, listItem } from './ui.js';

export const logger = {
  info: (msg: string) => console.log(listItem(msg, icons.info)),
  success: (msg: string) => console.log(listItem(msg, icons.success)),
  warn: (msg: string) => console.log(listItem(msg, icons.warning)),
  error: (msg: string) => console.error(listItem(msg, icons.error)),

  // New formatted loggers
  section: (title: string) => console.log(`\n${chalk.bold.cyan(title)}`),
  dim: (msg: string) => console.log(chalk.dim(msg)),
  highlight: (msg: string) => console.log(chalk.cyan.bold(msg)),
};
