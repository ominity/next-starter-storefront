"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SliderBlockClientProps {
  readonly title: string;
  readonly items: ReadonlyArray<string>;
}

export function SliderBlockClient({ title, items }: SliderBlockClientProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const safeIndex = useMemo(() => {
    if (items.length === 0) {
      return 0;
    }

    if (activeIndex < 0) {
      return 0;
    }

    if (activeIndex >= items.length) {
      return items.length - 1;
    }

    return activeIndex;
  }, [activeIndex, items.length]);

  if (items.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Client-side interactive block inside an SSR/ISR page.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/40 px-4 py-6 text-center text-sm md:text-base">
          {items[safeIndex]}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveIndex((previous) => Math.max(previous - 1, 0))}
            disabled={safeIndex <= 0}
          >
            Previous
          </Button>

          <span className="text-xs text-muted-foreground">
            {safeIndex + 1} / {items.length}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveIndex((previous) => Math.min(previous + 1, items.length - 1))}
            disabled={safeIndex >= items.length - 1}
          >
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

