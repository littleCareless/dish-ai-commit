import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarDays, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import {
  startOfWeek,
  endOfWeek,
  subWeeks,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
} from "date-fns";

interface DateRangeSelectorProps {
  onRangeChange: (range: DateRange) => void;
}

export function DateRangeSelector({ onRangeChange }: DateRangeSelectorProps) {
  const [date, setDate] = useState<DateRange>({
    from: new Date(),
    to: new Date(),
  });

  const setStartOfDay = (date: Date): Date => {
    return setMilliseconds(setSeconds(setMinutes(setHours(date, 0), 0), 0), 0);
  };

  const setEndOfDay = (date: Date): Date => {
    return setMilliseconds(
      setSeconds(setMinutes(setHours(date, 23), 59), 59),
      999
    );
  };

  const getWeekRange = (option: "current" | "last" | "lastTwo"): DateRange => {
    const now = new Date();

    switch (option) {
      case "current": {
        // 本周一到本周日
        const start = startOfWeek(now, { weekStartsOn: 1 }); // 1 表示周一
        const end = endOfWeek(now, { weekStartsOn: 1 });
        return {
          from: setStartOfDay(start),
          to: setEndOfDay(end),
        };
      }
      case "last": {
        // 上周一到上周日
        const lastWeek = subWeeks(now, 1);
        const start = startOfWeek(lastWeek, { weekStartsOn: 1 });
        const end = endOfWeek(lastWeek, { weekStartsOn: 1 });
        return {
          from: setStartOfDay(start),
          to: setEndOfDay(end),
        };
      }
      case "lastTwo": {
        // 上上周一到上周日（连续两周）
        const twoWeeksAgo = subWeeks(now, 2);
        const start = startOfWeek(twoWeeksAgo, { weekStartsOn: 1 });
        const lastWeek = subWeeks(now, 1);
        const end = endOfWeek(lastWeek, { weekStartsOn: 1 });
        return {
          from: setStartOfDay(start),
          to: setEndOfDay(end),
        };
      }
      default:
        throw new Error("Invalid option");
    }
  };

  const handlePresetClick = (option: "current" | "last" | "lastTwo") => {
    const range = getWeekRange(option);
    setDate(range);
    onRangeChange(range);
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => handlePresetClick("current")}
          className="flex-1 sm:flex-none"
        >
          本周
        </Button>
        <Button
          variant="outline"
          onClick={() => handlePresetClick("last")}
          className="flex-1 sm:flex-none"
        >
          上周
        </Button>
        <Button
          variant="outline"
          onClick={() => handlePresetClick("lastTwo")}
          className="flex-1 sm:flex-none"
        >
          前两周
        </Button>
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-start text-left font-normal w-full sm:w-[300px]",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarDays className="w-4 h-4 mr-2" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
            <ChevronDown className="w-4 h-4 ml-auto opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0"
          align="start"
        >
          <Calendar
            mode="range"
            selected={date}
            onRangeChange={(range: DateRange | undefined) => {
              if (range) {
                setDate(range);
                onRangeChange(range);
              }
            }}
            numberOfMonths={2}
            defaultMonth={date?.from}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
