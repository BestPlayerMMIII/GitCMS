import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';

interface GenerateOptions {
  name?: string;
  fields?: string;
}

export async function generateCommand(type: string, options: GenerateOptions) {
  console.log(chalk.blue(`Generating ${type}...`));

  switch (type) {
    case 'schema':
      await generateSchema(options);
      break;
    case 'content':
      await generateContent(options);
      break;
    case 'example':
      await generateExample(options);
      break;
    default:
      console.log(chalk.red(`Unknown type: ${type}`));
      console.log(chalk.gray('Available types: schema, content, example'));
  }
}

async function generateSchema(options: GenerateOptions) {
  let name = options.name;
  
  if (!name) {
    const { schemaName } = await inquirer.prompt([
      {
        type: 'input',
        name: 'schemaName',
        message: 'Schema name:',
        validate: (input) => input.length > 0 || 'Name is required',
      },
    ]);
    name = schemaName;
  }

  // Get fields
  let fields = [];
  if (options.fields) {
    fields = options.fields.split(',').map(f => {
      const [fieldName, fieldType = 'string'] = f.trim().split(':');
      return { name: fieldName, type: fieldType };
    });
  } else {
    // Interactive field creation
    let addMore = true;
    while (addMore) {
      const fieldInfo = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Field name:',
        },
        {
          type: 'list',
          name: 'type',
          message: 'Field type:',
          choices: ['string', 'text', 'number', 'boolean', 'date', 'datetime', 'markdown', 'media', 'array'],
        },
        {
          type: 'confirm',
          name: 'required',
          message: 'Required field?',
          default: false,
        },
      ]);

      if (fieldInfo.name) {
        fields.push(fieldInfo);
      }

      const { continue: continueAdding } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'continue',
          message: 'Add another field?',
          default: false,
        },
      ]);

      addMore = continueAdding;
    }
  }

  // Create schema object
  const schema = {
    name: name!.toLowerCase().replace(/\s+/g, '-'),
    displayName: name,
    description: `${name} content type`,
    fields,
  };

  // Write schema file
  const schemasDir = '.gitcms/schemas';
  if (!fs.existsSync(schemasDir)) {
    fs.mkdirSync(schemasDir, { recursive: true });
  }

  const schemaPath = path.join(schemasDir, `${schema.name}.json`);
  fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2));

  console.log(chalk.green(`✓ Schema created: ${schemaPath}`));
}

async function generateContent(options: GenerateOptions) {
  // Check available schemas
  const schemasDir = '.gitcms/schemas';
  if (!fs.existsSync(schemasDir)) {
    console.log(chalk.red('No schemas found. Generate a schema first.'));
    return;
  }

  const schemaFiles = fs.readdirSync(schemasDir).filter(f => f.endsWith('.json'));
  if (schemaFiles.length === 0) {
    console.log(chalk.red('No schemas found. Generate a schema first.'));
    return;
  }

  // Select schema
  const { selectedSchema } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedSchema',
      message: 'Select content type:',
      choices: schemaFiles.map(f => f.replace('.json', '')),
    },
  ]);

  // Load schema
  const schemaPath = path.join(schemasDir, `${selectedSchema}.json`);
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

  // Generate content based on schema
  const content: any = { id: `example-${Date.now()}` };
  
  for (const field of schema.fields) {
    switch (field.type) {
      case 'string':
        content[field.name] = `Example ${field.name}`;
        break;
      case 'text':
      case 'markdown':
        content[field.name] = `This is example ${field.name} content.`;
        break;
      case 'number':
        content[field.name] = 42;
        break;
      case 'boolean':
        content[field.name] = true;
        break;
      case 'date':
      case 'datetime':
        content[field.name] = new Date().toISOString();
        break;
      case 'array':
        content[field.name] = ['example', 'tags'];
        break;
      default:
        content[field.name] = null;
    }
  }

  // Write content file
  const contentDir = path.join('content', selectedSchema);
  if (!fs.existsSync(contentDir)) {
    fs.mkdirSync(contentDir, { recursive: true });
  }

  const contentPath = path.join(contentDir, `${content.id}.json`);
  fs.writeFileSync(contentPath, JSON.stringify(content, null, 2));

  console.log(chalk.green(`✓ Example content created: ${contentPath}`));
}

async function generateExample(options: GenerateOptions) {
  const { exampleType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'exampleType',
      message: 'Select example type:',
      choices: ['Next.js Blog', 'Portfolio Site', 'E-commerce'],
    },
  ]);

  console.log(chalk.blue(`Generating ${exampleType} example...`));
  
  // This would generate example projects
  // For now, just log what would be created
  console.log(chalk.gray('Example generation is not yet implemented.'));
  console.log(chalk.gray('This would create a complete example project structure.'));
}