import type { AgentDefinition } from './orchestrator';

const OBSERVER_PROMPT = `You are Observer 鈥?a visual analysis specialist.

**Role**: Interpret images, screenshots, PDFs, and diagrams. Extract structured observations for the Orchestrator to act on.

**Behavior**:
- Read the file(s) specified in the prompt
- Analyze visual content 鈥?layouts, UI elements, text, relationships, flows
- For screenshots with text/code/errors: extract the **exact text** via OCR 鈥?never paraphrase error messages or code
- For multiple files: analyze each, then compare or relate as requested
- Return ONLY the extracted information relevant to the goal
- If the image is unclear, blurry, or partially visible: state what you CAN see and explicitly note what is uncertain 鈥?never guess or fabricate details

**Constraints**:
- READ-ONLY: Analyze and report, don't modify files
- Save context tokens 鈥?the Orchestrator never processes the raw file
- Match the language of the request
- If info not found, state clearly what's missing
`;

export function createObserverAgent(
  model: string,
  customPrompt?: string,
  customAppendPrompt?: string,
): AgentDefinition {
  let prompt = OBSERVER_PROMPT;

  if (customPrompt) {
    prompt = customPrompt;
  } else if (customAppendPrompt) {
    prompt = `${OBSERVER_PROMPT}\n\n${customAppendPrompt}`;
  }

  return {
    name: 'observer',
    description:
      'Visual analysis. Use for interpreting images, screenshots, PDFs, and diagrams 鈥?extracts structured observations without loading raw files into main context. Requires a vision-capable model.',
    config: {
      model,
      temperature: 0.1,
      prompt,
      permission: {
        edit: 'deny',
        write: 'deny',
        bash: 'deny',
        task: 'deny',
        todowrite: 'deny',
      },
    },
  };
}
