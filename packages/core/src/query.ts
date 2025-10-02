export type Operator = '==' | '!=' | '>' | '>=' | '<' | '<=' | 'in' | 'contains';

/**
 * Apply a comparison operator to a field value
 * @param fieldValue The value of the field
 * @param operator The comparison operator
 * @param value The value to compare against
 * @returns True if the comparison is valid, false otherwise
 */
export function applyOperator(fieldValue: any, operator: Operator, value: any): boolean {
  switch (operator) {
    case '==':
      return fieldValue === value;
    case '!=':
      return fieldValue !== value;
    case '>':
      return fieldValue > value;
    case '>=':
      return fieldValue >= value;
    case '<':
      return fieldValue < value;
    case '<=':
      return fieldValue <= value;
    case 'in':
      return Array.isArray(value) && value.includes(fieldValue);
    case 'contains':
      return typeof fieldValue === 'string' && typeof value === 'string'
        ? fieldValue.toLowerCase().includes(value.toLowerCase())
        : false;
    default:
      return false;
  }
}
