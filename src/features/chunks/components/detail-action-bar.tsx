"use client";

import { ReactNode } from "react";

export function DetailActionBar({
  leading,
  trailing,
}: {
  leading?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex items-end gap-3">
      {leading}
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">{trailing}</div>
    </div>
  );
}
