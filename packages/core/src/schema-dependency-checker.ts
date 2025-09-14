/**
 * Schema Dependency Checker
 *
 * Utilities to detect and prevent circular dependencies in schema references
 */

import type { GitCMSSchema, FieldDefinition } from './schemas';

export interface DependencyGraph {
  [schemaId: string]: string[]; // schemaId -> array of referenced schema IDs
}

/**
 * Build a dependency graph from available schemas
 */
export function buildDependencyGraph(schemas: GitCMSSchema[]): DependencyGraph {
  const graph: DependencyGraph = {};

  for (const schema of schemas) {
    graph[schema.id] = extractSchemaReferences(schema);
  }

  return graph;
}

/**
 * Extract all schema references from a schema's fields
 */
export function extractSchemaReferences(schema: GitCMSSchema): string[] {
  const references = new Set<string>();

  function extractFromField(field: FieldDefinition): void {
    const fieldAny = field as any;

    // Check for direct schema reference in object fields
    if (field.type === 'object' && fieldAny.schemaRef) {
      references.add(fieldAny.schemaRef);
    }

    // Check array items for schema references
    if (field.type === 'array' && fieldAny.items) {
      extractFromField(fieldAny.items);
    }

    // Check inline object properties for nested schema references
    if (field.type === 'object' && fieldAny.properties) {
      for (const propField of Object.values(fieldAny.properties)) {
        extractFromField(propField as FieldDefinition);
      }
    }
  }

  for (const field of Object.values(schema.fields)) {
    extractFromField(field);
  }

  return Array.from(references);
}

/**
 * Check if adding a schema reference would create a circular dependency
 *
 * @param currentSchemaId - The schema we're adding a reference to
 * @param targetSchemaId - The schema we want to reference
 * @param dependencyGraph - Current dependency graph
 * @returns true if adding the reference would create a cycle
 */
export function wouldCreateCircularDependency(
  currentSchemaId: string,
  targetSchemaId: string,
  dependencyGraph: DependencyGraph
): boolean {
  // Direct circular reference (A -> A)
  if (currentSchemaId === targetSchemaId) {
    return true;
  }

  // Create a temporary graph with the new dependency
  const tempGraph = { ...dependencyGraph };
  if (!tempGraph[currentSchemaId]) {
    tempGraph[currentSchemaId] = [];
  }
  tempGraph[currentSchemaId] = [...tempGraph[currentSchemaId], targetSchemaId];

  // Check for cycles using DFS
  return hasCycle(tempGraph, currentSchemaId);
}

/**
 * Detect cycles in a dependency graph using DFS
 */
function hasCycle(graph: DependencyGraph, startNode: string): boolean {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(node: string): boolean {
    if (recursionStack.has(node)) {
      return true; // Cycle detected
    }

    if (visited.has(node)) {
      return false; // Already processed this branch
    }

    visited.add(node);
    recursionStack.add(node);

    const dependencies = graph[node] || [];
    for (const dependency of dependencies) {
      if (dfs(dependency)) {
        return true;
      }
    }

    recursionStack.delete(node);
    return false;
  }

  return dfs(startNode);
}

/**
 * Get the circular dependency path for debugging/error messages
 */
export function getCircularDependencyPath(
  currentSchemaId: string,
  targetSchemaId: string,
  dependencyGraph: DependencyGraph
): string[] | null {
  const tempGraph = { ...dependencyGraph };
  if (!tempGraph[currentSchemaId]) {
    tempGraph[currentSchemaId] = [];
  }
  tempGraph[currentSchemaId] = [...tempGraph[currentSchemaId], targetSchemaId];

  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [];

  function dfs(node: string): boolean {
    if (recursionStack.has(node)) {
      // Found cycle - return the path
      const cycleStartIndex = path.indexOf(node);
      return true;
    }

    if (visited.has(node)) {
      return false;
    }

    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const dependencies = tempGraph[node] || [];
    for (const dependency of dependencies) {
      if (dfs(dependency)) {
        return true;
      }
    }

    recursionStack.delete(node);
    path.pop();
    return false;
  }

  if (dfs(currentSchemaId)) {
    return path;
  }

  return null;
}

/**
 * Get all schemas that can be safely referenced by a given schema
 * (i.e., those that won't create circular dependencies)
 */
export function getSafeSchemaReferences(
  currentSchemaId: string,
  allSchemas: GitCMSSchema[]
): GitCMSSchema[] {
  const dependencyGraph = buildDependencyGraph(allSchemas);

  return allSchemas.filter(schema => {
    if (schema.id === currentSchemaId) {
      return false; // Can't reference self
    }

    return !wouldCreateCircularDependency(currentSchemaId, schema.id, dependencyGraph);
  });
}
