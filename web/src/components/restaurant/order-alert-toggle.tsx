"use client";

import { type AlertMode, useOrderAlerts } from "@/hooks/use-order-alerts";

export function OrderAlertToggle({
  businessId,
  mode,
}: {
  businessId: string;
  mode: AlertMode;
}) {
  const { soundOn, toggleSound, testSound } = useOrderAlerts(businessId, mode);

  return (
    <div className="flex items-center gap-1">
      {/* Main toggle */}
      <button
        type="button"
        onClick={toggleSound}
        title={soundOn ? "Sound on — click to mute" : "Sound muted — click to enable"}
        className={[
          "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
          soundOn
            ? "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
            : "border-zinc-200 bg-zinc-100 text-zinc-400",
        ].join(" ")}
      >
        {soundOn ? (
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path d="M9.383 3.076A1 1 0 0 1 10 4v12a1 1 0 0 1-1.707.707L4.586 13H2a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h2.586l3.707-3.707a1 1 0 0 1 1.09-.217ZM14.657 2.929a1 1 0 0 1 1.414 0A9.972 9.972 0 0 1 19 10a9.972 9.972 0 0 1-2.929 7.071 1 1 0 0 1-1.414-1.414A7.971 7.971 0 0 0 17 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 0 1 0-1.414Zm-2.829 2.828a1 1 0 0 1 1.415 0A5.983 5.983 0 0 1 15 10a5.984 5.984 0 0 1-1.757 4.243 1 1 0 0 1-1.415-1.415A3.984 3.984 0 0 0 13 10a3.983 3.983 0 0 0-1.172-2.828 1 1 0 0 1 0-1.415Z" />
          </svg>
        ) : (
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path d="M9.383 3.076A1 1 0 0 1 10 4v12a1 1 0 0 1-1.707.707L4.586 13H2a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h2.586l3.707-3.707a1 1 0 0 1 1.09-.217Z" />
            <path fillRule="evenodd" d="M12.293 7.293a1 1 0 0 1 1.414 0L15 8.586l1.293-1.293a1 1 0 1 1 1.414 1.414L16.414 10l1.293 1.293a1 1 0 0 1-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 0 1-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 0 1 0-1.414Z" clipRule="evenodd" />
          </svg>
        )}
        <span>{soundOn ? "Sound on" : "Sound off"}</span>
      </button>

      {/* Test button — only visible when sound is on */}
      {soundOn && (
        <button
          type="button"
          onClick={testSound}
          title="Play test sound"
          className="rounded-lg border border-zinc-200 bg-white p-2 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM9.555 7.168A1 1 0 0 0 8 8v4a1 1 0 0 0 1.555.832l3-2a1 1 0 0 0 0-1.664l-3-2Z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  );
}
