import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';

interface InitOptions {
  template?: string;
  git?: boolean;
}

export async function initCommand(directory: string = '.', options: InitOptions) {
  const spinner = ora('Initializing GitCMS project...').start();

  try {
    const projectPath = path.resolve(directory);
    const projectName = path.basename(projectPath);

    // Create directory if it doesn't exist
    if (!fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath, { recursive: true });
    }

    // Check if directory is empty
    const files = fs.readdirSync(projectPath);
    if (files.length > 0) {
      spinner.stop();
      const { proceed } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'proceed',
          message: 'Directory is not empty. Continue anyway?',
          default: false,
        },
      ]);

      if (!proceed) {
        console.log(chalk.yellow('Initialization cancelled.'));
        return;
      }
      spinner.start();
    }

    // Create GitCMS structure
    const gitcmsDir = path.join(projectPath, '.gitcms');
    const contentDir = path.join(projectPath, 'content');
    const mediaDir = path.join(projectPath, 'media');

    // Create directories
    fs.mkdirSync(gitcmsDir, { recursive: true });
    fs.mkdirSync(path.join(gitcmsDir, 'schemas'), { recursive: true });
    fs.mkdirSync(contentDir, { recursive: true });
    fs.mkdirSync(mediaDir, { recursive: true });

    // Create config file
    const config = {
      version: '0.1.0',
      name: projectName,
      description: 'GitCMS project',
      contentPath: 'content',
      mediaPath: 'media',
      collections: [],
    };

    fs.writeFileSync(
      path.join(gitcmsDir, 'config.json'),
      JSON.stringify(config, null, 2)
    );

    // Create basic schema based on template
    const template = options.template || 'blog';
    await createTemplateFiles(projectPath, template);

    // Initialize git if requested
    if (options.git !== false) {
      // Git initialization would go here
    }

    spinner.succeed(chalk.green('GitCMS project initialized successfully!'));

    console.log('\\n' + chalk.blue('Next steps:'));
    console.log(chalk.gray('1. Connect your GitHub repository'));
    console.log(chalk.gray('2. Configure your schemas in .gitcms/schemas/'));
    console.log(chalk.gray('3. Start creating content!'));

  } catch (error) {
    spinner.fail(chalk.red('Failed to initialize project'));
    console.error(error);
  }
}

async function createTemplateFiles(projectPath: string, template: string) {
  const templatesPath = path.join(projectPath, '.gitcms', 'schemas');

  switch (template) {
    case 'blog':
      createBlogTemplate(templatesPath);
      break;
    case 'portfolio':
      createPortfolioTemplate(templatesPath);
      break;
    case 'ecommerce':
      createEcommerceTemplate(templatesPath);
      break;
    default:
      createBlogTemplate(templatesPath);
  }
}

function createBlogTemplate(schemasPath: string) {
  const blogPostSchema = {
    name: 'blog-post',
    displayName: 'Blog Post',
    fields: [
      { name: 'title', type: 'string', required: true },
      { name: 'slug', type: 'string', required: true },
      { name: 'content', type: 'markdown', required: true },
      { name: 'excerpt', type: 'text' },
      { name: 'published', type: 'boolean' },
      { name: 'publishedAt', type: 'datetime' },
      { name: 'tags', type: 'array', itemType: 'string' },
    ],
  };

  fs.writeFileSync(
    path.join(schemasPath, 'blog-post.json'),
    JSON.stringify(blogPostSchema, null, 2)
  );
}

function createPortfolioTemplate(schemasPath: string) {
  const projectSchema = {
    name: 'project',
    displayName: 'Project',
    fields: [
      { name: 'title', type: 'string', required: true },
      { name: 'slug', type: 'string', required: true },
      { name: 'description', type: 'text', required: true },
      { name: 'content', type: 'markdown' },
      { name: 'technologies', type: 'array', itemType: 'string' },
      { name: 'liveUrl', type: 'string' },
      { name: 'githubUrl', type: 'string' },
    ],
  };

  fs.writeFileSync(
    path.join(schemasPath, 'project.json'),
    JSON.stringify(projectSchema, null, 2)
  );
}

function createEcommerceTemplate(schemasPath: string) {
  const productSchema = {
    name: 'product',
    displayName: 'Product',
    fields: [
      { name: 'name', type: 'string', required: true },
      { name: 'slug', type: 'string', required: true },
      { name: 'description', type: 'text', required: true },
      { name: 'price', type: 'number', required: true },
      { name: 'sku', type: 'string' },
      { name: 'inStock', type: 'boolean' },
      { name: 'category', type: 'string' },
    ],
  };

  fs.writeFileSync(
    path.join(schemasPath, 'product.json'),
    JSON.stringify(productSchema, null, 2)
  );
}