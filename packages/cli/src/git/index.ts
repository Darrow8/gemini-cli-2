import { Command } from 'commander';

// Import git subcommands
import authCommand from './auth.js';
import logoutCommand from './logout.js';
import repoCommand from './repo.js';
import statusCommand from './status.js';
import configCommand from './config.js';
import connectCommand from './connect.js';
import connectedCommand from './connected.js';
import setupCommand from './setup.js';

export default function gitCommand(): Command {
  const gitProgram = new Command('git');
  
  gitProgram
    .description('GitHub repository management')
    .addHelpText('after', `
Examples:
  $ mb git setup                   # Interactive setup (recommended for new users)
  $ mb git auth                    # Authenticate with GitHub
  $ mb git logout                  # Logout and clear authentication
  $ mb git connect owner/repo      # Connect to a specific repository
  $ mb git connected               # Show currently connected repository
  $ mb git repos                   # List your repositories
  $ mb git clone                   # Clone connected repository (or prompt)
  $ mb git clone owner/repo        # Clone specific repository
  $ mb git status                  # Get status of connected repo or current dir
  $ mb git config --show           # Show git configuration

Repository Connection Workflow:
  1. $ mb git setup                # Guided setup for new users
  2. $ mb git connect owner/repo   # Connect to repository you have access to
  3. $ mb git clone                # Clone the connected repository
  4. $ mb git status               # Check status (uses connected repo as fallback)
  5. $ mb git connected            # Manage your connection
`);

  // Setup command (guided onboarding)
  gitProgram
    .command('setup')
    .description('Interactive setup and onboarding')
    .action(setupCommand);

  // Authentication command
  gitProgram
    .command('auth')
    .description('Authenticate with GitHub')
    .option('-t, --token <token>', 'GitHub personal access token')
    .action(authCommand);

  // Logout command
  gitProgram
    .command('logout')
    .description('Logout and clear stored authentication')
    .action(logoutCommand);

  // Connect to repository command
  gitProgram
    .command('connect')
    .description('Connect to a specific repository')
    .argument('[repo]', 'Repository name (owner/repo format)')
    .option('--no-save', 'Don\'t save this connection to config')
    .action(connectCommand);

  // Show connected repository command
  gitProgram
    .command('connected')
    .description('Show currently connected repository')
    .action(connectedCommand);

  // Repository management
  gitProgram
    .command('repos')
    .alias('ls')
    .description('List your repositories')
    .option('-l, --limit <number>', 'Limit number of results', '10')
    .action(repoCommand);


  // Repository status
  gitProgram
    .command('status')
    .description('Get repository status and information')
    .argument('[repo]', 'Repository name (optional if in repo directory)')
    .action(statusCommand);

  // Configuration
  gitProgram
    .command('config')
    .description('Configure GitHub settings')
    .option('--token <token>', 'Set GitHub token')
    .option('--dir <directory>', 'Set default repos directory')
    .option('--show', 'Show current configuration')
    .action(configCommand);

  return gitProgram;
} 