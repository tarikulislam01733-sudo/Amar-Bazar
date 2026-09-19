import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGO_URI: z.string(),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  REDIS_URL: z.string(),
  JWT_ACCESS_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('30d'),
  SERVER_PEPPER: z.string(),
  AWS_S3_BUCKET: z.string(),
  AWS_S3_REGION: z.string(),
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  SMS_API_KEY: z.string(),
  SMS_API_URL: z.string(),
  PORICHOY_API_KEY: z.string(),
  PORICHOY_API_URL: z.string(),
});

const parseEnv = () => {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.format());
    process.exit(1);
  }

  return parsed.data;
};

export const env = parseEnv();
