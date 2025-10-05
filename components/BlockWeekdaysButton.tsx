"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as RangeCalendar } from "@/components/ui/calendar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DateRange } from "react-day-picker";
import { CalendarDays, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

type RangeMode = "3M" | "6M" | "12M" | "CUSTOM";

const WD = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const WD_SHORT = ["M", "D", "M", "D", "F", "S", "S"];

{/* Component zum Blocken von einzelnen Wochentagen über einene bestimmten Zeitraum */}
export function QuickBlockButton({
    username,
    onDone,
}: {
    username: string;
    onDone?: () => void;
}) {
    const [open, setOpen] = React.useState(false);

    // Wochentage
    const [days, setDays] = React.useState<number[]>([]);
    const toggleDay = (i: number) =>
        setDays(prev => {
            const set = new Set<number>(prev);
            set.has(i) ? set.delete(i) : set.add(i);
            return Array.from(set).sort((a, b) => a - b);
        });

    // Zeitraum
    const [rangeMode, setRangeMode] = React.useState<RangeMode>("6M");
    const [range, setRange] = React.useState<DateRange | undefined>();
    const [saving, setSaving] = React.useState(false);

    //Notiz
    const [note, setNote] = React.useState("");

    const pickWeekdays = () => setDays([0, 1, 2, 3, 4]);
    const pickWeekend = () => setDays([5, 6]);
    const pickAll = () => setDays([0, 1, 2, 3, 4, 5, 6]);
    const pickNone = () => setDays([]);

    const modeLabel = React.useMemo(() => {
        switch (rangeMode) {
            case "3M": return "Nächste 3 Monate";
            case "6M": return "Nächste 6 Monate";
            case "12M": return "Nächste 12 Monate";
            case "CUSTOM":
                if (range?.from && range?.to) {
                    return `${format(range.from, "dd.MM.yyyy", { locale: de })} – ${format(range.to, "dd.MM.yyyy", { locale: de })}`;
                }
                return "Benutzerdefiniert…";
        }
    }, [rangeMode, range]);

    const submit = async () => {
        if (!username || days.length === 0) return;

        const body: any = { username, weekdays: [...days].sort() };
        const trimmed = note.trim();
        if (trimmed) body.note = trimmed;

        if (rangeMode === "CUSTOM") {
            if (!range?.from || !range?.to) {
                alert("Bitte Start- und Enddatum wählen.");
                return;
            }
            body.range = {
                start: range.from.toISOString().slice(0, 10),
                end: range.to.toISOString().slice(0, 10),
            };
        } else {
            body.monthsAhead = rangeMode === "3M" ? 3 : rangeMode === "6M" ? 6 : 12;
        }

        setSaving(true);
        try {
            const res = await fetch("/api/blockDays", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error(String(res.status));

            window.dispatchEvent(new Event("calendar-refetch"));
            onDone?.();

            setOpen(false);
            setDays([]);
            setRange(undefined);
            setRangeMode("6M");
            setNote("");
        } catch (e) {
            console.error(e);
            alert("Speichern fehlgeschlagen.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Button
                variant="outline"
                onClick={() => setOpen(true)}
                size="sm"
                className="w-full text-xs sm:text-sm h-8 sm:h-9"
            >
                <span className="hidden sm:inline">Wochentag(e) blocken</span>
                <span className="sm:hidden">Wochentag(e) blocken</span>
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="w-[95vw] max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-base sm:text-lg">
                            <span className="hidden sm:inline">Wochentage blocken</span>
                            <span className="sm:hidden">Tage blocken</span>
                        </DialogTitle>
                        <DialogDescription className="text-sm">
                            <span className="hidden sm:inline">
                                Lege fest, an welchen Wochentagen du nicht kannst – dauerhaft oder innerhalb eines Zeitraums.
                            </span>
                            <span className="sm:hidden">
                                Wähle Wochentage und Zeitraum aus.
                            </span>
                        </DialogDescription>
                    </DialogHeader>

                    {/* Wochentage */}
                    <div className="space-y-2 sm:space-y-3">
                        <Label className="text-sm">Wochentage</Label>
                        <div className="space-y-3">
                            <div className="grid grid-cols-7 gap-1 sm:gap-2">
                                {WD.map((label, i) => {
                                    const active = days.includes(i);
                                    return (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => toggleDay(i)}
                                            aria-pressed={active}
                                            className={cn(
                                                "h-8 sm:h-9 rounded-md border text-xs sm:text-sm transition-colors",
                                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                                active
                                                    ? "bg-primary text-primary-foreground border-primary"
                                                    : "bg-card hover:bg-muted border-border"
                                            )}
                                        >
                                            <span className="hidden sm:inline">{label}</span>
                                            <span className="sm:hidden">{WD_SHORT[i]}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="flex flex-wrap gap-1 sm:gap-2 justify-center">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 sm:h-7 px-2 text-xs"
                                    onClick={pickWeekdays}
                                >
                                    Mo–Fr
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 sm:h-7 px-2 text-xs"
                                    onClick={pickWeekend}
                                >
                                    <span className="hidden sm:inline">Sa–So</span>
                                    <span className="sm:hidden">WE</span>
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 sm:h-7 px-2 text-xs"
                                    onClick={pickAll}
                                >
                                    Alle
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 sm:h-7 px-2 text-xs"
                                    onClick={pickNone}
                                >
                                    <span className="hidden sm:inline">Keine</span>
                                    <span className="sm:hidden">–</span>
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Zeitraum-Auswahl */}
                    <div className="space-y-2 sm:space-y-3">
                        <Label className="text-sm">Zeitraum</Label>
                        <div className="space-y-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="w-full justify-between text-xs sm:text-sm h-8 sm:h-9">
                                        <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                                            <CalendarDays className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                                            <span className="truncate">{modeLabel}</span>
                                        </div>
                                        <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 opacity-70 shrink-0" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-56">
                                    <DropdownMenuLabel className="text-xs">Voreinstellungen</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => setRangeMode("3M")} className="text-xs sm:text-sm">
                                        Nächste 3 Monate
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setRangeMode("6M")} className="text-xs sm:text-sm">
                                        Nächste 6 Monate
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setRangeMode("12M")} className="text-xs sm:text-sm">
                                        Nächste 12 Monate
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setRangeMode("CUSTOM")} className="text-xs sm:text-sm">
                                        Benutzerdefiniert…
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {rangeMode !== "CUSTOM" && (
                                <p className="text-xs text-muted-foreground text-center sm:text-left">
                                    <span className="hidden sm:inline">Ohne Range wird ab heute vorwärts gerechnet.</span>
                                    <span className="sm:hidden">Ab heute vorwärts</span>
                                </p>
                            )}
                        </div>

                        {rangeMode === "CUSTOM" && (
                            <div className="rounded-md border p-2">
                                <RangeCalendar
                                    mode="range"
                                    selected={range}
                                    onSelect={setRange}
                                    numberOfMonths={1}
                                    autoFocus
                                    locale={de}
                                    className="w-full"
                                />
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="note" className="text-xs sm:text-sm">Notiz (optional)</Label>
                        <Textarea
                            id="note"
                            rows={3}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Kurzer Hinweis …"
                            className="text-sm"
                        />
                        <p className="text-[11px] text-muted-foreground text-right">{note.length}/500</p>
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                            variant="ghost"
                            type="button"
                            onClick={() => setOpen(false)}
                            size="sm"
                            className="w-full sm:w-auto"
                        >
                            Abbrechen
                        </Button>
                        <Button
                            type="button"
                            onClick={submit}
                            disabled={saving || days.length === 0 || (rangeMode === "CUSTOM" && (!range?.from || !range?.to))}
                            size="sm"
                            className="w-full sm:w-auto"
                        >
                            {saving ? "Speichern…" : "Speichern"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}