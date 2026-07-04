import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import type { ZodType } from 'zod';

/** Roda um schema Zod como validator de um FormGroup inteiro (equivalente ao zodResolver do React Hook Form). */
export function zodValidator(schema: ZodType): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const result = schema.safeParse(control.value);
    if (result.success) return null;
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '_root';
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { zod: fieldErrors };
  };
}
