import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus } from "lucide-react";
import React from "react";

interface VariablePickerProps {
  variables: { name: string; description: string }[];
  onInsert: (variableName: string) => void;
}

export const VariablePicker: React.FC<VariablePickerProps> = ({
  variables,
  onInsert,
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1">
          <Plus className="h-3.5 w-3.5" />
          <span>Insert Variable</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        {variables.map((variable) => (
          <DropdownMenuItem
            key={variable.name}
            onClick={() => onInsert(variable.name)}
            className="flex flex-col items-start gap-1"
          >
            <span className="font-medium">{`{{${variable.name}}}`}</span>
            <span className="text-xs text-muted-foreground">
              {variable.description}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
