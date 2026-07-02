export interface ScoreApplicationJobData {
  applicationId: string;
  jobId: string;
  candidateId: string;
  resumeStoragePath: string;
}

export interface ScoreApplicationJobResult {
  applicationId: string;
  aiFitScore: number;
  scoredAt: string;
}
