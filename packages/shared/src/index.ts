import { z } from "zod";

export const submissionSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  modelName: z.string().min(1).max(100),
});

export type Submission = z.infer<typeof submissionSchema>;
