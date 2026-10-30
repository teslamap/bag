export class CommerceError extends Error {
  code: string;
  field?: string;

  constructor(code: string, message: string, field?: string) {
    super(message);
    this.name = 'CommerceError';
    this.code = code;
    this.field = field;
  }
}

export function normalizeError(error: unknown): CommerceError {
  if (error instanceof CommerceError) return error;
  if (error instanceof Error) return new CommerceError('unexpected', error.message);
  return new CommerceError('unexpected', 'დაფიქსირდა მოულოდნელი შეცდომა.');
}

export function errorMessage(error: unknown, fallback = 'დაფიქსირდა შეცდომა. სცადეთ თავიდან.'): string {
  if (error instanceof CommerceError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
