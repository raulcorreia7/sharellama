import { z } from "zod";

export const voteValueSchema = z.union([z.literal(1), z.literal(-1)]);

export const createVoteSchema = z.object({
  value: voteValueSchema,
});

export type VoteValue = z.infer<typeof voteValueSchema>;
export type CreateVoteInput = z.infer<typeof createVoteSchema>;
