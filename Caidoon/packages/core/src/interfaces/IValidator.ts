/**
 * Validation result
 */
export interface ValidationResult<T = any> {
  valid: boolean;
  data?: T;
  errors?: string[];
}

/**
 * Validator metadata
 */
export interface ValidatorMetadata {
  name: string;
  description: string;
  version: string;
}

/**
 * Custom validator interface
 * Allows plugins to register custom validation logic
 */
export interface IValidator<T = any> {
  /**
   * Validator metadata
   */
  getMetadata(): ValidatorMetadata;

  /**
   * Validate data
   * @param data Data to validate
   * @returns Validation result with typed data if valid
   */
  validate(data: unknown): ValidationResult<T>;

  /**
   * Get JSON schema for this validator (optional)
   * Can be used for API documentation
   */
  getSchema?(): Record<string, unknown>;
}
