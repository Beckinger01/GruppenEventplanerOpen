"use client"

import AvatarCard from '@/components/AvatarCard';
import React, { useEffect, useRef, useState } from 'react'
import { User } from '@/types/user';
import { useParams, useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import CircularProgress from '@mui/material/CircularProgress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

{/* Landing Page wo man sich seinen User auswählt */ }
const page = () => {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pin, setPin] = useState<string[]>(["", "", "", ""]);
  const [pinError, setPinError] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement[]>([]);
  const [validateWait, setValidateWait] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/session", { cache: "no-store" });
        const json = await res.json();

        if (cancelled) return;

        if (json.ok && json.username) {
          router.replace(`/dashboard/${encodeURIComponent(json.username)}`);
          return;
        }

        const response = await fetch('/api/users', { cache: "no-store" });
        const data = await response.json();
        if (cancelled) return;
        setUsers(data.users || []);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [router]);

  const handleAvatarClick = (user: User) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  };

  const handleKeyDown = (index: number) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (pin[index]) {
        setPin(prev => { const n = [...prev]; n[index] = ""; return n; });
      } else if (index > 0) {
        inputRef.current[index - 1]?.focus();
        setPin(prev => { const n = [...prev]; n[index - 1] = ""; return n; });
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 3) {
      inputRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4).split("");
    const filled = [...digits, "", "", "", ""].slice(0, 4);
    setPin(filled);
    inputRef.current[Math.min(digits.length, 3)]?.focus();
  };

  const handlePinChange = (index: number, value: string) => {
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    if (index < 3) {
      inputRef.current[index + 1]?.focus();
    }
  };

  const handlePinSubmit = async () => {
    const pinString = pin.join('');
    if (pinString.length !== 4) {
      setPinError(true);
      return;
    }

    try {
      setValidateWait(true);
      setPinError(false);

      const response = await fetch("/api/validate-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: selectedUser?.username,
          pin: pinString,
        }),
        cache: "no-store",
      });

      if (!response.ok) {
        setPinError(true);
        setPin(["", "", "", ""]);
        return;
      }

      const result = await response.json();

      if (result.valid) {
        handleDialogClose();
        router.replace(`/dashboard/${encodeURIComponent(selectedUser?.username || "")}`);
      } else {
        setPin(["", "", "", ""]);
        inputRef.current[0]?.focus();
        setPinError(true);
      }
    } catch (e) {
      console.error(e);
      setPinError(true);
    } finally {
      setValidateWait(false);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setPin(["", "", "", ""]);
    setSelectedUser(null);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 md:pt-10">
        <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-center leading-tight">
          Gruppen Event Planer
        </h1>
      </header>

      {/* Main */}
      <main className="flex flex-col items-center p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-200px)]">
        {loading ? (
          <div className="flex justify-center items-center pt-8 sm:pt-10">
            <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl my-6 sm:my-8 md:my-10 text-center px-4">
              Wer bist du?
            </h2>

            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-6 max-w-6xl mx-auto">
              {users.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  className="cursor-pointer w-36 h-36 sm:w-40 sm:h-40 md:w-44 md:h-44"
                  onClick={() => handleAvatarClick(user)}
                >
                  <AvatarCard
                    name={user.username}
                    img={`/images/${encodeURIComponent(user.username)}.jpg`}
                  />
                </button>
              ))}
            </div>
          </>
        )}

        {/* PIN Dialog*/}
        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogContent className="w-[95vw] max-w-md mx-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">PIN eingeben</DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                Wenn noch keine PIN gesetzt wurde, dann wird diese mit der neuen Eingabe festgelegt.
              </DialogDescription>
            </DialogHeader>

            {validateWait ? (
              <div className="flex justify-center items-center py-8">
                <CircularProgress size={32} />
              </div>
            ) : (
              <div className="flex justify-center gap-2 sm:gap-3 py-4">
                {pin.map((digit, index) => (
                  <Input
                    key={index}
                    id={`pin${index}`}
                    type="text"
                    inputMode="numeric"
                    value={digit}
                    maxLength={1}
                    autoFocus={index === 0}
                    ref={(el) => { inputRef.current[index] = el! }}
                    onChange={(e) => handlePinChange(index, e.target.value)}
                    onKeyDown={handleKeyDown(index)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    className="w-12 h-12 sm:w-14 sm:h-14 text-center text-lg sm:text-xl font-bold rounded-lg border-2"
                  />
                ))}
              </div>
            )}

            {pinError && (
              <Alert variant="destructive" className="mt-4">
                <AlertTitle className="text-sm sm:text-base">Fehler bei der PIN Eingabe</AlertTitle>
                <AlertDescription className="text-sm">
                  Die PIN ist falsch oder unvollständig.
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4">
              <Button
                variant="default"
                onClick={handlePinSubmit}
                className="w-full sm:w-auto order-2 sm:order-1"
                disabled={validateWait}
              >
                Bestätigen
              </Button>
              <Button
                variant="outline"
                onClick={handleDialogClose}
                className="w-full sm:w-auto order-1 sm:order-2"
                disabled={validateWait}
              >
                Abbrechen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}

export default page