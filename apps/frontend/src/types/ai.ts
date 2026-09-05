// AI generation types — mirror backend `src/ai` DTOs.

export interface GenerateJobDescriptionRequest {
  title: string
  department?: string
  location?: string
}

export interface GeneratedJobDescription {
  description: string
  requirements: string
  mustHaveSkills: string[]
}
