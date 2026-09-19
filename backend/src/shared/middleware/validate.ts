import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { BadRequestError } from '../errors/BadRequestError';

export const validate = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error: any) {
      if (error.name === 'ZodError') {
        const details: Record<string, string> = {};
        for (const issue of error.errors) {
          details[issue.path.join('.')] = issue.message;
        }
        return next(new BadRequestError('Validation Error', details));
      }
      next(error);
    }
  };
};
