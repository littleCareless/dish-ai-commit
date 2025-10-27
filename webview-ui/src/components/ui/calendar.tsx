import * as React from "react";
import {
  DayPicker,
  SelectRangeEventHandler,
  SelectSingleEventHandler,
  DateRange,
} from "react-day-picker";

import { cn } from "@/lib/utils";

export type CalendarProps = Omit<
  React.ComponentProps<typeof DayPicker>,
  "mode" | "onSelect" | "selected"
> & {
  mode?: "single" | "range";
  onRangeChange?: SelectRangeEventHandler;
  onDateSelect?: SelectSingleEventHandler;
  selected?: Date | DateRange | undefined;
};

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  mode = "range",
  onRangeChange,
  onDateSelect,
  selected,
  ...props
}: CalendarProps) {
  const commonProps = {
    showOutsideDays,
    className: cn("p-3 w-full", className),
    classNames: {
      // months: "flex space-y-4 w-full",
      // month: "space-y-4 w-full",
      // caption: "flex justify-center pt-1 relative items-center",
      // caption_label: "text-sm font-medium whitespace-nowrap",
      // nav: "space-x-1 flex items-center",
      // nav_button: cn(
      //   buttonVariants({ variant: "outline" }),
      //   "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
      // ),
      // nav_button_previous: "absolute left-1",
      // nav_button_next: "absolute right-1",
      // table: "w-full border-collapse space-y-1",
      // head_row: "flex w-full",
      // head_cell:
      //   "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] h-9 flex items-center justify-center",
      // row: "flex w-full mt-2",
      // cell: cn(
      //   "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
      //   "first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
      //   "[&:has([aria-selected])]:bg-accent",
      //   "[&:has([aria-selected].day-outside)]:bg-accent/50",
      //   "[&:has([aria-selected].day-range-end)]:rounded-r-md",
      //   mode === "range"
      //     ? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md"
      //     : "[&:has([aria-selected])]:rounded-md"
      // ),
      // day: cn(
      //   buttonVariants({ variant: "ghost" }),
      //   "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
      // ),
      // day_range_start: "day-range-start rounded-l-md",
      // day_range_end: "day-range-end rounded-r-md",
      // day_selected:
      //   "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
      // day_today: "bg-accent text-accent-foreground",
      // day_outside:
      //   "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
      // day_disabled: "text-muted-foreground opacity-50",
      // day_range_middle:
      //   "aria-selected:bg-accent/50 aria-selected:text-accent-foreground",
      // day_hidden: "invisible",
      ...classNames,
    },
    formatters: {
      formatCaption: (date: Date) => {
        return `${date.getFullYear()} ${(date.getMonth() + 1)
          .toString()
          .padStart(2, "0")} ${date.getDate().toString().padStart(2, "0")}`;
      },
    },
    numberOfMonths: 2,
    disabled: { after: new Date() },
    ...props,
  };

  if (mode === "range") {
    return (
      <div className="flex gap-4">
        <DayPicker
          {...commonProps}
          mode="range"
          selected={selected as DateRange | undefined}
          onSelect={onRangeChange}
          numberOfMonths={2}
        />
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      <DayPicker
        {...commonProps}
        mode="single"
        selected={selected as Date | undefined}
        onSelect={onDateSelect}
      />
    </div>
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
