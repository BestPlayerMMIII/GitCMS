#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init';
import { setupCommand } from './commands/setup';
import { generateCommand } from './commands/generate';

const program = new Command();

program
  .name('gitcms')
  .description('GitCMS - Universal GitHub-Based Content Management System')
  .version('0.1.0');

// Init command
program
  .command('init [directory]')
  .description('Initialize a new GitCMS project')
  .option('-t, --template <template>', 'Project template (blog, portfolio, ecommerce)')
  .option('--no-git', 'Skip git initialization')
  .action(initCommand);

// Setup command
program
  .command('setup')
  .description('Setup GitCMS in an existing repository')
  .option('-r, --repository <repo>', 'GitHub repository (owner/repo)')
  .option('-b, --branch <branch>', 'Git branch (default: main)')
  .action(setupCommand);

// Generate command
program
  .command('generate <type>')
  .alias('g')
  .description('Generate content types, schemas, or examples')
  .option('-n, --name <name>', 'Name for the generated item')
  .option('-f, --fields <fields>', 'Comma-separated list of fields')
  .action(generateCommand);

// Schema command
program
  .command('schema')
  .description('Schema management commands')
  .command('validate <file>')
  .description('Validate a schema file')
  .action(file => {
    console.log(chalk.blue(`Validating schema: ${file}`));
  });

// Dev command
program
  .command('dev')
  .description('Start development server')
  .option('-p, --port <port>', 'Port number (default: 3001)')
  .action(options => {
    console.log(chalk.green('Starting GitCMS development server...'));
    console.log(chalk.gray(`Port: ${options.port || 3001}`));
  });

// Build command
program
  .command('build')
  .description('Build the project')
  .option('-o, --output <dir>', 'Output directory')
  .action(options => {
    console.log(chalk.blue('Building GitCMS project...'));
    if (options.output) {
      console.log(chalk.gray(`Output: ${options.output}`));
    }
  });

program.parse(process.argv);
