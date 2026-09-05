/**
 * One-off script to create/refresh demo accounts for the portfolio demo:
 *   - Demo company/recruiter (workspace: "HireFlow Demo Co")
 *   - Demo candidate (job seeker)
 *   - Two published demo jobs so the recruiter dashboard isn't empty
 *
 * Idempotent: safe to re-run — upserts by unique email/slug and only creates
 * jobs if they don't already exist (matched by companyId + title).
 *
 * Run with: npx ts-node -r tsconfig-paths/register prisma/seed-demo.ts
 * (from apps/backend)
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const BCRYPT_SALT_ROUNDS = 10;

const DEMO_COMPANY_SLUG = 'hireflow-demo-co';
const DEMO_COMPANY_NAME = 'HireFlow Demo Co';
const DEMO_RECRUITER_EMAIL = 'demo@hireflow.dev';
const DEMO_RECRUITER_PASSWORD = 'Demo1234';
const DEMO_RECRUITER_NAME = 'Demo Recruiter';

const DEMO_CANDIDATE_EMAIL = 'demo.candidate@hireflow.dev';
const DEMO_CANDIDATE_PASSWORD = 'Demo1234';
const DEMO_CANDIDATE_NAME = 'Demo Candidate';

async function main() {
  console.log('Seeding demo company + recruiter...');
  const recruiterPasswordHash = await bcrypt.hash(
    DEMO_RECRUITER_PASSWORD,
    BCRYPT_SALT_ROUNDS,
  );

  const company = await prisma.company.upsert({
    where: { slug: DEMO_COMPANY_SLUG },
    update: {},
    create: {
      name: DEMO_COMPANY_NAME,
      slug: DEMO_COMPANY_SLUG,
      industry: 'Technology',
      size: '11-50',
    },
  });

  const recruiter = await prisma.user.upsert({
    where: { email: DEMO_RECRUITER_EMAIL },
    update: {},
    create: {
      companyId: company.id,
      email: DEMO_RECRUITER_EMAIL,
      passwordHash: recruiterPasswordHash,
      fullName: DEMO_RECRUITER_NAME,
      role: 'ADMIN',
    },
  });
  console.log(`  company: ${company.name} (${company.id})`);
  console.log(`  recruiter: ${recruiter.email} (${recruiter.id})`);

  console.log('Seeding demo candidate...');
  const candidatePasswordHash = await bcrypt.hash(
    DEMO_CANDIDATE_PASSWORD,
    BCRYPT_SALT_ROUNDS,
  );
  const candidate = await prisma.candidate.upsert({
    where: { email: DEMO_CANDIDATE_EMAIL },
    update: {},
    create: {
      email: DEMO_CANDIDATE_EMAIL,
      fullName: DEMO_CANDIDATE_NAME,
      passwordHash: candidatePasswordHash,
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`  candidate: ${candidate.email} (${candidate.id})`);

  console.log('Seeding demo jobs...');
  const demoJobs = [
    {
      title: 'Senior Frontend Engineer (Vue)',
      description:
        'We are looking for a Senior Frontend Engineer to help us build a delightful, fast, and accessible hiring platform. You will own key parts of the recruiter and candidate experience end to end, from design collaboration through shipping to production.',
      requirements:
        '5+ years building production web applications with Vue or a comparable framework (React/Angular). Strong TypeScript skills. Experience with component libraries (Vuetify, MUI, or similar) and state management (Pinia/Vuex/Redux). Comfortable working directly with designers and product to refine specs. Bonus: experience with Nest.js or another Node backend.',
      department: 'Engineering',
      location: 'Remote',
      jobType: 'REMOTE' as const,
      employmentType: 'FULL_TIME' as const,
      salaryMin: 120000,
      salaryMax: 160000,
      mustHaveSkills: ['Vue', 'TypeScript', 'CSS'],
      niceToHaveSkills: ['Nest.js', 'Vuetify', 'Pinia'],
      minExperienceYears: 5,
      education: "Bachelor's degree or equivalent experience",
    },
    {
      title: 'Product Designer',
      description:
        'HireFlow is hiring a Product Designer to shape the end-to-end experience for recruiters and job seekers. You will partner closely with engineering and the founder to turn rough ideas into polished, production-ready screens.',
      requirements:
        '3+ years of product design experience, ideally on B2B SaaS. A strong portfolio showing end-to-end product thinking, not just visuals. Proficiency with Figma. Experience designing complex workflows (dashboards, multi-step forms, data tables) is a strong plus.',
      department: 'Design',
      location: 'New York, NY',
      jobType: 'HYBRID' as const,
      employmentType: 'FULL_TIME' as const,
      salaryMin: 95000,
      salaryMax: 130000,
      mustHaveSkills: ['Figma', 'Product Design', 'UX Research'],
      niceToHaveSkills: ['Design Systems', 'Prototyping'],
      minExperienceYears: 3,
      education: null,
    },
  ];

  for (const jobData of demoJobs) {
    const existing = await prisma.job.findFirst({
      where: { companyId: company.id, title: jobData.title, deletedAt: null },
    });
    if (existing) {
      console.log(`  job already exists, skipping: ${jobData.title}`);
      continue;
    }
    const job = await prisma.job.create({
      data: {
        companyId: company.id,
        createdById: recruiter.id,
        title: jobData.title,
        description: jobData.description,
        requirements: jobData.requirements,
        department: jobData.department,
        location: jobData.location,
        jobType: jobData.jobType,
        employmentType: jobData.employmentType,
        salaryMin: jobData.salaryMin,
        salaryMax: jobData.salaryMax,
        mustHaveSkills: jobData.mustHaveSkills,
        niceToHaveSkills: jobData.niceToHaveSkills,
        minExperienceYears: jobData.minExperienceYears,
        education: jobData.education,
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
    console.log(`  created job: ${job.title} (${job.id})`);
  }

  console.log('\nDone. Demo credentials:');
  console.log(`  Company sign-in:   ${DEMO_RECRUITER_EMAIL} / ${DEMO_RECRUITER_PASSWORD}`);
  console.log(`  Candidate sign-in: ${DEMO_CANDIDATE_EMAIL} / ${DEMO_CANDIDATE_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
