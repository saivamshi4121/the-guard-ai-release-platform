import { z } from "zod";
import { RegressionSeverity, RunStatus, ScoreType, TaskType } from "./types.js";

// Reusable primitives
export const isoDateTimeStringSchema = z.string().min(1);
export const recordUnknownSchema = z.record(z.string(), z.unknown());

// Enums
export const taskTypeSchema = z.nativeEnum(TaskType);
export const scoreTypeSchema = z.nativeEnum(ScoreType);
export const runStatusSchema = z.nativeEnum(RunStatus);
export const regressionSeveritySchema = z.nativeEnum(RegressionSeverity);

// ModelConfig
export const modelConfigSchema = z.object({
  provider: z.enum(["openai", "anthropic", "google", "local", "other"]),
  model: z.string().min(1),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  maxOutputTokens: z.number().int().positive().optional(),
  seed: z.number().int().optional(),
  extra: recordUnknownSchema.optional(),
});

// PromptVersion
export const promptVersionSchema = z.object({
  id: z.string().min(1),
  taskType: taskTypeSchema,
  name: z.string().min(1),
  version: z.number().int().nonnegative(),
  template: z.string().min(1),
  metadata: recordUnknownSchema.optional(),
  createdAt: isoDateTimeStringSchema,
});

// EvalTask
export const evalTaskSchema = z.object({
  id: z.string().min(1),
  taskType: taskTypeSchema,
  name: z.string().min(1),
  description: z.string().optional(),
  createdAt: isoDateTimeStringSchema,
  updatedAt: isoDateTimeStringSchema,
});

// EvalCase
export const evalCaseSchema = z.object({
  id: z.string().min(1),
  taskType: taskTypeSchema,
  name: z.string().min(1),
  description: z.string().optional(),
  input: recordUnknownSchema,
  expected: recordUnknownSchema.nullable().optional(),
  tags: z.array(z.string().min(1)).default([]),
  createdAt: isoDateTimeStringSchema,
  updatedAt: isoDateTimeStringSchema,
});

// EvalRun
export const evalRunSchema = z.object({
  id: z.string().min(1),
  taskType: taskTypeSchema,
  status: runStatusSchema,
  modelConfig: modelConfigSchema,
  promptVersionId: z.string().min(1).nullable(),
  startedAt: isoDateTimeStringSchema.nullable().optional(),
  completedAt: isoDateTimeStringSchema.nullable().optional(),
  createdAt: isoDateTimeStringSchema,
  updatedAt: isoDateTimeStringSchema,
});

// EvalScore
export const evalScoreSchema = z.object({
  id: z.string().min(1),
  runId: z.string().min(1),
  caseId: z.string().min(1),
  scoreType: scoreTypeSchema,
  value: z.number(),
  passed: z.boolean(),
  rationale: z.string().nullable().optional(),
  metadata: recordUnknownSchema.nullable().optional(),
  createdAt: isoDateTimeStringSchema,
});

// RegressionResult
export const regressionResultSchema = z.object({
  id: z.string().min(1),
  baselineRunId: z.string().min(1),
  candidateRunId: z.string().min(1),
  severity: regressionSeveritySchema,
  summary: z.string().min(1),
  details: recordUnknownSchema.nullable().optional(),
  createdAt: isoDateTimeStringSchema,
});

export type ModelConfigInput = z.input<typeof modelConfigSchema>;
export type ModelConfigOutput = z.output<typeof modelConfigSchema>;
