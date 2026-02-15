"use client";

type Interval = { startAt: string; endAt: string | null };

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

export default function TimeSlotGrid({
  date,
  occupied,
  durationHours,
  selected,
  onSelect,
  startHour = 7,
  endHour = 23,
}: {
  date: Date;
  occupied: Interval[];
  durationHours: number;
  selected: Date | null;
  onSelect: (d: Date) => void;
  startHour?: number;
  endHour?: number;
}) {
  const slots: { time: Date; available: boolean }[] = [];

  for (let h = startHour; h <= endHour; h++) {
    const start = new Date(date);
    start.setHours(h, 0, 0, 0);
    const end = new Date(start);
    end.setHours(end.getHours() + Math.max(1, durationHours));

    const isAvailable = !occupied.some((iv) => {
      const bStart = new Date(iv.startAt);
      const bEnd = iv.endAt ? new Date(iv.endAt) : new Date(new Date(iv.startAt).getTime() + 60 * 60 * 1000);
      return overlaps(start, end, bStart, bEnd);
    });

    slots.push({ time: start, available: isAvailable });
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {slots.map((s) => {
        const isSelected = selected ? s.time.getTime() === selected.getTime() : false;
        const label = s.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const base = "rounded border px-3 py-2 text-sm";
        const cls = s.available
          ? isSelected
            ? `${base} bg-green-600 text-white border-green-700`
            : `${base} bg-green-50 border-green-200 hover:bg-green-100`
          : `${base} bg-red-50 border-red-200 text-gray-400 cursor-not-allowed`;

        return (
          <button
            key={s.time.toISOString()}
            type="button"
            className={cls}
            onClick={() => s.available && onSelect(s.time)}
            disabled={!s.available}
            title={s.available ? "Available" : "Unavailable"}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
