import type { ContentSchema, SchemaField } from './types';

// Pre-built schema templates for common content types

export const blogPostSchema: ContentSchema = {
  name: 'blog-post',
  displayName: 'Blog Post',
  description: 'Blog post content type',
  fields: [
    {
      name: 'title',
      type: 'string',
      required: true,
      description: 'Post title',
    },
    {
      name: 'slug',
      type: 'string',
      required: true,
      description: 'URL slug for the post',
    },
    {
      name: 'excerpt',
      type: 'text',
      description: 'Short description or excerpt',
    },
    {
      name: 'content',
      type: 'markdown',
      required: true,
      description: 'Post content in Markdown',
    },
    {
      name: 'featuredImage',
      type: 'media',
      mediaTypes: ['image'],
      description: 'Featured image for the post',
    },
    {
      name: 'tags',
      type: 'array',
      itemType: 'string',
      description: 'Post tags',
    },
    {
      name: 'category',
      type: 'select',
      options: ['Technology', 'Lifestyle', 'Business', 'Other'],
      description: 'Post category',
    },
    {
      name: 'published',
      type: 'boolean',
      description: 'Whether the post is published',
    },
    {
      name: 'publishedAt',
      type: 'datetime',
      description: 'Publication date and time',
    },
    {
      name: 'author',
      type: 'string',
      description: 'Post author',
    },
  ],
};

export const projectSchema: ContentSchema = {
  name: 'project',
  displayName: 'Project',
  description: 'Portfolio project content type',
  fields: [
    {
      name: 'title',
      type: 'string',
      required: true,
      description: 'Project title',
    },
    {
      name: 'slug',
      type: 'string',
      required: true,
      description: 'URL slug for the project',
    },
    {
      name: 'description',
      type: 'text',
      required: true,
      description: 'Project description',
    },
    {
      name: 'content',
      type: 'markdown',
      description: 'Detailed project information',
    },
    {
      name: 'featuredImage',
      type: 'media',
      mediaTypes: ['image'],
      description: 'Featured image for the project',
    },
    {
      name: 'gallery',
      type: 'array',
      itemType: 'media',
      description: 'Project gallery images',
    },
    {
      name: 'technologies',
      type: 'array',
      itemType: 'string',
      description: 'Technologies used in the project',
    },
    {
      name: 'status',
      type: 'select',
      options: ['Planning', 'In Progress', 'Completed', 'Archived'],
      description: 'Project status',
    },
    {
      name: 'liveUrl',
      type: 'string',
      description: 'Live project URL',
    },
    {
      name: 'githubUrl',
      type: 'string',
      description: 'GitHub repository URL',
    },
    {
      name: 'startDate',
      type: 'date',
      description: 'Project start date',
    },
    {
      name: 'endDate',
      type: 'date',
      description: 'Project completion date',
    },
  ],
};

export const productSchema: ContentSchema = {
  name: 'product',
  displayName: 'Product',
  description: 'E-commerce product content type',
  fields: [
    {
      name: 'name',
      type: 'string',
      required: true,
      description: 'Product name',
    },
    {
      name: 'slug',
      type: 'string',
      required: true,
      description: 'URL slug for the product',
    },
    {
      name: 'description',
      type: 'text',
      required: true,
      description: 'Product description',
    },
    {
      name: 'content',
      type: 'markdown',
      description: 'Detailed product information',
    },
    {
      name: 'price',
      type: 'number',
      required: true,
      description: 'Product price',
    },
    {
      name: 'compareAtPrice',
      type: 'number',
      description: 'Original price for comparison',
    },
    {
      name: 'sku',
      type: 'string',
      description: 'Stock keeping unit',
    },
    {
      name: 'featuredImage',
      type: 'media',
      mediaTypes: ['image'],
      description: 'Featured product image',
    },
    {
      name: 'gallery',
      type: 'array',
      itemType: 'media',
      description: 'Product gallery images',
    },
    {
      name: 'category',
      type: 'string',
      description: 'Product category',
    },
    {
      name: 'tags',
      type: 'array',
      itemType: 'string',
      description: 'Product tags',
    },
    {
      name: 'inStock',
      type: 'boolean',
      description: 'Whether the product is in stock',
    },
    {
      name: 'featured',
      type: 'boolean',
      description: 'Whether the product is featured',
    },
  ],
};

export const pageSchema: ContentSchema = {
  name: 'page',
  displayName: 'Page',
  description: 'Static page content type',
  fields: [
    {
      name: 'title',
      type: 'string',
      required: true,
      description: 'Page title',
    },
    {
      name: 'slug',
      type: 'string',
      required: true,
      description: 'URL slug for the page',
    },
    {
      name: 'content',
      type: 'markdown',
      required: true,
      description: 'Page content in Markdown',
    },
    {
      name: 'excerpt',
      type: 'text',
      description: 'Page excerpt or meta description',
    },
    {
      name: 'featuredImage',
      type: 'media',
      mediaTypes: ['image'],
      description: 'Featured image for the page',
    },
    {
      name: 'published',
      type: 'boolean',
      description: 'Whether the page is published',
    },
    {
      name: 'showInNavigation',
      type: 'boolean',
      description: 'Whether to show in site navigation',
    },
    {
      name: 'order',
      type: 'number',
      description: 'Navigation order',
    },
  ],
};

// Export all default schemas
export const defaultSchemas: Record<string, ContentSchema> = {
  'blog-post': blogPostSchema,
  'project': projectSchema,
  'product': productSchema,
  'page': pageSchema,
};