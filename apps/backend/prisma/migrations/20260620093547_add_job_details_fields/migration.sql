-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "auto_reject_score" INTEGER,
ADD COLUMN     "department" TEXT,
ADD COLUMN     "education" TEXT,
ADD COLUMN     "min_experience_years" INTEGER,
ADD COLUMN     "must_have_skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "nice_to_have_skills" TEXT[] DEFAULT ARRAY[]::TEXT[];
