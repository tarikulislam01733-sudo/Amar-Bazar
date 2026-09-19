import { AppError, ErrorCode } from './AppError';

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, ErrorCode.UNAUTHORIZED);
  }
}
