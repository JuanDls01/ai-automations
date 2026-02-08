import type { Command } from 'commander';
import { createProgressSummaryCommand } from './progress-summary/index.js';

export interface CommandInfo {
  name: string;
  description: string;
}

const commandFactories = [createProgressSummaryCommand];

export function registerCommands(program: Command): void {
  for (const factory of commandFactories) {
    program.addCommand(factory());
  }
}

export function getAvailableCommands(): CommandInfo[] {
  return commandFactories.map((factory) => {
    const cmd = factory();
    return { name: cmd.name(), description: cmd.description() };
  });
}
