// OpenAI-compatible tool (function) schemas advertised to the model. Groq's
// chat-completions endpoint is OpenAI-compatible, so this shape is passed
// straight through as the `tools` field.

export const AGENT_TOOL_SCHEMAS = [
  {
    type: 'function',
    function: {
      name: 'search_candidates',
      description:
        'Search applications (candidates who applied to jobs) for the current company, with optional filters. Returns a page of matching candidates plus a total count.',
      parameters: {
        type: 'object',
        properties: {
          q: { type: 'string', description: 'Free-text search on candidate name or email' },
          job_id: { type: 'string', description: 'Restrict to one job (UUID)' },
          stage: {
            type: 'string',
            enum: ['APPLIED', 'SCREENED', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED'],
            description: 'Restrict to a single pipeline stage',
          },
          score_min: { type: 'number', description: 'Minimum AI fit score (0-100)' },
          score_max: { type: 'number', description: 'Maximum AI fit score (0-100)' },
          page: { type: 'number', description: 'Page number, 1-indexed. Defaults to 1.' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_pipeline',
      description:
        'Get the full hiring pipeline board for one job: how many candidates are in each stage (APPLIED, SCREENED, INTERVIEW, OFFER, HIRED, REJECTED) with a short list of candidates per stage.',
      parameters: {
        type: 'object',
        properties: {
          job_id: { type: 'string', description: 'The job UUID to get the pipeline for' },
        },
        required: ['job_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_candidate',
      description:
        'Get full detail on one candidate application: name, email, phone, current stage, AI fit score, and a resume excerpt.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The application UUID (identifies the candidate + their application)' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'move_stage',
      description:
        'Move a candidate to a different pipeline stage. This is a WRITE action and requires explicit user confirmation before it executes.',
      parameters: {
        type: 'object',
        properties: {
          candidate_id: { type: 'string', description: 'The application UUID to move' },
          stage: {
            type: 'string',
            enum: ['APPLIED', 'SCREENED', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED'],
            description: 'The pipeline stage to move the candidate to',
          },
        },
        required: ['candidate_id', 'stage'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'draft_outreach',
      description:
        'Draft an outreach email (subject + body) to a candidate, written in the requested tone. Does not send anything — the recruiter reviews and sends it manually.',
      parameters: {
        type: 'object',
        properties: {
          candidate_id: { type: 'string', description: 'The application UUID to draft outreach for' },
          tone: {
            type: 'string',
            enum: ['friendly', 'formal', 'urgent'],
            description: 'Tone of the outreach message',
          },
        },
        required: ['candidate_id', 'tone'],
      },
    },
  },
] as const;

export const AGENT_SYSTEM_PROMPT = [
  "You are HireFlow's recruiter copilot. You help a recruiter search candidates, inspect the hiring pipeline, and draft outreach — all for the company they're signed in as.",
  'Rules:',
  '- Never state a candidate name, email, score, or pipeline count unless it came from a tool result in this conversation. If you have not called a tool yet for a factual question, call one first.',
  '- Use search_candidates or get_pipeline to find candidates before calling get_candidate, move_stage, or draft_outreach — those need a specific application id.',
  '- When the user asks you to move/change a candidate\'s stage, you MUST call the move_stage tool immediately with the candidate_id and stage — do NOT ask the user to confirm in your own words instead of calling it. The system pauses and asks the human to confirm automatically as soon as you call move_stage; asking in plain text instead of calling the tool skips that safety mechanism entirely, so it is never acceptable.',
  '- If the human declines a move_stage confirmation, acknowledge that in one short sentence and stop — do not retry the same move or call it again.',
  '- Keep your final answers short and concrete: name the candidates/numbers you found, not generic filler.',
].join('\n');

// Present-tense labels the side panel shows the instant a tool call starts
// (before the result is known) — e.g. "Searching candidates…".
export const TOOL_CALL_LABELS: Record<string, string> = {
  search_candidates: 'Searching candidates…',
  get_pipeline: 'Reading pipeline…',
  get_candidate: 'Looking up candidate…',
  move_stage: 'Moving candidate stage…',
  draft_outreach: 'Drafting outreach…',
};

export const AGENT_MAX_ITERATIONS = 6;

