"use client";

import { Clock3 } from "lucide-react";

function clock(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function FocusTimerWidget({ seconds, running, endsAt, onToday }: {
  seconds: number;
  running: boolean;
  endsAt: string | null;
  onToday: () => void;
}) {
  const endTime = running && endsAt ? new Date(endsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;
  return <aside className="focus-float" aria-label="Focus session">
    <button className="focus-float-time" onClick={onToday} title="Open focus timer on Today">
      <span><Clock3 size={13} /> {running ? "FOCUS RUNNING" : "FOCUS PAUSED"}</span>
      <strong role="timer" aria-label={`${Math.floor(seconds / 60)} minutes ${seconds % 60} seconds remaining`}>{clock(seconds)}</strong>
      <small>{endTime ? `Ends ${endTime}` : "Open Today to resume"}</small>
    </button>
  </aside>;
}
