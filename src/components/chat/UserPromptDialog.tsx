import { useState, useCallback } from 'react';
import { MessageSquareMore, Check, ChevronRight } from 'lucide-react';
import type { UserPrompt, UserQuestion, QuestionOption } from '../../api/sessionWatcher';

interface UserPromptDialogProps {
  prompt: UserPrompt;
  onSubmit: (answers: Record<string, string | string[]>) => void;
  onCancel?: () => void;
  disabled?: boolean;
}

interface QuestionCardProps {
  question: UserQuestion;
  selectedValues: string[];
  onSelect: (values: string[]) => void;
  showOther: boolean;
  otherValue: string;
  onOtherChange: (value: string) => void;
  onToggleOther: () => void;
}

function QuestionCard({
  question,
  selectedValues,
  onSelect,
  showOther,
  otherValue,
  onOtherChange,
  onToggleOther,
}: QuestionCardProps) {
  const handleOptionClick = (option: QuestionOption) => {
    if (question.multi_select) {
      // Multi-select: toggle the option
      if (selectedValues.includes(option.label)) {
        onSelect(selectedValues.filter(v => v !== option.label));
      } else {
        onSelect([...selectedValues, option.label]);
      }
    } else {
      // Single-select: replace selection
      onSelect([option.label]);
    }
  };

  return (
    <div className="space-y-3">
      {/* Question Header */}
      <div className="flex items-center gap-2">
        <span className="badge badge-primary badge-sm">{question.header}</span>
        {question.multi_select && (
          <span className="text-xs text-base-content/50">(select multiple)</span>
        )}
      </div>

      {/* Question Text */}
      <p className="text-sm font-medium">{question.question}</p>

      {/* Options */}
      <div className="space-y-2">
        {question.options.map((option, optionIndex) => {
          const isSelected = selectedValues.includes(option.label);
          return (
            <button
              key={optionIndex}
              onClick={() => handleOptionClick(option)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                isSelected
                  ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                  : 'border-base-300 hover:border-primary/50 hover:bg-base-200'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Selection indicator */}
                <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                  isSelected
                    ? 'border-primary bg-primary text-primary-content'
                    : 'border-base-content/30'
                }`}>
                  {isSelected && <Check className="w-3 h-3" />}
                </div>

                {/* Option content */}
                <div className="flex-1">
                  <div className="font-medium text-sm">{option.label}</div>
                  <div className="text-xs text-base-content/60 mt-0.5">
                    {option.description}
                  </div>
                </div>
              </div>
            </button>
          );
        })}

        {/* Other option */}
        <button
          onClick={onToggleOther}
          className={`w-full text-left p-3 rounded-lg border transition-all ${
            showOther
              ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
              : 'border-base-300 hover:border-primary/50 hover:bg-base-200'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
              showOther
                ? 'border-primary bg-primary text-primary-content'
                : 'border-base-content/30'
            }`}>
              {showOther && <Check className="w-3 h-3" />}
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm">Other</div>
              <div className="text-xs text-base-content/60 mt-0.5">
                Provide a custom response
              </div>
            </div>
          </div>
        </button>

        {/* Other input field */}
        {showOther && (
          <textarea
            value={otherValue}
            onChange={(e) => onOtherChange(e.target.value)}
            placeholder="Enter your custom response..."
            className="textarea textarea-bordered w-full mt-2"
            rows={3}
            autoFocus
          />
        )}
      </div>
    </div>
  );
}

export default function UserPromptDialog({
  prompt,
  onSubmit,
  onCancel,
  disabled = false,
}: UserPromptDialogProps) {
  // State for each question's selected values
  const [answers, setAnswers] = useState<Record<number, string[]>>(() => {
    const initial: Record<number, string[]> = {};
    prompt.questions.forEach((_, idx) => {
      initial[idx] = [];
    });
    return initial;
  });

  // State for "Other" selections
  const [showOther, setShowOther] = useState<Record<number, boolean>>({});
  const [otherValues, setOtherValues] = useState<Record<number, string>>({});

  const handleSelect = useCallback((questionIndex: number, values: string[]) => {
    setAnswers(prev => ({ ...prev, [questionIndex]: values }));
    // If selecting a preset option, hide "Other"
    if (values.length > 0) {
      setShowOther(prev => ({ ...prev, [questionIndex]: false }));
    }
  }, []);

  const handleToggleOther = useCallback((questionIndex: number) => {
    setShowOther(prev => {
      const newValue = !prev[questionIndex];
      // If showing "Other", clear preset selections
      if (newValue) {
        setAnswers(prevAnswers => ({ ...prevAnswers, [questionIndex]: [] }));
      }
      return { ...prev, [questionIndex]: newValue };
    });
  }, []);

  const handleOtherChange = useCallback((questionIndex: number, value: string) => {
    setOtherValues(prev => ({ ...prev, [questionIndex]: value }));
  }, []);

  const handleSubmit = useCallback(() => {
    // Build the answers object
    const result: Record<string, string | string[]> = {};

    prompt.questions.forEach((question, idx) => {
      const key = question.header || `question_${idx}`;

      if (showOther[idx] && otherValues[idx]) {
        // User selected "Other" and provided custom input
        result[key] = otherValues[idx];
      } else if (answers[idx] && answers[idx].length > 0) {
        // User selected preset options
        if (question.multi_select) {
          result[key] = answers[idx];
        } else {
          result[key] = answers[idx][0];
        }
      }
    });

    onSubmit(result);
  }, [prompt.questions, answers, showOther, otherValues, onSubmit]);

  // Check if all questions have been answered
  const isComplete = prompt.questions.every((_, idx) => {
    return (answers[idx] && answers[idx].length > 0) ||
           (showOther[idx] && otherValues[idx]?.trim());
  });

  return (
    <div className="bg-base-100 border border-info/30 rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-info/10 border-b border-info/20 px-4 py-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-info/20 flex items-center justify-center">
          <MessageSquareMore className="w-5 h-5 text-info" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Claude needs your input</h3>
          <p className="text-xs text-base-content/60">
            Please answer the following {prompt.questions.length === 1 ? 'question' : 'questions'}
          </p>
        </div>
      </div>

      {/* Questions */}
      <div className="p-4 space-y-6">
        {prompt.questions.map((question, idx) => (
          <QuestionCard
            key={idx}
            question={question}
            selectedValues={answers[idx] || []}
            onSelect={(values) => handleSelect(idx, values)}
            showOther={showOther[idx] || false}
            otherValue={otherValues[idx] || ''}
            onOtherChange={(value) => handleOtherChange(idx, value)}
            onToggleOther={() => handleToggleOther(idx)}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="border-t border-base-300 px-4 py-3 flex justify-end gap-2">
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={disabled}
            className="btn btn-ghost btn-sm"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={disabled || !isComplete}
          className="btn btn-primary btn-sm gap-2"
        >
          Submit
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
