import { Command } from 'commander';
import { select } from '@inquirer/prompts';
import chalk from 'chalk';
import { registerCommands, getAvailableCommands } from './commands/index.js';

export async function cli(argv: string[]) {
  const program = new Command();

  program
    .name('ai-auto')
    .description('Interactive CLI to run automated tasks powered by GenAI')
    .version('1.0.0');

  registerCommands(program);

  // If no command provided, show interactive menu
  const hasCommand = argv.length > 2 && !argv[2]!.startsWith('-');

  if (!hasCommand) {
    await showInteractiveMenu(program);
    return;
  }

  await program.parseAsync(argv);
}

async function showInteractiveMenu(program: Command) {
  console.log(
    '\n' + chalk.bold.cyan('AI Automations CLI') + chalk.dim(' - Automated tasks powered by GenAI')
  );
  console.log();

  const commands = getAvailableCommands();

  if (commands.length === 0) {
    console.log(chalk.yellow('No commands available yet.\n'));
    return;
  }

  try {
    const selected = await select({
      message: 'Select a command:',
      choices: [
        ...commands.map((cmd) => ({
          name: `${chalk.bold(cmd.name)} ${chalk.dim('- ' + cmd.description)}`,
          value: cmd.name,
        })),
        {
          name: chalk.dim('Exit'),
          value: 'exit',
        },
      ],
    });

    if (selected === 'exit') {
      return;
    }

    // Execute the selected command (interactive mode, no extra args)
    await program.parseAsync([process.argv[0]!, process.argv[1]!, selected]);
  } catch (error) {
    // Handle Ctrl+C gracefully
    if (error instanceof Error && error.name === 'ExitPromptError') {
      console.log();
      return;
    }
    throw error;
  }
}
