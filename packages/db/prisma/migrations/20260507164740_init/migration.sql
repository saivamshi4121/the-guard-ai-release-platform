-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('SAFETY', 'HALLUCINATION', 'INJECTION', 'POLICY', 'QA');

-- CreateEnum
CREATE TYPE "ScoreType" AS ENUM ('BOOLEAN', 'NUMERIC', 'CATEGORICAL', 'TEXT');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RegressionSeverity" AS ENUM ('INFO', 'WARN', 'BLOCKER');

-- CreateTable
CREATE TABLE "prompt_versions" (
    "id" TEXT NOT NULL,
    "task_type" "TaskType" NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "template_hash" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eval_cases" (
    "id" TEXT NOT NULL,
    "task_type" "TaskType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "input" JSONB NOT NULL,
    "expected" JSONB,
    "tags" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eval_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eval_runs" (
    "id" TEXT NOT NULL,
    "task_type" "TaskType" NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'QUEUED',
    "model_config" JSONB NOT NULL,
    "prompt_version_id" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eval_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eval_outputs" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "output_text" TEXT NOT NULL,
    "output_json" JSONB,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "latency_ms" INTEGER NOT NULL,
    "usage" JSONB NOT NULL,
    "cost" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eval_outputs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eval_scores" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "scorer_id" TEXT NOT NULL,
    "score_type" "ScoreType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "rationale" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eval_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regressions" (
    "id" TEXT NOT NULL,
    "baseline_run_id" TEXT NOT NULL,
    "candidate_run_id" TEXT NOT NULL,
    "severity" "RegressionSeverity" NOT NULL,
    "summary" TEXT NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "regressions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regression_reports" (
    "id" TEXT NOT NULL,
    "baseline_run_id" TEXT NOT NULL,
    "candidate_run_id" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "severity" "RegressionSeverity" NOT NULL,
    "summary" TEXT NOT NULL,
    "comparison_json" JSONB NOT NULL,
    "prompt_diff_summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "regression_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regression_examples" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "segment" TEXT NOT NULL,
    "baseline_output" TEXT,
    "candidate_output" TEXT,
    "baseline_score" DOUBLE PRECISION,
    "candidate_score" DOUBLE PRECISION,
    "delta" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "regression_examples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benchmark_summaries" (
    "id" TEXT NOT NULL,
    "task_type" "TaskType",
    "summary_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "benchmark_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benchmark_recommendations" (
    "id" TEXT NOT NULL,
    "summary_id" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "benchmark_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_guard_events" (
    "id" TEXT NOT NULL,
    "run_id" TEXT,
    "kind" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cost_guard_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aborted_runs" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aborted_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projected_costs" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "case_id" TEXT,
    "projected_usd" DOUBLE PRECISION NOT NULL,
    "limit_usd" DOUBLE PRECISION,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projected_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hallucination_traces" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "trace" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hallucination_traces_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prompt_versions_template_hash_idx" ON "prompt_versions"("template_hash");

-- CreateIndex
CREATE INDEX "prompt_versions_task_type_name_idx" ON "prompt_versions"("task_type", "name");

-- CreateIndex
CREATE UNIQUE INDEX "prompt_versions_name_version_task_type_key" ON "prompt_versions"("name", "version", "task_type");

-- CreateIndex
CREATE INDEX "eval_cases_task_type_name_idx" ON "eval_cases"("task_type", "name");

-- CreateIndex
CREATE INDEX "eval_cases_tags_idx" ON "eval_cases"("tags");

-- CreateIndex
CREATE INDEX "eval_runs_task_type_status_created_at_idx" ON "eval_runs"("task_type", "status", "created_at");

-- CreateIndex
CREATE INDEX "eval_runs_prompt_version_id_idx" ON "eval_runs"("prompt_version_id");

-- CreateIndex
CREATE INDEX "eval_outputs_run_id_idx" ON "eval_outputs"("run_id");

-- CreateIndex
CREATE INDEX "eval_outputs_case_id_idx" ON "eval_outputs"("case_id");

-- CreateIndex
CREATE UNIQUE INDEX "eval_outputs_run_id_case_id_key" ON "eval_outputs"("run_id", "case_id");

-- CreateIndex
CREATE INDEX "eval_scores_run_id_score_type_idx" ON "eval_scores"("run_id", "score_type");

-- CreateIndex
CREATE INDEX "eval_scores_case_id_idx" ON "eval_scores"("case_id");

-- CreateIndex
CREATE UNIQUE INDEX "eval_scores_run_id_case_id_scorer_id_key" ON "eval_scores"("run_id", "case_id", "scorer_id");

-- CreateIndex
CREATE INDEX "regressions_severity_created_at_idx" ON "regressions"("severity", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "regressions_baseline_run_id_candidate_run_id_key" ON "regressions"("baseline_run_id", "candidate_run_id");

-- CreateIndex
CREATE INDEX "regression_reports_baseline_run_id_candidate_run_id_created_idx" ON "regression_reports"("baseline_run_id", "candidate_run_id", "created_at");

-- CreateIndex
CREATE INDEX "regression_examples_report_id_idx" ON "regression_examples"("report_id");

-- CreateIndex
CREATE INDEX "regression_examples_case_id_idx" ON "regression_examples"("case_id");

-- CreateIndex
CREATE INDEX "benchmark_summaries_created_at_idx" ON "benchmark_summaries"("created_at");

-- CreateIndex
CREATE INDEX "benchmark_recommendations_summary_id_idx" ON "benchmark_recommendations"("summary_id");

-- CreateIndex
CREATE INDEX "cost_guard_events_run_id_created_at_idx" ON "cost_guard_events"("run_id", "created_at");

-- CreateIndex
CREATE INDEX "cost_guard_events_kind_created_at_idx" ON "cost_guard_events"("kind", "created_at");

-- CreateIndex
CREATE INDEX "aborted_runs_created_at_idx" ON "aborted_runs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "aborted_runs_run_id_key" ON "aborted_runs"("run_id");

-- CreateIndex
CREATE INDEX "projected_costs_run_id_created_at_idx" ON "projected_costs"("run_id", "created_at");

-- CreateIndex
CREATE INDEX "hallucination_traces_run_id_idx" ON "hallucination_traces"("run_id");

-- CreateIndex
CREATE INDEX "hallucination_traces_case_id_idx" ON "hallucination_traces"("case_id");

-- AddForeignKey
ALTER TABLE "eval_runs" ADD CONSTRAINT "eval_runs_prompt_version_id_fkey" FOREIGN KEY ("prompt_version_id") REFERENCES "prompt_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eval_outputs" ADD CONSTRAINT "eval_outputs_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "eval_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eval_outputs" ADD CONSTRAINT "eval_outputs_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "eval_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eval_scores" ADD CONSTRAINT "eval_scores_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "eval_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eval_scores" ADD CONSTRAINT "eval_scores_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "eval_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regressions" ADD CONSTRAINT "regressions_baseline_run_id_fkey" FOREIGN KEY ("baseline_run_id") REFERENCES "eval_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regressions" ADD CONSTRAINT "regressions_candidate_run_id_fkey" FOREIGN KEY ("candidate_run_id") REFERENCES "eval_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hallucination_traces" ADD CONSTRAINT "hallucination_traces_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "eval_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hallucination_traces" ADD CONSTRAINT "hallucination_traces_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "eval_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
