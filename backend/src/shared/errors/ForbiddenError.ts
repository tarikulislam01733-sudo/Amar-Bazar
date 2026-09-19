import { AppError, ErrorCode } from './AppError';

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, ErrorCode.FORBIDDEN);
  }
}
