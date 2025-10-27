import React from "react";

interface LabelProps {
  children: React.ReactNode;
  htmlFor?: string;
  ref?: React.Ref<HTMLLabelElement>;
  className?: string;
}

const Label: React.FC<LabelProps> = ({ children, htmlFor, ref, ...props }) => {
  return (
    <label htmlFor={htmlFor} ref={ref} {...props}>
      {children}
    </label>
  );
};

export { Label };