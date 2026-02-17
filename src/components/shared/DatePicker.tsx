"use client";

import * as React from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerProps {
    date?: Date;
    onSelect: (date: Date) => void;
    placeholder?: string;
    className?: string;
}

export function DatePicker({
    date,
    onSelect,
    placeholder = "Pilih tanggal",
    className,
}: DatePickerProps) {
    const [open, setOpen] = React.useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen} modal={false}>
            <PopoverTrigger asChild>
                <Button
                    variant="date"
                    className={cn(
                        "w-full justify-between text-left font-normal bg-white text-black active:scale-100 transition-none",
                        !date && "text-muted-foreground",
                        className
                    )}
                >
                    {date ? format(date, "dd/MM/yyyy") : <span>{placeholder}</span>}
                    <CalendarIcon className="h-4 w-4 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-white" align="start">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => {
                        if (d) {
                            onSelect(d);
                            setOpen(false);
                        }
                    }}
                    initialFocus
                    locale={id}
                />
            </PopoverContent>
        </Popover>
    );
}
