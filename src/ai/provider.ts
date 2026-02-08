import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { PROGRESS_SUMMARY_SYSTEM_PROMPT } from './prompts.js';
import type { ProgressData } from '../commands/progress-summary/types.js';

export async function generateProgressSummary(data: ProgressData): Promise<string> {
  const { text } = await generateText({
    model: google('gemini-2.5-flash'),
    system: PROGRESS_SUMMARY_SYSTEM_PROMPT,
    prompt: `Datos del periodo ${data.dateRange.from} al ${data.dateRange.to}:\n\n${JSON.stringify(data, null, 2)}`,
  });

  return text;
}
