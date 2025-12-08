import { describe, it, expect } from 'vitest';
import { parseAskUserQuestion, isToolResultFor } from './parseAskUserQuestion';

describe('parseAskUserQuestion', () => {
  describe('direct format parsing', () => {
    it('should parse direct questions format', () => {
      const content = `AskUserQuestion
{
  "questions": [
    {
      "question": "Which option do you prefer?",
      "header": "Preference",
      "multiSelect": false,
      "options": [
        { "label": "Option A", "description": "First option" },
        { "label": "Option B", "description": "Second option" }
      ]
    }
  ]
}`;

      const result = parseAskUserQuestion(content);

      expect(result).not.toBeNull();
      expect(result?.questions).toHaveLength(1);
      expect(result?.questions[0].question).toBe('Which option do you prefer?');
      expect(result?.questions[0].header).toBe('Preference');
      expect(result?.questions[0].multi_select).toBe(false);
      expect(result?.questions[0].options).toHaveLength(2);
      expect(result?.questions[0].options[0].label).toBe('Option A');
      expect(result?.tool_use_id).toBeNull();
    });

    it('should parse multiSelect questions', () => {
      const content = `AskUserQuestion {"questions": [{"question": "Select all that apply", "header": "Multi", "multiSelect": true, "options": [{"label": "A", "description": "Option A"}, {"label": "B", "description": "Option B"}]}]}`;

      const result = parseAskUserQuestion(content);

      expect(result).not.toBeNull();
      expect(result?.questions[0].multi_select).toBe(true);
    });
  });

  describe('tool_use block format parsing', () => {
    it('should parse tool_use block format with id', () => {
      const content = `{
        "type": "tool_use",
        "id": "toolu_abc123",
        "name": "AskUserQuestion",
        "input": {
          "questions": [
            {
              "question": "Does this work?",
              "header": "Test",
              "multiSelect": false,
              "options": [
                { "label": "Yes", "description": "It works!" },
                { "label": "No", "description": "It does not work" }
              ]
            }
          ]
        }
      }`;

      const result = parseAskUserQuestion(content);

      expect(result).not.toBeNull();
      expect(result?.questions).toHaveLength(1);
      expect(result?.questions[0].question).toBe('Does this work?');
      expect(result?.tool_use_id).toBe('toolu_abc123');
    });

    it('should handle tool_use block without id', () => {
      const content = `{
        "type": "tool_use",
        "name": "AskUserQuestion",
        "input": {
          "questions": [
            {
              "question": "Pick one",
              "header": "Choice",
              "multiSelect": false,
              "options": [
                { "label": "A", "description": "Option A" },
                { "label": "B", "description": "Option B" }
              ]
            }
          ]
        }
      }`;

      const result = parseAskUserQuestion(content);

      expect(result).not.toBeNull();
      expect(result?.tool_use_id).toBeNull();
    });
  });

  describe('emoji prefix format parsing', () => {
    it('should parse content with emoji prefix', () => {
      const content = `🔧 Using tool: AskUserQuestion
{"questions": [{"question": "Is this working?", "header": "Status", "multiSelect": false, "options": [{"label": "Yes", "description": "Working"}, {"label": "No", "description": "Not working"}]}]}`;

      const result = parseAskUserQuestion(content);

      expect(result).not.toBeNull();
      expect(result?.questions).toHaveLength(1);
      expect(result?.questions[0].question).toBe('Is this working?');
    });

    it('should parse content with various text before JSON', () => {
      const content = `The assistant is using AskUserQuestion to gather information.
Here's the request:
{
  "questions": [{
    "question": "What do you think?",
    "header": "Feedback",
    "multiSelect": false,
    "options": [
      {"label": "Good", "description": "Looks good"},
      {"label": "Bad", "description": "Needs work"}
    ]
  }]
}`;

      const result = parseAskUserQuestion(content);

      expect(result).not.toBeNull();
      expect(result?.questions[0].question).toBe('What do you think?');
    });
  });

  describe('multiple questions', () => {
    it('should parse multiple questions', () => {
      const content = `AskUserQuestion
{
  "questions": [
    {
      "question": "First question?",
      "header": "Q1",
      "multiSelect": false,
      "options": [
        { "label": "Yes", "description": "Affirmative" },
        { "label": "No", "description": "Negative" }
      ]
    },
    {
      "question": "Second question?",
      "header": "Q2",
      "multiSelect": true,
      "options": [
        { "label": "Option 1", "description": "First" },
        { "label": "Option 2", "description": "Second" },
        { "label": "Option 3", "description": "Third" }
      ]
    }
  ]
}`;

      const result = parseAskUserQuestion(content);

      expect(result).not.toBeNull();
      expect(result?.questions).toHaveLength(2);
      expect(result?.questions[0].question).toBe('First question?');
      expect(result?.questions[1].question).toBe('Second question?');
      expect(result?.questions[1].multi_select).toBe(true);
      expect(result?.questions[1].options).toHaveLength(3);
    });
  });

  describe('invalid content handling', () => {
    it('should return null when AskUserQuestion keyword is missing', () => {
      const content = `{"questions": [{"question": "Test?", "header": "T", "multiSelect": false, "options": [{"label": "A", "description": "A"}]}]}`;

      const result = parseAskUserQuestion(content);

      expect(result).toBeNull();
    });

    it('should return null for non-JSON content', () => {
      const content = 'AskUserQuestion - this is not JSON at all';

      const result = parseAskUserQuestion(content);

      expect(result).toBeNull();
    });

    it('should return null for malformed JSON', () => {
      const content = `AskUserQuestion {"questions": [{"question": "broken`;

      const result = parseAskUserQuestion(content);

      expect(result).toBeNull();
    });

    it('should return null for empty questions array', () => {
      const content = `AskUserQuestion {"questions": []}`;

      const result = parseAskUserQuestion(content);

      expect(result).toBeNull();
    });

    it('should return null when questions field is missing', () => {
      const content = `AskUserQuestion {"data": "something else"}`;

      const result = parseAskUserQuestion(content);

      expect(result).toBeNull();
    });

    it('should return null for questions without required fields', () => {
      const content = `AskUserQuestion {"questions": [{"header": "Missing question field", "options": []}]}`;

      const result = parseAskUserQuestion(content);

      expect(result).toBeNull();
    });

    it('should return null for questions without options', () => {
      const content = `AskUserQuestion {"questions": [{"question": "No options?", "header": "Test", "multiSelect": false, "options": []}]}`;

      const result = parseAskUserQuestion(content);

      expect(result).toBeNull();
    });

    it('should return null for options without labels', () => {
      const content = `AskUserQuestion {"questions": [{"question": "Test?", "header": "T", "multiSelect": false, "options": [{"description": "Missing label"}]}]}`;

      const result = parseAskUserQuestion(content);

      expect(result).toBeNull();
    });

    it('should return null for wrong tool_use name', () => {
      const content = `{
        "type": "tool_use",
        "name": "SomeOtherTool",
        "input": {
          "questions": [{"question": "Test?", "header": "T", "multiSelect": false, "options": [{"label": "A", "description": "A"}]}]
        }
      }`;

      const result = parseAskUserQuestion(content);

      expect(result).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle missing optional fields with defaults', () => {
      const content = `AskUserQuestion {"questions": [{"question": "Test?", "options": [{"label": "A", "description": "A"}]}]}`;

      const result = parseAskUserQuestion(content);

      expect(result).not.toBeNull();
      expect(result?.questions[0].header).toBe('');
      expect(result?.questions[0].multi_select).toBe(false);
    });

    it('should handle empty description in options', () => {
      const content = `AskUserQuestion {"questions": [{"question": "Test?", "header": "T", "multiSelect": false, "options": [{"label": "A"}]}]}`;

      const result = parseAskUserQuestion(content);

      expect(result).not.toBeNull();
      expect(result?.questions[0].options[0].description).toBe('');
    });

    it('should filter out invalid questions while keeping valid ones', () => {
      const content = `AskUserQuestion {
        "questions": [
          {"question": "", "header": "Invalid", "multiSelect": false, "options": [{"label": "A", "description": "A"}]},
          {"question": "Valid?", "header": "Valid", "multiSelect": false, "options": [{"label": "Yes", "description": "Y"}]}
        ]
      }`;

      const result = parseAskUserQuestion(content);

      expect(result).not.toBeNull();
      expect(result?.questions).toHaveLength(1);
      expect(result?.questions[0].question).toBe('Valid?');
    });
  });
});

describe('isToolResultFor', () => {
  it('should return true for matching tool_result', () => {
    const content = `{"type": "tool_result", "tool_use_id": "toolu_abc123", "content": "User selected: Yes"}`;

    const result = isToolResultFor(content, 'toolu_abc123');

    expect(result).toBe(true);
  });

  it('should return false for non-matching tool_use_id', () => {
    const content = `{"type": "tool_result", "tool_use_id": "toolu_abc123", "content": "User selected: Yes"}`;

    const result = isToolResultFor(content, 'toolu_different');

    expect(result).toBe(false);
  });

  it('should return false when tool_result keyword is missing', () => {
    const content = `{"type": "message", "content": "Something else"}`;

    const result = isToolResultFor(content, 'toolu_abc123');

    expect(result).toBe(false);
  });

  it('should return false for non-JSON content', () => {
    const content = `This mentions tool_result but is not JSON`;

    const result = isToolResultFor(content, 'toolu_abc123');

    expect(result).toBe(false);
  });

  it('should handle array of content blocks', () => {
    const content = `[
      {"type": "text", "text": "Some text"},
      {"type": "tool_result", "tool_use_id": "toolu_abc123", "content": "Answer"}
    ]`;

    const result = isToolResultFor(content, 'toolu_abc123');

    expect(result).toBe(true);
  });

  it('should return false for array without matching tool_result', () => {
    const content = `[
      {"type": "text", "text": "Some text"},
      {"type": "tool_result", "tool_use_id": "toolu_other", "content": "Answer"}
    ]`;

    const result = isToolResultFor(content, 'toolu_abc123');

    expect(result).toBe(false);
  });
});
