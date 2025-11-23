import React from "react";

interface SliderProps {
  value?: number | number[];
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onValueChange?: (value: number[]) => void;
  className?: string;
}

const Slider: React.FC<SliderProps> = ({
  value = 0,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  onChange,
  onValueChange,
  className,
  ...props
}) => {
  // 如果 value 是数组，取第一个值；否则直接使用
  const numericValue = Array.isArray(value) ? value[0] || 0 : value;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(event.target.value);

    // 如果提供了 onValueChange，使用它
    if (onValueChange) {
      onValueChange([newValue]);
    }

    // 也调用原始的 onChange（如果提供了）
    if (onChange) {
      onChange(event);
    }
  };

  return (
    <input
      type="range"
      value={numericValue}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onChange={handleChange}
      className={className}
      {...props}
    />
  );
};

export { Slider };
