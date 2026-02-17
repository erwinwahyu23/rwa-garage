import { z } from 'zod';

export const createMinimalSparePartSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  categoryId: z.string().optional().nullable(),
});

export type CreateMinimalSparePart = z.infer<typeof createMinimalSparePartSchema>;
