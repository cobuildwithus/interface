"use client";

import * as React from "react";
import { ChevronDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type DateTimePickerProps = {
  label?: string;
  value: Date | undefined;
  onChange: (value: Date | undefined) => void;
  disabled?: boolean;
};

export function DateTimePicker({ label, value, onChange, disabled }: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);

  const timeValue = value
    ? `${value.getHours().toString().padStart(2, "0")}:${value.getMinutes().toString().padStart(2, "0")}`
    : "";

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      onChange(undefined);
      setOpen(false);
      return;
    }
    // Preserve existing time or default to noon
    const hours = value?.getHours() ?? 12;
    const minutes = value?.getMinutes() ?? 0;
    date.setHours(hours, minutes, 0, 0);
    onChange(date);
    setOpen(false);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = e.target.value;
    if (!time) return;

    const [h, m] = time.split(":").map(Number);
    const newDate = value ? new Date(value) : new Date();
    newDate.setHours(h, m, 0, 0);
    onChange(newDate);
  };

  return (
    <div className="flex flex-col gap-2">
      {label && <Label className="px-1">{label}</Label>}
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              disabled={disabled}
              className="flex-1 justify-between font-normal"
            >
              {value ? value.toLocaleDateString() : "Select date"}
              <ChevronDownIcon className="size-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
            <Calendar
              mode="single"
              selected={value}
              captionLayout="dropdown"
              onSelect={handleDateSelect}
            />
          </PopoverContent>
        </Popover>
        <Input
          type="time"
          value={timeValue}
          onChange={handleTimeChange}
          disabled={disabled}
          className="bg-background w-28 appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
        />
      </div>
    </div>
  );
}
