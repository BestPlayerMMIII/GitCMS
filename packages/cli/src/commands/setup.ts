import chalk from 'chalk';
import inquirer from 'inquirer';
import { Octokit } from '@octokit/rest';

interface SetupOptions {
  repository?: string;
  branch?: string;
}

export async function setupCommand(options: SetupOptions) {
  console.log(chalk.blue('Setting up GitCMS in existing repository...'));

  try {
    // Get repository information
    let repository = options.repository;
    if (!repository) {
      const { repo } = await inquirer.prompt([
        {
          type: 'input',
          name: 'repo',
          message: 'GitHub repository (owner/repo):',
          validate: (input) => {
            if (!input.includes('/')) {
              return 'Repository must be in format owner/repo';
            }
            return true;
          },
        },
      ]);
      repository = repo;
    }

    // Get GitHub token
    const { token } = await inquirer.prompt([
      {
        type: 'password',
        name: 'token',
        message: 'GitHub personal access token:',
        mask: '*',
      },
    ]);

    // Initialize Octokit
    const octokit = new Octokit({ auth: token });

    // Verify repository access
    const [owner, repo] = repository!.split('/');
    try {
      await octokit.rest.repos.get({ owner, repo });
      console.log(chalk.green('✓ Repository access verified'));
    } catch (error) {
      console.log(chalk.red('✗ Failed to access repository'));
      return;
    }

    // Check if GitCMS is already set up
    try {
      await octokit.rest.repos.getContent({
        owner,
        repo,
        path: '.gitcms/config.json',
      });
      console.log(chalk.yellow('GitCMS is already set up in this repository'));
      
      const { proceed } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'proceed',
          message: 'Continue and overwrite existing configuration?',
          default: false,
        },
      ]);

      if (!proceed) {
        console.log(chalk.yellow('Setup cancelled.'));
        return;
      }
    } catch (error) {
      // GitCMS not set up yet, continue
    }

    // Create GitCMS structure
    await createGitCMSStructure(octokit, owner, repo, options.branch || 'main');

    console.log(chalk.green('✓ GitCMS setup completed successfully!'));
    console.log('\\n' + chalk.blue('Next steps:'));
    console.log(chalk.gray('1. Visit the GitCMS admin interface'));
    console.log(chalk.gray('2. Configure your content schemas'));
    console.log(chalk.gray('3. Start creating content!'));

  } catch (error) {
    console.error(chalk.red('Setup failed:'), error);
  }
}

async function createGitCMSStructure(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string
) {
  const files = [
    {
      path: '.gitcms/config.json',
      content: JSON.stringify({
        version: '0.1.0',
        contentPath: 'content',
        mediaPath: 'media',
        collections: [],
      }, null, 2),
    },
    {
      path: '.gitcms/schemas/blog-post.json',
      content: JSON.stringify({
        name: 'blog-post',
        displayName: 'Blog Post',
        fields: [
          { name: 'title', type: 'string', required: true },
          { name: 'slug', type: 'string', required: true },
          { name: 'content', type: 'markdown', required: true },
          { name: 'published', type: 'boolean' },
          { name: 'publishedAt', type: 'datetime' },
        ],
      }, null, 2),
    },
    {
      path: 'content/.gitkeep',
      content: '',
    },
    {
      path: 'media/.gitkeep',
      content: '',
    },
  ];

  for (const file of files) {
    try {
      // Check if file exists
      let sha: string | undefined;
      try {
        const existing = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: file.path,
          ref: branch,
        });
        
        if ('sha' in existing.data) {
          sha = existing.data.sha;
        }
      } catch (error) {
        // File doesn't exist, which is fine
      }

      // Create or update file
      await octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: file.path,
        message: sha ? `Update ${file.path}` : `Create ${file.path}`,
        content: Buffer.from(file.content).toString('base64'),
        branch,
        sha,
      });

      console.log(chalk.green(`✓ Created ${file.path}`));
    } catch (error) {
      console.log(chalk.red(`✗ Failed to create ${file.path}`));
      throw error;
    }
  }
}