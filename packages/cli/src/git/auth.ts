import chalk from 'chalk';
import inquirer from 'inquirer';
import { GitHubClient } from '../utils/git/github.js';
import { updateConfig, getConfig } from '../utils/git/config.js';
import { getRepositoryInfo, isInGitRepository } from '../utils/git/detect.js';
import { GitAuthOptions } from './types.js';

export default async function authCommand(options: GitAuthOptions): Promise<void> {
  try {
    const config = getConfig();
    
    // Check if already authenticated
    if (config.token) {
      console.log(chalk.green('✅ Already authenticated with GitHub'));
      
      // Verify token is still valid
      try {
        const client = new GitHubClient(config.token);
        const user = await client.getUser();
        console.log(chalk.gray(`Logged in as: ${user.login}`));
        
        const { reauth } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'reauth',
            message: 'Do you want to re-authenticate?',
            default: false
          }
        ]);
        
        if (!reauth) {
          return;
        }
      } catch (error) {
        console.log(chalk.yellow('⚠️  Existing token appears to be invalid, please re-authenticate'));
      }
    }

    console.log(chalk.blue('🔐 GitHub Authentication Setup'));
    console.log(chalk.gray('Connect your personal GitHub account using GitHub Device Flow'));
    console.log();

    const client = new GitHubClient();
    
    console.log(chalk.blue('🔄 Initiating GitHub device flow...'));
    const deviceFlow = await client.initiateDeviceFlow();
    
    console.log();
    console.log(chalk.green('📋 Please complete the following steps:'));
    console.log(chalk.white(`1. Go to: ${chalk.underline(deviceFlow.verification_uri)}`));
    console.log(chalk.white(`2. Enter the code: ${chalk.bold(deviceFlow.user_code)}`));
    console.log(chalk.gray(`   (Code expires in ${Math.floor(deviceFlow.expires_in / 60)} minutes)`));
    console.log();
    
    console.log(chalk.blue('🔄 Waiting for authorization...'));
    console.log(chalk.gray('Complete the steps above, then this will continue automatically...'));
    
    const token = await client.pollForToken(deviceFlow.device_code, deviceFlow.interval);
    
    // Test the token and get user info
    const authenticatedClient = new GitHubClient(token);
    const user = await authenticatedClient.getUser();
    
    // Save token to config
    updateConfig({ token, username: user.login });
    
    console.log();
    console.log(chalk.green('✅ Authentication successful!'));
    console.log(chalk.blue(`👋 Welcome, ${user.name || user.login}!`));
    console.log(chalk.gray(`GitHub Profile: ${user.html_url}`));
    
    if (user.public_repos !== undefined) {
      console.log(chalk.gray(`Public repositories: ${user.public_repos}`));
    }
    if (user.total_private_repos !== undefined) {
      console.log(chalk.gray(`Private repositories: ${user.total_private_repos}`));
    }

    console.log();
    console.log(chalk.bold.blue('🚀 Next Steps:'));
    
    // Check if we're in a git repository first
    const repoInfo = getRepositoryInfo();
    let selectRepo = false;
    
    if (repoInfo && repoInfo.owner && repoInfo.repo) {
      console.log();
      console.log(chalk.blue('📂 Detected current repository:'));
      console.log(chalk.gray(`Repository: ${repoInfo.owner}/${repoInfo.repo}`));
      
      const { connectCurrent } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'connectCurrent',
          message: 'Would you like to connect to this repository?',
          default: true
        }
      ]);
      
      if (connectCurrent) {
        try {
          // Verify the repository exists and user has access
          const repo = await authenticatedClient.getRepository(repoInfo.owner, repoInfo.repo);
          
          updateConfig({ 
            token, 
            username: user.login,
            connectedRepo: {
              owner: repo.owner.login,
              name: repo.name,
              fullName: repo.full_name,
              cloneUrl: repo.clone_url,
              sshUrl: repo.ssh_url,
              htmlUrl: repo.html_url,
              defaultBranch: repo.default_branch,
              connectedAt: new Date().toISOString()
            }
          });
          
          console.log();
          console.log(chalk.green('✅ Connected to current repository!'));
          console.log(chalk.gray(`Repository: ${repo.full_name}`));
          console.log(chalk.gray(`URL: ${repo.html_url}`));
          return;
          
        } catch (error) {
          console.log(chalk.red('❌ Failed to connect to current repository'));
          console.log(chalk.gray('You may not have access to this repository or it may not exist on GitHub'));
          
          const { selectFromList } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'selectFromList',
              message: 'Would you like to select from your repositories instead?',
              default: true
            }
          ]);
          
          selectRepo = selectFromList;
        }
      } else {
        const { selectFromList } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'selectFromList',
            message: 'Would you like to select from your repositories?',
            default: true
          }
        ]);
        
        selectRepo = selectFromList;
      }
    } else if (isInGitRepository()) {
      console.log();
      console.log(chalk.yellow('📂 You are in a git repository, but it doesn\'t appear to be a GitHub repository'));
      
      const { selectFromList } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'selectFromList',
          message: 'Would you like to select from your GitHub repositories?',
          default: true
        }
      ]);
      
      selectRepo = selectFromList;
    } else {
      // Not in a git repository, ask if they want to select one
      const { selectFromList } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'selectFromList',
          message: 'Would you like to connect to a repository now?',
          default: true
        }
      ]);
      
      selectRepo = selectFromList;
    }
    
    if (selectRepo) {
      console.log();
      console.log(chalk.blue('📦 Loading your repositories...'));
      
      try {
        // Get user's repositories
        const repos = await authenticatedClient.getUserRepositories(20);
        
        if (repos.length === 0) {
          console.log(chalk.yellow('No repositories found.'));
          return;
        }
        
        const repoChoices = repos.map(repo => ({
          name: `${repo.full_name} ${repo.description ? `- ${repo.description}` : ''}`,
          value: repo
        }));
        
        const { selectedRepo } = await inquirer.prompt([
          {
            type: 'list',
            name: 'selectedRepo',
            message: 'Select a repository to connect:',
            choices: repoChoices,
            pageSize: 10
          }
        ]);
        
        // Connect to the selected repository
        updateConfig({ 
          token, 
          username: user.login,
          connectedRepo: {
            owner: selectedRepo.owner.login,
            name: selectedRepo.name,
            fullName: selectedRepo.full_name,
            cloneUrl: selectedRepo.clone_url,
            sshUrl: selectedRepo.ssh_url,
            htmlUrl: selectedRepo.html_url,
            defaultBranch: selectedRepo.default_branch,
            connectedAt: new Date().toISOString()
          }
        });
        
        console.log();
        console.log(chalk.green('✅ Connected to repository!'));
        console.log(chalk.gray(`Repository: ${selectedRepo.full_name}`));
        console.log(chalk.gray(`URL: ${selectedRepo.html_url}`));
        
      } catch (error) {
        console.log(chalk.red('❌ Failed to load repositories'));
        console.log(chalk.gray('You can connect to a repository later using: mb git connect owner/repo'));
      }
    } else {
      console.log(chalk.gray('• List your repositories:'), chalk.white('mb git repos'));
      console.log(chalk.gray('• Connect to a repository:'), chalk.white('mb git connect owner/repo'));
      console.log(chalk.gray('• Clone a repository:'), chalk.white('mb git clone'));
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log();
    console.error(chalk.red('❌ Authentication failed:'), errorMessage);
    
    // Provide specific guidance based on the error
    if (errorMessage.includes('User denied access')) {
      console.log(chalk.yellow('💡 You need to authorize the application to continue'));
    } else if (errorMessage.includes('Device code expired')) {
      console.log(chalk.yellow('💡 Please run the command again to get a new code'));
    } else if (errorMessage.includes('Failed to poll for token')) {
      console.log(chalk.yellow('💡 This might be a network issue or the GitHub API is having problems'));
      console.log(chalk.yellow('💡 Please try again in a few moments'));
    } else if (errorMessage.includes('Failed to get user information')) {
      console.log(chalk.yellow('💡 Please check your internet connection and try again'));
    }
    
    process.exit(1);
  }
} 