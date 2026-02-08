import { Command } from 'commander';
// import { select } from '@inquiP

// Get package.json for version
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);
// const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

/**
 * CLI function that sets up Commander and handles interactive mode
 */
export async function cli(argv: string[]) {
  const program = new Command();

  program.name('ai-auto').description('Interactive CLI to run automated tasks powered by GenAI');
  // .version(packageJson.version);

  // TODO: Register commands here
  // registerCommands(program);
  program.option('--first').option('-s, --separator <char>').argument('<string>');

  // Parse arguments
  program.parse(argv);

  const options = program.opts();
  const limit = options.first ? 1 : undefined;
  console.log(program.args[0].split(options.separator, limit));

  // If no command was provided, show interactive menu
  //   if (argv.length <= 2) {
  //     await showInteractiveMenu(program);
  //   }
}

/**
 * Shows interactive menu to select a command
 */
// async function showInteractiveMenu(program: Command) {
//   console.clear();

//   // Show welcome banner
//   const banner = boxen(
//     chalk.bold.cyan('🤖 AI Automations CLI') +
//       '\n\n' +
//       chalk.dim('Automated tasks powered by GenAI'),
//     {
//       padding: 1,
//       margin: 1,
//       borderStyle: 'round',
//       borderColor: 'cyan',
//     }
//   );

//   console.log(banner);

//   // Get available commands (excluding help/version)
//   const commands = program.commands
//     .filter((cmd) => !['help', 'version'].includes(cmd.name()))
//     .map((cmd) => ({
//       name: cmd.name(),
//       value: cmd.name(),
//       description: cmd.description() || 'No description',
//     }));

//   // If no commands are registered yet, show message
//   if (commands.length === 0) {
//     console.log(chalk.yellow('\n⚠️  No commands available yet. Check back soon!\n'));
//     return;
//   }

//   try {
//     // Show command selection menu
//     const selectedCommand = await select({
//       message: 'Select a command to run:',
//       choices: [
//         ...commands.map((cmd) => ({
//           name: `${chalk.bold(cmd.name)} - ${chalk.dim(cmd.description)}`,
//           value: cmd.name,
//           description: cmd.description,
//         })),
//         {
//           name: chalk.dim('Exit'),
//           value: 'exit',
//           description: 'Exit the CLI',
//         },
//       ],
//     });

//     if (selectedCommand === 'exit') {
//       console.log(chalk.dim('\n👋 Goodbye!\n'));
//       return;
//     }

//     // Execute the selected command in interactive mode
//     const command = program.commands.find((cmd) => cmd.name() === selectedCommand);
//     if (command) {
//       // Parse with the command and an interactive flag
//       await program.parseAsync([process.argv[0], process.argv[1], selectedCommand, '-i']);
//     }
//   } catch (error) {
//     // Handle user cancellation (Ctrl+C)
//     if (error instanceof Error && error.name === 'ExitPromptError') {
//       console.log(chalk.dim('\n\n👋 Goodbye!\n'));
//       return;
//     }
//     throw error;
//   }
// }
