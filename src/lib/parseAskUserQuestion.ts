import type { UserPrompt, UserQuestion } from '../api/sessionWatcher';

/**
 * Parse AskUserQuestion tool use from message content.
 *
 * Handles multiple formats:
 * 1. Direct format: { "questions": [...] }
 * 2. Tool use block format: { "type": "tool_use", "name": "AskUserQuestion", "input": { "questions": [...] } }
 * 3. Content with prefix: "🔧 Using tool: AskUserQuestion\n{...}"
 *
 * @param content - The message content to parse
 * @returns UserPrompt if found, null otherwise
 */
export function parseAskUserQuestion(content: string): UserPrompt | null {
  // Quick check if content mentions AskUserQuestion
  if (!content.includes('AskUserQuestion')) {
    return null;
  }

  try {
    // Find JSON in the content (after any prefix like "Using tool: AskUserQuestion")
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // The format could be:
    // 1. Direct questions array: { "questions": [...] }
    // 2. tool_use block: { "type": "tool_use", "name": "AskUserQuestion", "input": { "questions": [...] } }

    let questionsData: any[] | null = null;
    let toolUseId: string | null = null;

    if (parsed.questions && Array.isArray(parsed.questions)) {
      // Direct format: { "questions": [...] }
      questionsData = parsed.questions;
    } else if (parsed.type === 'tool_use' && parsed.name === 'AskUserQuestion' && parsed.input?.questions) {
      // tool_use block format
      questionsData = parsed.input.questions;
      toolUseId = parsed.id || null;
    }

    if (!questionsData || questionsData.length === 0) {
      return null;
    }

    const questions: UserQuestion[] = questionsData.map((q: any) => ({
      question: q.question || '',
      header: q.header || '',
      multi_select: q.multiSelect || false,
      options: (q.options || []).map((o: any) => ({
        label: o.label || '',
        description: o.description || ''
      }))
    }));

    // Validate that we have valid questions with options
    const validQuestions = questions.filter(
      q => q.question && q.options.length > 0 && q.options.every(o => o.label)
    );

    if (validQuestions.length === 0) {
      return null;
    }

    return {
      questions: validQuestions,
      tool_use_id: toolUseId
    };
  } catch {
    return null;
  }
}

/**
 * Check if a message content appears to be an AskUserQuestion that's been answered.
 * Tool results follow the format: { "type": "tool_result", "tool_use_id": "..." }
 */
export function isToolResultFor(content: string, toolUseId: string): boolean {
  if (!content.includes('tool_result')) {
    return false;
  }

  try {
    // Match either an object {} or an array []
    const jsonMatch = content.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (!jsonMatch) {
      return false;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Check for direct tool_result
    if (parsed.type === 'tool_result' && parsed.tool_use_id === toolUseId) {
      return true;
    }

    // Check for array of content blocks
    if (Array.isArray(parsed)) {
      return parsed.some(
        block => block.type === 'tool_result' && block.tool_use_id === toolUseId
      );
    }

    return false;
  } catch {
    return false;
  }
}
