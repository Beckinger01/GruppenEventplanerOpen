"use client";

import React from "react";
import { Card, CardContent, CardFooter } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

{/* Avatar Card für LandingPage */}
export default function AvatarCard({
    name,
    img,
}: {
    name: string;
    img?: string;
}) {
    return (
        <Card
            className={[
                "group w-full rounded-xl border-border/60 shadow-sm",
                "max-w-[160px] sm:max-w-[180px] md:max-w-[200px]",
                "transition-transform supports-[hover]:hover:scale-[1.03] active:scale-[0.99]",
            ].join(" ")}
        >
            <CardContent className="p-4 sm:p-5 flex justify-center items-center">
                <Avatar className="size-20 sm:size-24 md:size-28 ring-2 ring-background">
                    <AvatarImage
                        src={img || "/images/PlaceholderAvatar.png"}
                        alt={name}
                    />
                    <AvatarFallback className="text-base sm:text-lg font-medium">
                        <img src="/images/PlaceholderAvatar.png" alt={name} />
                    </AvatarFallback>
                </Avatar>
            </CardContent>
            <CardFooter className="pt-0 pb-4 sm:pb-5">
                <p className="w-full text-center font-medium truncate text-sm sm:text-base md:text-lg">
                    {name}
                </p>
            </CardFooter>
        </Card>
    );
}
