"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useParams } from "next/navigation";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import CircularProgress from '@mui/material/CircularProgress';

type AvailabilityStatus = "AVAILABLE" | "MAYBE" | "UNAVAILABLE";
type SimpleUser = {
    id: number;
    username: string;
    status: AvailabilityStatus;
    avatarUrl?: string | null;
    comment?: string | null;
};

type CountsByStatus = Record<AvailabilityStatus, number>;

interface CalendarDay {
    day: number;
    isCurrentMonth: boolean;
    isPrevMonth: boolean;
}

/* ===== Helpers ===== */
const toKey = (y: number, mZero: number, d: number) =>
    new Date(Date.UTC(y, mZero, d)).toISOString().slice(0, 10);

const statusLabel: Record<AvailabilityStatus, string> = {
    AVAILABLE: "Hab Zeit",
    MAYBE: "Vielleicht",
    UNAVAILABLE: "Keine Zeit",
};

const getCellStyles = (counts?: CountsByStatus, totalUsers: number = 0, isCurrentMonth: boolean = true) => {
    if (!counts || totalUsers === 0) return { bg: "", border: "" };

    const available = counts.AVAILABLE ?? 0;
    const unavailable = counts.UNAVAILABLE ?? 0;

    const percentAvailable = (available / totalUsers) * 100;
    const percentUnavailable = (unavailable / totalUsers) * 100;

    if (percentAvailable === 100) return { bg: isCurrentMonth ? "bg-purple-500/70" : "bg-purple-50/50", border: "" };
    if (percentAvailable >= 70) return { bg: isCurrentMonth ? "bg-green-500/70" : "bg-green-50/50", border: "" };
    if (percentUnavailable === 100) return { bg: isCurrentMonth ? "bg-red-500/70" : "bg-red-50/50", border: "" };
    if (percentUnavailable > 0) return { bg: isCurrentMonth ? "bg-amber-400/30 dark:bg-amber-100/30" : "bg-amber-50/10", border: "" };

    return { bg: "", border: "" };
};


{/*Main Component der WebApp zur gestalltung und Votes für Tage mit Zeit, keine Zeit und Vielleicht */ }
const CalendarComponent = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const viewMonth = currentDate.getMonth();
    const viewYear = currentDate.getFullYear();
    const today = new Date();
    const [users, setUsers] = useState<SimpleUser[]>([]);
    const [totalUsers, setTotalUsers] = useState(0);

    const [daysWithVotes, setDaysWithVotes] = useState<Set<string>>(new Set());
    const [userVotesByDay, setUserVotesByDay] = useState<Record<string, boolean>>({});
    const [countsByDay, setCountsByDay] = useState<Record<string, CountsByStatus>>({});
    const [votersByDay, setVotersByDay] = useState<Record<string, SimpleUser[]>>({});
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const [selectedUsers, setSelectedUsers] = useState<SimpleUser[]>([]);
    const [dialogLoading, setDialogLoading] = useState(false);

    const params = useParams<{ username: string }>();
    const currentUsername = decodeURIComponent(params?.username ?? "");
    const [showVotePanel, setShowVotePanel] = useState(false);
    const [voteStatus, setVoteStatus] = useState<AvailabilityStatus>("AVAILABLE");
    const [voteNote, setVoteNote] = useState("");
    const [voteSubmitting, setVoteSubmitting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const hasVoted = !!currentUsername && selectedUsers.some((u) => u.username === currentUsername);
    const myVote = useMemo(
        () => selectedUsers.find(u => u.username === currentUsername) ?? null,
        [selectedUsers, currentUsername]
    );

    const monthNames = useMemo(
        () => [
            "Januar", "Februar", "März", "April", "Mai", "Juni",
            "Juli", "August", "September", "Oktober", "November", "Dezember",
        ],
        []
    );
    const dayNames = useMemo(() => ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"], []);
    const dayNamesShort = useMemo(() => ["M", "D", "M", "D", "F", "S", "S"], []);

    const previousMonth = () => setCurrentDate(new Date(viewYear, viewMonth - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(viewYear, viewMonth + 1, 1));
    const goToToday = () => setCurrentDate(new Date());

    const isToday = (day: number): boolean =>
        today.getDate() === day && today.getMonth() === viewMonth && today.getFullYear() === viewYear;

    const openEditPanel = () => {
        if (!myVote) return;
        setVoteStatus(myVote.status);
        setVoteNote(myVote.comment ?? "");
        setIsEditing(true);
        setShowVotePanel(true);
    };

    const openCreatePanel = () => {
        setVoteStatus("AVAILABLE");
        setVoteNote("");
        setIsEditing(false);
        setShowVotePanel(true);
    };

    const fetchCounts = React.useCallback(async () => {
        try {
            const res = await fetch("/api/voted-days", { cache: "no-store" });
            if (!res.ok) throw new Error(String(res.status));
            const json = await res.json();

            let items: Array<{ day: string; counts: CountsByStatus }> = [];
            const userVotes: Record<string, boolean> = {};

            if (Array.isArray(json?.items)) {
                items = json.items;
            } else if (Array.isArray(json?.dates)) {
                items = json.dates.map((d: any) => {
                    const counts: CountsByStatus = { AVAILABLE: 0, MAYBE: 0, UNAVAILABLE: 0 };
                    (d.votes ?? []).forEach((v: any) => {
                        if (v.status in counts) counts[v.status as AvailabilityStatus] += 1;
                        // Prüfen ob der aktuelle User gevoted hat
                        if (v.username === currentUsername) {
                            userVotes[d.day] = true;
                        }
                    });
                    return { day: d.day, counts };
                });
            }

            const map: Record<string, CountsByStatus> = {};
            const daySet = new Set<string>();
            for (const it of items) {
                map[it.day] = it.counts;
                daySet.add(it.day);
            }
            setCountsByDay(map);
            setDaysWithVotes(daySet);
            setUserVotesByDay(userVotes);
        } catch (e) {
            console.error(e);
        } finally {
            setIsInitialLoading(false);
        }
    }, [currentUsername]);

    async function openDialogForDay(key: string) {
        setSelectedKey(key);
        setIsDialogOpen(true);

        const cached = votersByDay[key];
        if (cached) {
            setSelectedUsers(cached);
            return;
        }

        setDialogLoading(true);
        try {
            const res = await fetch(`/api/voted-days/${key}`, { cache: "no-store" });
            if (!res.ok) throw new Error(String(res.status));
            const payload = (await res.json()) as {
                day: string;
                votes: { userId: number; username: string; status: AvailabilityStatus; avatarUrl?: string | null; comment?: string | null }[];
            };

            const users: SimpleUser[] = payload.votes.map((v) => ({
                id: v.userId,
                username: v.username,
                status: v.status,
                avatarUrl: v.avatarUrl ?? null,
                comment: v.comment ?? null,
            }));

            setSelectedUsers(users);
            setVotersByDay((prev) => ({ ...prev, [key]: users }));
        } catch (e) {
            console.error(e);
            setSelectedUsers([]);
        } finally {
            setDialogLoading(false);
        }
    }

    const handleVoteSave = async () => {
        if (!selectedKey || !currentUsername) return;
        setVoteSubmitting(true);
        try {
            const res = await fetch(`/api/voted-days/${selectedKey}/vote`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: currentUsername,
                    status: voteStatus,
                    comment: voteNote || null,
                }),
            });
            if (!res.ok) throw new Error(String(res.status));
            const created = (await res.json()) as {
                userId: number; username: string; status: AvailabilityStatus;
                avatarUrl?: string | null; comment?: string | null;
            };

            const newUser: SimpleUser = {
                id: created.userId,
                username: created.username,
                status: created.status,
                avatarUrl: created.avatarUrl ?? null,
                comment: created.comment ?? (voteNote || null),
            };

            setSelectedUsers(prev => {
                const idx = prev.findIndex(u => u.id === newUser.id);
                if (idx !== -1) {
                    const copy = [...prev];
                    copy[idx] = newUser;
                    return copy;
                }
                return [...prev, newUser];
            });

            setVotersByDay(prev => {
                const prevUsers = prev[selectedKey] ?? [];
                const idx = prevUsers.findIndex(u => u.id === newUser.id);
                const nextUsers = idx !== -1
                    ? Object.assign([...prevUsers], { [idx]: newUser })
                    : [...prevUsers, newUser];
                return { ...prev, [selectedKey]: nextUsers };
            });

            setCountsByDay(prev => {
                const zero: CountsByStatus = { AVAILABLE: 0, MAYBE: 0, UNAVAILABLE: 0 };
                const prevCounts = { ...(prev[selectedKey] ?? zero) };

                if (isEditing && myVote) {
                    prevCounts[myVote.status] = Math.max(0, (prevCounts[myVote.status] ?? 0) - 1);
                }
                prevCounts[newUser.status] = (prevCounts[newUser.status] ?? 0) + 1;

                return { ...prev, [selectedKey]: prevCounts };
            });

            setDaysWithVotes(prev => new Set(prev).add(selectedKey));

            setShowVotePanel(false);
            setIsEditing(false);
            setVoteNote("");

            window.dispatchEvent(new Event("calendar-refetch"));
        } catch (e) {
            console.error(e);
        } finally {
            setVoteSubmitting(false);
        }
    };

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await fetch("/api/users", { cache: "no-store" });
                if (!res.ok) throw new Error("Fehler beim Laden der User");
                const data = await res.json();
                setUsers(data.users);
                setTotalUsers(data.totalUsers);
            } catch (e) {
                console.error(e);
            }
        };
        fetchUsers();
    }, []);


    useEffect(() => { fetchCounts(); }, [fetchCounts]);

    useEffect(() => {
        const handler = () => {
            setVotersByDay({});
            fetchCounts();
            if (isDialogOpen && selectedKey) {
                openDialogForDay(selectedKey);
            }
        };
        window.addEventListener("calendar-refetch", handler as EventListener);
        return () => window.removeEventListener("calendar-refetch", handler as EventListener);
    }, [fetchCounts, isDialogOpen, selectedKey]);

    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;

    const calendarDays: CalendarDay[] = [];
    for (let i = adjustedFirstDay - 1; i >= 0; i--) {
        calendarDays.push({ day: daysInPrevMonth - i, isCurrentMonth: false, isPrevMonth: true });
    }
    for (let d = 1; d <= daysInMonth; d++) {
        calendarDays.push({ day: d, isCurrentMonth: true, isPrevMonth: false });
    }
    const totalCells = Math.ceil(calendarDays.length / 7) * 7;
    for (let d = 1; calendarDays.length < totalCells; d++) {
        calendarDays.push({ day: d, isCurrentMonth: false, isPrevMonth: false });
    }

    const weeks: CalendarDay[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
        weeks.push(calendarDays.slice(i, i + 7));
    }

    return (
        <section className="h-full min-h-0 w-full max-w-full overflow-hidden flex flex-col">
            {isInitialLoading ? (
                <div className='flex justify-center items-center min-h-[400px]'>
                    <CircularProgress />
                </div>
            ) : (
                <>
                    <div className="flex items-center justify-between gap-2 h-10 sm:h-12 md:h-14 px-2 sm:px-3 md:px-4 backdrop-blur">
                        <div className="flex items-center gap-1 sm:gap-2">
                            <button
                                onClick={previousMonth}
                                aria-label="Vorheriger Monat"
                                className="inline-flex items-center justify-center rounded-md text-sm transition-colors hover:bg-muted h-7 w-7 sm:h-8 sm:w-8 border border-border"
                            >
                                <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                            </button>
                            <button
                                onClick={nextMonth}
                                aria-label="Nächster Monat"
                                className="inline-flex items-center justify-center rounded-md text-sm transition-colors hover:bg-muted h-7 w-7 sm:h-8 sm:w-8 border border-border"
                            >
                                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                            </button>
                        </div>

                        <h2 className="text-sm sm:text-base md:text-lg font-semibold text-foreground text-center flex-1 truncate">
                            <span className="hidden xs:inline">{monthNames[viewMonth]} </span>
                            <span className="xs:hidden">{monthNames[viewMonth].slice(0, 3)}. </span>
                            {viewYear}
                        </h2>

                        <div className="flex items-center gap-1 sm:gap-2">
                            <button
                                onClick={goToToday}
                                className="px-2 sm:px-3 h-7 sm:h-8 inline-flex items-center justify-center rounded-md border border-border text-xs sm:text-sm font-medium hover:bg-muted"
                            >
                                <span className="hidden sm:inline">Heute</span>
                                <span className="sm:hidden">H</span>
                            </button>
                        </div>
                    </div>

                    {/* Calendar */}
                    <div className="w-full rounded-lg overflow-hidden border border-border shadow-sm">
                        {/* Weekday header */}
                        <div className="grid grid-cols-7 bg-muted/60 border-b border-border">
                            {dayNames.map((day, index) => (
                                <div
                                    key={day}
                                    className="h-8 sm:h-9 md:h-10 lg:h-11 flex items-center justify-center text-foreground font-medium text-xs sm:text-sm border-r border-border last:border-r-0"
                                >
                                    <span className="hidden sm:inline">{day}</span>
                                    <span className="sm:hidden">{dayNamesShort[index]}</span>
                                </div>
                            ))}
                        </div>

                        {/* Days grid */}
                        <div className="grid grid-cols-7 auto-rows-[minmax(60px,1fr)] xs:auto-rows-[minmax(75px,1fr)] sm:auto-rows-[minmax(90px,1fr)] md:auto-rows-[minmax(110px,1fr)] lg:auto-rows-[minmax(128px,1fr)]">
                            {weeks.map((week, weekIndex) => (
                                <React.Fragment key={weekIndex}>
                                    {week.map((dateObj, dayIndex) => {
                                        const isCurrent = dateObj.isCurrentMonth;
                                        const key = toKey(
                                            dateObj.isPrevMonth ? (viewMonth === 0 ? viewYear - 1 : viewYear) :
                                                (!dateObj.isCurrentMonth && !dateObj.isPrevMonth ? (viewMonth === 11 ? viewYear + 1 : viewYear) : viewYear),
                                            dateObj.isPrevMonth ? (viewMonth === 0 ? 11 : viewMonth - 1) :
                                                (!dateObj.isCurrentMonth && !dateObj.isPrevMonth ? (viewMonth === 11 ? 0 : viewMonth + 1) : viewMonth),
                                            dateObj.day
                                        );
                                        const counts = countsByDay[key];
                                        const { bg, border } = getCellStyles(countsByDay[key], totalUsers, dateObj.isCurrentMonth);

                                        const baseBg = isCurrent ? "" : "bg-muted/40";
                                        const bgClass = bg || baseBg;
                                        const borderClass = border || "border-border";
                                        const hasVotes = daysWithVotes.has(key);

                                        return (
                                            <div
                                                key={`${weekIndex}-${dayIndex}`}
                                                className={`relative border-r border-b ${borderClass} ${bgClass} last:border-r-0`}
                                            >
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => openDialogForDay(key)}
                                                    aria-label={`Auswählen: ${dateObj.day}.${viewMonth + 1}.${viewYear}`}
                                                    className="group w-full h-full rounded-none p-1 sm:p-2 flex flex-col items-start justify-start hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 bg-transparent"
                                                >
                                                    <div className="w-full flex flex-col gap-1 sm:gap-2">
                                                        {/* Datum */}
                                                        <div className="w-full flex items-start">
                                                            <span
                                                                className={[
                                                                    "inline-flex items-center justify-center rounded-full font-medium",
                                                                    "h-5 w-5 text-xs sm:h-6 sm:w-6 sm:text-sm md:h-7 md:w-7",
                                                                    isCurrent ? "text-foreground" : "text-muted-foreground",
                                                                    isToday(dateObj.day)
                                                                        ? "bg-primary text-primary-foreground ring-1 sm:ring-2 ring-ring"
                                                                        : "bg-transparent",
                                                                ].join(" ")}
                                                                aria-label={`Tag ${dateObj.day}`}
                                                                aria-selected={isToday(dateObj.day)}
                                                            >
                                                                {dateObj.day}
                                                            </span>
                                                        </div>

                                                        {hasVotes && (
                                                            <span className="inline-block h-2 w-2 sm:h-3 sm:w-3 rounded-full bg-primary/70" aria-hidden="true" />
                                                        )}
                                                        {userVotesByDay[key] && (
                                                            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-green-400/80 flex items-center justify-center text-white text-[8px] sm:text-[10px] font-bold">
                                                                ✓
                                                            </div>
                                                        )}
                                                    </div>
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    <Dialog
                        open={isDialogOpen}
                        onOpenChange={(open) => {
                            setIsDialogOpen(open);
                            if (!open) {
                                setShowVotePanel(false);
                                setIsEditing(false);
                            }
                        }}
                    >
                        <DialogContent className="w-[95vw] max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle className="text-base sm:text-lg">
                                    {selectedKey ? `Teilnehmer · ${selectedKey}` : "Teilnehmer"}
                                </DialogTitle>
                                <DialogDescription className="text-sm">
                                    Wer hat für diesen Tag gevotet?
                                </DialogDescription>
                            </DialogHeader>

                            {dialogLoading ? (
                                <div
                                    className="py-10 flex items-center justify-center"
                                    aria-busy="true"
                                    aria-live="polite"
                                >
                                    <CircularProgress />
                                </div>
                            ) : (
                                <>
                                    <div className="mt-2 space-y-2 sm:space-y-3">
                                        {selectedUsers.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">Noch keine Votes.</p>
                                        ) : (
                                            selectedUsers.map((u) => {
                                                const imgSrc = u.avatarUrl ?? `/api/users/${u.id}/avatar`;
                                                return (
                                                    <div key={u.id}>
                                                        <div className="flex items-center gap-2 sm:gap-3 justify-between">
                                                            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                                                                <Avatar className="size-6 sm:size-8 ring-1 sm:ring-2 ring-background shrink-0">
                                                                    <AvatarImage
                                                                        src={`/images/${encodeURIComponent(u.username)}.jpg`}
                                                                        alt={u.username}
                                                                    />
                                                                    <AvatarFallback className="text-xs">
                                                                        <img src="/images/PlaceholderAvatar.png" alt={u.username} />
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <span className="text-xs sm:text-sm truncate">{u.username}</span>
                                                            </div>
                                                            <span className="text-xs px-2 py-0.5 rounded border bg-card whitespace-nowrap">
                                                                {statusLabel[u.status] ?? "–"}
                                                            </span>
                                                        </div>
                                                        {u.comment && (
                                                            <p className="text-[11px] sm:text-xs text-muted-foreground ml-8 break-words">
                                                                {u.comment}
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>

                                    {selectedKey && (
                                        <div className="mt-4">
                                            {!showVotePanel ? (
                                                hasVoted ? (
                                                    <Button type="button" onClick={openEditPanel} size="sm" className="w-full sm:w-auto">
                                                        Bearbeiten
                                                    </Button>
                                                ) : (
                                                    <Button type="button" onClick={openCreatePanel} size="sm" className="w-full sm:w-auto">
                                                        Abstimmen
                                                    </Button>
                                                )
                                            ) : (
                                                <div className="space-y-3 sm:space-y-4 rounded-md border p-3 sm:p-4 bg-card/50">
                                                    <div className="space-y-2">
                                                        <Label className="text-xs sm:text-sm">
                                                            {isEditing ? "Meine Verfügbarkeit bearbeiten" : "Verfügbarkeit"}
                                                        </Label>
                                                        <RadioGroup
                                                            value={voteStatus}
                                                            onValueChange={(v) => setVoteStatus(v as AvailabilityStatus)}
                                                            className="grid gap-2"
                                                        >
                                                            <Label className="inline-flex items-center gap-2 cursor-pointer text-xs sm:text-sm">
                                                                <RadioGroupItem value="AVAILABLE" /> Hab Zeit
                                                            </Label>
                                                            <Label className="inline-flex items-center gap-2 cursor-pointer text-xs sm:text-sm">
                                                                <RadioGroupItem value="MAYBE" /> Vielleicht
                                                            </Label>
                                                            <Label className="inline-flex items-center gap-2 cursor-pointer text-xs sm:text-sm">
                                                                <RadioGroupItem value="UNAVAILABLE" /> Keine Zeit
                                                            </Label>
                                                        </RadioGroup>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label htmlFor="note" className="text-xs sm:text-sm">Notiz (optional)</Label>
                                                        <Textarea
                                                            id="note"
                                                            rows={3}
                                                            value={voteNote}
                                                            onChange={(e) => setVoteNote(e.target.value)}
                                                            placeholder="Kurzer Hinweis …"
                                                            className="text-sm"
                                                        />
                                                    </div>

                                                    <div className="flex flex-col sm:flex-row justify-end gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="w-full sm:w-auto"
                                                            onClick={() => {
                                                                setShowVotePanel(false);
                                                                setIsEditing(false);
                                                            }}
                                                        >
                                                            Abbrechen
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            disabled={voteSubmitting}
                                                            onClick={handleVoteSave}
                                                            size="sm"
                                                            className="w-full sm:w-auto"
                                                        >
                                                            {voteSubmitting ? "Speichern…" : "Speichern"}
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <DialogFooter className="mt-4">
                                        <Button
                                            type="button"
                                            onClick={() => setIsDialogOpen(false)}
                                            size="sm"
                                            className="w-full sm:w-auto"
                                        >
                                            Schließen
                                        </Button>
                                    </DialogFooter>
                                </>
                            )}
                        </DialogContent>
                    </Dialog>

                </>
            )}
        </section>
    );
};

export default CalendarComponent;