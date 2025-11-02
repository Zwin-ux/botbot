-- CreateEnum
CREATE TYPE "DeploymentStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "personality_templates" (
    "id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "persona" TEXT NOT NULL,
    "system_prompt" TEXT NOT NULL,
    "traits" JSONB NOT NULL DEFAULT '{}',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category" TEXT NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "price" DECIMAL(10,2),
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personality_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personality_ratings" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "review" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personality_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personality_deployments" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "DeploymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personality_deployments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "personality_templates_creator_id_idx" ON "personality_templates"("creator_id");

-- CreateIndex
CREATE INDEX "personality_templates_category_idx" ON "personality_templates"("category");

-- CreateIndex
CREATE INDEX "personality_templates_is_public_idx" ON "personality_templates"("is_public");

-- CreateIndex
CREATE INDEX "personality_templates_is_verified_idx" ON "personality_templates"("is_verified");

-- CreateIndex
CREATE INDEX "personality_templates_download_count_idx" ON "personality_templates"("download_count");

-- CreateIndex
CREATE UNIQUE INDEX "personality_ratings_template_id_user_id_key" ON "personality_ratings"("template_id", "user_id");

-- CreateIndex
CREATE INDEX "personality_ratings_template_id_idx" ON "personality_ratings"("template_id");

-- CreateIndex
CREATE INDEX "personality_ratings_user_id_idx" ON "personality_ratings"("user_id");

-- CreateIndex
CREATE INDEX "personality_ratings_rating_idx" ON "personality_ratings"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "personality_deployments_agent_id_key" ON "personality_deployments"("agent_id");

-- CreateIndex
CREATE INDEX "personality_deployments_template_id_idx" ON "personality_deployments"("template_id");

-- CreateIndex
CREATE INDEX "personality_deployments_user_id_idx" ON "personality_deployments"("user_id");

-- CreateIndex
CREATE INDEX "personality_deployments_status_idx" ON "personality_deployments"("status");

-- AddForeignKey
ALTER TABLE "personality_templates" ADD CONSTRAINT "personality_templates_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personality_ratings" ADD CONSTRAINT "personality_ratings_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "personality_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personality_ratings" ADD CONSTRAINT "personality_ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personality_deployments" ADD CONSTRAINT "personality_deployments_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "personality_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personality_deployments" ADD CONSTRAINT "personality_deployments_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personality_deployments" ADD CONSTRAINT "personality_deployments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;