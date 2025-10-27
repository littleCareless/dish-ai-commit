import React from "react";

interface SliderProps {
  value?: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}

const Slider: React.FC<SliderProps> = ({ 
  value = 0,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  onChange,
  className,
  ...props 
}) => {
  return (
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onChange={onChange}
      className={className}
      {...props}
    />
  );
};

export { Slider };