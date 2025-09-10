import React, { useRef, useState, useLayoutEffect } from 'react';

interface TextAreaFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  required?: boolean;
  placeholder?: string;
  rows?: number;
  className?: string;
  readOnly?: boolean;
  onAutoCorrect?: (text: string) => Promise<string>;
}

/**
 * Reformats a given string into a numbered list.
 * - Adds a number (e.g., '1. ') to non-empty lines.
 * - Strips any pre-existing numbering or common bullet points.
 * - Preserves empty lines for spacing.
 */
const reformatTextToNumberedList = (text: string): string => {
  if (!text) return '';
  const lines = text.split('\n');
  let counter = 1;
  const numberedLines = lines.map(line => {
    if (line.trim().length === 0) {
        return ""; // Keep empty lines for spacing
    }
    // Strip existing numbering/bullets (e.g., "1.", "*", "-") and trim whitespace
    const content = line.trim().replace(/^(\d+\.|\*|-)\s*/, '');
    return `${counter++}. ${content}`;
  });
  return numberedLines.join('\n');
};


const TextAreaField: React.FC<TextAreaFieldProps> = ({
  label,
  name,
  value,
  onChange,
  required = false,
  placeholder = '',
  rows = 4,
  className = 'md:col-span-2',
  readOnly = false,
  onAutoCorrect,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);
  const [isCorrecting, setIsCorrecting] = useState(false);

  useLayoutEffect(() => {
    // This effect runs after the DOM has been updated.
    // If we have a cursor position to set, we set it here.
    if (textareaRef.current && cursorPosition !== null) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(cursorPosition, cursorPosition);
      // Reset the cursor position so it doesn't get set again on the next render
      setCursorPosition(null);
    }
  }, [value, cursorPosition]);

  const triggerChange = (e: React.SyntheticEvent<HTMLTextAreaElement>, newValue: string) => {
      // Create a synthetic event to pass to the parent's onChange handler
      const syntheticEvent = {
        ...e,
        currentTarget: {
          ...e.currentTarget,
          value: newValue,
        },
        target: {
            ...e.target,
            name: name, // Ensure name is passed correctly
            value: newValue,
        }
      } as unknown as React.ChangeEvent<HTMLTextAreaElement>;
      onChange(syntheticEvent);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();

      const { value: currentValue, selectionStart } = e.currentTarget;

      // 1. Count how many lines are before the cursor in the original text.
      const textBeforeCursor = currentValue.substring(0, selectionStart);
      const linesBeforeCursor = textBeforeCursor.split('\n');
      const currentLineIndex = linesBeforeCursor.length - 1;
      
      // 2. Insert a newline character at the cursor's position to simulate the 'Enter' press.
      const textWithNewline = 
        currentValue.substring(0, selectionStart) + 
        '\n' + 
        currentValue.substring(selectionStart);
      
      // 3. Reformat the entire text with the new line included.
      const finalValue = reformatTextToNumberedList(textWithNewline);
      const finalLines = finalValue.split('\n');

      // 4. Calculate the new cursor position. It should be on the line AFTER where we were.
      const targetLineIndex = currentLineIndex + 1;
      
      if (finalLines.length > targetLineIndex) {
        // Sum the length of all lines before our target line, plus 1 for each newline character.
        let newCursorPos = 0;
        for (let i = 0; i < targetLineIndex; i++) {
          newCursorPos += finalLines[i].length + 1; // +1 for the '\n'
        }
        
        // Find the number prefix on our target line (e.g., "1. ", "10. ")
        const targetLine = finalLines[targetLineIndex];
        const prefixMatch = targetLine.match(/^\d+\.\s*/);
        
        if (prefixMatch) {
          // Add the length of the prefix to position the cursor right after it.
          newCursorPos += prefixMatch[0].length;
        }

        // Set the state that will trigger the layout effect to move the cursor.
        setCursorPosition(newCursorPos);
      } else {
        // Fallback: if something goes wrong, just move the cursor to the end.
        setCursorPosition(finalValue.length);
      }
      
      // Trigger the state update for the textarea's value.
      triggerChange(e, finalValue);
    }
  };

  const handleBlur = async (e: React.FocusEvent<HTMLTextAreaElement>) => {
    const currentValue = e.currentTarget.value;
    const formattedValue = reformatTextToNumberedList(currentValue);

    if (onAutoCorrect && !readOnly && formattedValue.trim().length > 0) {
      setIsCorrecting(true);
      try {
        const correctedValue = await onAutoCorrect(formattedValue);
        // Only trigger a change if the corrected text is different
        if (currentValue !== correctedValue) {
            triggerChange(e, correctedValue);
        }
      } catch (error) {
        console.error("Autocorrect failed:", error);
        // Fallback to just formatting if autocorrect fails
        if (currentValue !== formattedValue) {
            triggerChange(e, formattedValue);
        }
      } finally {
        setIsCorrecting(false);
      }
    } else {
      // If autoCorrect is off or field is readonly, just do the formatting
      if (currentValue !== formattedValue) {
          triggerChange(e, formattedValue);
      }
    }
  };

  return (
    <div className={className}>
       <div className="flex items-center justify-between mb-1">
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {onAutoCorrect && !readOnly && (
          <div className="flex items-center text-xs text-gray-500" aria-live="polite">
            {isCorrecting ? (
              <>
                <svg className="animate-spin -ml-1 mr-1.5 h-4 w-4 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Correcting...</span>
              </>
            ) : (
                <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    <span>AI Autocorrect</span>
                </div>
            )}
          </div>
        )}
      </div>
      <textarea
        ref={textareaRef}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        onKeyDown={!readOnly ? handleKeyDown : undefined}
        onBlur={!readOnly ? handleBlur : undefined}
        required={required}
        placeholder={placeholder}
        rows={rows}
        readOnly={readOnly}
        className={`w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out ${readOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
      />
    </div>
  );
};

export default TextAreaField;