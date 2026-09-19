import { z } from 'zod';

const NID_REGEX = /^(\d{10}|\d{13}|\d{17})$/;

export const initiateKycSchema = z.object({
  body: z.object({
    nidNumber: z.string().regex(NID_REGEX, "NID must be 10, 13, or 17 digits"),
    dob: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid date format for DOB, must be an ISO date string",
    }),
  })
});
