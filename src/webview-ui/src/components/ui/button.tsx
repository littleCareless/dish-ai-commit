import React from "react";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import { cn } from "@/lib/utils";

interface ButtonProps {
  children: React.ReactNode;
  disabled?: boolean;
  appearance?: 'primary' | 'secondary' | 'icon';
  onClick?: () => void;
  size?: 'small' | 'medium' | 'large' | 'sm' | 'icon';
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'default';
  className?: string;
  title?: string;
  ref?: React.Ref<HTMLButtonElement>;
}

interface ButtonVariantsProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const buttonVariants = ({ variant = 'default', size = 'default' }: ButtonVariantsProps = {}) => {
  const baseClasses = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
  
  const variantClasses = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    link: "text-primary underline-offset-4 hover:underline",
  };
  
  const sizeClasses = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    lg: "h-11 rounded-md px-8",
    icon: "h-10 w-10",
  };
  
  return cn(baseClasses, variantClasses[variant], sizeClasses[size]);
};

const Button: React.FC<ButtonProps> = ({ 
  children, 
  disabled = false,
  appearance = 'primary',
  onClick,
  size,
  variant,
  className,
  title,
  ref,
  ...props 
}) => {
  // Map variant to appearance if provided
  const finalAppearance = variant === 'outline' ? 'secondary' : 
                         variant === 'ghost' ? 'secondary' :
                         variant === 'destructive' ? 'primary' :
                         variant === 'default' ? 'primary' :
                         appearance;

  // Map size values (currently not used in VSCodeButton)
  // const finalSize = size === 'sm' ? 'small' : 
  //                  size === 'icon' ? 'small' :
  //                  size;

  return (
    <VSCodeButton
      appearance={finalAppearance}
      disabled={disabled}
      onClick={onClick}
      className={className}
      title={title}
      ref={ref}
      {...props}
    >
      {children}
    </VSCodeButton>
  );
};

export { Button, buttonVariants };
export type { ButtonProps, ButtonVariantsProps };