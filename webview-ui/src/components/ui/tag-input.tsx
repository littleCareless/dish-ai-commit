import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils/cn";
import { X } from "lucide-react";
import React, { useState } from "react";

interface TagInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "value"
> {
  value: string[];
  onChange: (value: string[]) => void;
}

export const TagInput = React.forwardRef<HTMLInputElement, TagInputProps>(
  ({ value, onChange, placeholder, className, ...props }, ref) => {
    const [inputValue, setInputValue] = useState("");

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addTag();
      }
    };

    const addTag = () => {
      const newTag = inputValue.trim();
      if (newTag && !value.includes(newTag)) {
        onChange([...value, newTag]);
      }
      setInputValue("");
    };

    const removeTag = (tagToRemove: string) => {
      onChange(value.filter((tag) => tag !== tagToRemove));
    };

    return (
      <div className={cn("w-full", className)}>
        <div className="flex flex-wrap gap-2 mb-2 items-center">
          {value.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="flex items-center gap-1 pr-1 pl-2 py-1"
            >
              <span className="text-xs leading-none">{tag}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 rounded-full hover:bg-muted-foreground/20 p-0 flex items-center justify-center ml-1"
                onClick={() => removeTag(tag)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            ref={ref}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            placeholder={placeholder || "Add a tag..."}
            {...props}
          />
          <Button type="button" onClick={addTag}>
            Add
          </Button>
        </div>
      </div>
    );
  },
);

TagInput.displayName = "TagInput";
