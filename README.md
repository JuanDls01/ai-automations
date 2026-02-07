# AI Automations CLI

Interactive CLI to run automated tasks powered by GenAI.

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

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (formatting, etc)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `build`: Changes that affect the build system or external dependencies
- `ci`: Changes to CI configuration files and scripts
- `chore`: Other changes that don't modify src or test files
- `revert`: Reverts a previous commit

### Examples

```bash
feat: add progress-summary command
fix: resolve date parsing issue in CLI
docs: update README with usage examples
refactor: simplify config manager logic
```

### Pre-commit Hooks

The following checks run automatically before each commit:

1. **Lint-staged**: Runs ESLint and Prettier on staged files
2. **Commitlint**: Validates commit message format

If any check fails, the commit will be blocked. Fix the issues and try again.

## License

ISC
