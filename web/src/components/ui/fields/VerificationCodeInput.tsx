import React, { useState, useRef, useEffect } from 'react';

interface VerificationCodeInputProps {
  length?: number;
  onComplete: (code: string) => void;
  disabled?: boolean;
  error?: boolean;
  initialValue?: string;
}

const VerificationCodeInput: React.FC<VerificationCodeInputProps> = ({
  length = 6,
  onComplete,
  disabled = false,
  error = false,
  initialValue = '',
}) => {
  const [values, setValues] = useState<string[]>(new Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>(
    new Array(length).fill(null),
  );

  // Initialize with pre-filled value if provided
  useEffect(() => {
    if (initialValue && initialValue.length === length) {
      const newValues = initialValue.split('');
      setValues(newValues);
      onComplete(initialValue);
    }
  }, [initialValue, length, onComplete]);

  // Auto-focus first input on mount (if no initial value)
  useEffect(() => {
    if (!initialValue && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [initialValue]);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^[0-9]$/.test(value)) {
      return;
    }

    const newValues = [...values];
    newValues[index] = value;
    setValues(newValues);

    // Auto-advance to next input
    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if all fields are filled
    if (newValues.every((v) => v !== '')) {
      onComplete(newValues.join(''));
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    // Handle backspace
    if (e.key === 'Backspace') {
      if (!values[index] && index > 0) {
        // If current field is empty, move to previous field and clear it
        const newValues = [...values];
        newValues[index - 1] = '';
        setValues(newValues);
        inputRefs.current[index - 1]?.focus();
      } else if (values[index]) {
        // If current field has value, just clear it
        const newValues = [...values];
        newValues[index] = '';
        setValues(newValues);
      }
    }

    // Handle arrow keys
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Handle Enter key to submit if all fields are filled
    if (e.key === 'Enter' && values.every((v) => v !== '')) {
      onComplete(values.join(''));
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData('text/plain')
      .replace(/\\D/g, '')
      .slice(0, length);

    if (pastedData.length === length) {
      const newValues = pastedData.split('');
      setValues(newValues);
      onComplete(pastedData);

      // Focus the last input
      inputRefs.current[length - 1]?.focus();
    }
  };

  const handleFocus = (index: number) => {
    // Select all text when focusing
    inputRefs.current[index]?.select();
  };

  return (
    <div className="flex justify-center gap-3">
      {values.map((value, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={value}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={() => handleFocus(index)}
          disabled={disabled}
          className={`
            h-12 w-12 text-center text-xl font-mono font-semibold
            border-2 rounded-lg
            transition-all duration-200
            ${
              error
                ? 'border-red-400 bg-red-50 dark:border-red-500 dark:bg-red-900/20'
                : 'border-gray-300 dark:border-navy-600'
            }
            ${
              !disabled && !error
                ? 'focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 hover:border-brand-400'
                : ''
            }
            ${
              disabled
                ? 'bg-gray-100 cursor-not-allowed opacity-50 dark:bg-navy-dark'
                : 'bg-white dark:bg-navy-700'
            }
            text-navy-700 dark:text-white
            placeholder-gray-400 dark:placeholder-gray-500
            outline-none
          `}
          placeholder=""
          autoComplete="off"
        />
      ))}
    </div>
  );
};

export default VerificationCodeInput;
