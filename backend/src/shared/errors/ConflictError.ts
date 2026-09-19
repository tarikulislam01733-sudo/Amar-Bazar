import { AppError, ErrorCode } from './AppError';

export class ConflictError extends AppError {
  constructor(message: string = 'Conflict') {
    super(message, 409, ErrorCode.DUPLICATE_RESOURCE);
  }
}
