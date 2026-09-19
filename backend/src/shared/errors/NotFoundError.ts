import { AppError, ErrorCode } from './AppError';

export class NotFoundError extends AppError {
  constructor(message: string = 'Not Found') {
    super(message, 404, ErrorCode.NOT_FOUND);
  }
}
