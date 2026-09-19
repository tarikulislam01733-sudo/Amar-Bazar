import { z } from 'zod';

const BD_PHONE_REGEX = /^(?:\+88|88)?(01[3-9]\d{8})$/;

export const requestOTPSchema = z.object({
  body: z.object({
    phone: z.string().regex(BD_PHONE_REGEX, 'Invalid Bangladeshi phone number'),
  }),
});

export const verifyOTPSchema = z.object({
  body: z.object({
    phone: z.string().regex(BD_PHONE_REGEX, 'Invalid Bangladeshi phone number'),
    otp: z.string().length(6, 'OTP must be 6 digits'),
  }),
});
