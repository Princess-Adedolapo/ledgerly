/**
 * Utility to format user-safe error messages for UI alerts, toasts, and notifications.
 * Prevents raw database internal messages, PostgreSQL codes, stack traces, and system paths
 * from leaking to end users.
 */
export function getErrorMessage(
  error: unknown,
  fallbackMessage = 'Unable to complete this request. Please try again or contact support.'
): string {
  if (!error) return fallbackMessage;

  const rawMessage =
    typeof error === 'string'
      ? error
      : error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
      ? String((error as Record<string, unknown>).message)
      : String(error);

  if (!rawMessage) return fallbackMessage;

  // Intercept Zod schema validation errors (either as a ZodError object or JSON string)
  if (typeof error === 'object' && error !== null && 'issues' in error && Array.isArray((error as { issues: unknown[] }).issues)) {
    const issues = (error as { issues: Array<{ path?: (string | number)[]; code?: string; message?: string; maximum?: number; minimum?: number }> }).issues;
    if (issues.length > 0) {
      const first = issues[0];
      const fieldPath = Array.isArray(first.path) ? first.path.join('.') : '';
      const fieldLabel =
        fieldPath === 'discount_rate' || fieldPath === 'discount'
          ? 'Incentive / Discount'
          : fieldPath === 'tax_rate'
          ? 'Tax rate'
          : fieldPath === 'amount'
          ? 'Total amount'
          : fieldPath === 'customer_name'
          ? 'Customer name'
          : fieldPath ? fieldPath.replace(/_/g, ' ') : '';

      if (first.code === 'too_big' && typeof first.maximum === 'number') {
        return `${fieldLabel || 'Value'} cannot exceed ${first.maximum}.`;
      }
      if (first.code === 'too_small' && typeof first.minimum === 'number') {
        return `${fieldLabel || 'Value'} must be at least ${first.minimum}.`;
      }
      if (first.message && first.message !== 'Invalid input') {
        return first.message;
      }
      if (fieldLabel) {
        return `Please provide a valid value for ${fieldLabel}.`;
      }
    }
  }

  if (rawMessage.startsWith('[') && rawMessage.includes('"code"')) {
    try {
      const parsedIssues = JSON.parse(rawMessage);
      if (Array.isArray(parsedIssues) && parsedIssues.length > 0) {
        const first = parsedIssues[0];
        const fieldPath = Array.isArray(first.path) ? first.path.join('.') : '';
        const fieldLabel =
          fieldPath === 'discount_rate' || fieldPath === 'discount'
            ? 'Incentive / Discount'
            : fieldPath === 'tax_rate'
            ? 'Tax rate'
            : fieldPath === 'amount'
            ? 'Total amount'
            : fieldPath === 'customer_name'
            ? 'Customer name'
            : fieldPath ? fieldPath.replace(/_/g, ' ') : '';

        if (first.code === 'too_big' && typeof first.maximum === 'number') {
          return `${fieldLabel || 'Value'} cannot exceed ${first.maximum}.`;
        }
        if (first.code === 'too_small' && typeof first.minimum === 'number') {
          return `${fieldLabel || 'Value'} must be at least ${first.minimum}.`;
        }
        if (first.message && first.message !== 'Invalid input') {
          return first.message;
        }
        if (fieldLabel) {
          return `Please provide a valid value for ${fieldLabel}.`;
        }
      }
    } catch {
      // Fall through if not valid JSON
    }
  }
  const isInternalDbError =
    /PGRST|PostgREST|row-level security|foreign key constraint|duplicate key value|unique constraint|relation ".*" does not exist|column ".*" of relation|syntax error at or near/i.test(
      rawMessage
    );

  if (isInternalDbError) {
    if (/duplicate key|unique constraint/i.test(rawMessage)) {
      return 'A record with this information already exists in this workspace.';
    }
    if (/row-level security/i.test(rawMessage)) {
      return 'Permission denied. You do not have access to modify this item.';
    }
    return fallbackMessage;
  }

  // Mask network and internal script errors
  if (/fetch failed|failed to fetch|500 Internal Server Error|TypeError: Failed to fetch/i.test(rawMessage)) {
    return 'Unable to reach the server. Please check your network connection and try again.';
  }

  // If the message contains stack trace indicators, hide them
  if (/\.ts|\.js|\/node_modules\/|at\s+[a-zA-Z0-9_$]+\s+\(/i.test(rawMessage)) {
    return fallbackMessage;
  }

  // Allow short user-oriented messages
  if (rawMessage.length <= 250) {
    return rawMessage;
  }

  return fallbackMessage;
}
