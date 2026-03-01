import { z } from "zod";

export const createCommentSchema = z.object({
  body: z.string().min(1).max(5000),
  parentId: z.number().int().positive().optional(),
});

export const listCommentsQuerySchema = z.object({
  include: z.enum(["all", "flat"]).optional(),
});

export const voteCommentSchema = z.object({
  value: z.union([z.literal(1), z.literal(-1)]),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type ListCommentsQuery = z.infer<typeof listCommentsQuerySchema>;
export type VoteCommentInput = z.infer<typeof voteCommentSchema>;

export interface CommentNode {
  id: number;
  submissionId: number;
  authorHash: string;
  parentId: number | null;
  body: string;
  score: number;
  createdAt: string;
  replies?: CommentNode[];
}
