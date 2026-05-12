"use client";

import { cn } from "@/lib/utils";

type SegmentedControlOption<T extends string | number> = {
  value: T;
  label: string;
};

type SegmentedControlProps<T extends string | number> = {
  value: T;
  onChange: (value: T) => void;
  options: Array<SegmentedControlOption<T>>;
  className?: string;
  itemClassName?: string;
  ariaLabel?: string;
  disabled?: boolean;
};

export function SegmentedControl<T extends string | number>({
  value,
  onChange,
  options,
  className,
  itemClassName,
  ariaLabel,
  disabled = false,
}: SegmentedControlProps<T>) {
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const itemWidth = options.length > 0 ? 100 / options.length : 100;

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "relative grid overflow-hidden rounded-[18px] bg-[#F7FAFC] p-1.5",
        "[@media(max-height:760px)]:rounded-[15px] [@media(max-height:760px)]:p-1",
        className,
      )}
      style={{
        gridTemplateColumns: `repeat(${Math.max(options.length, 1)}, minmax(0, 1fr))`,
      }}
    >
      <div
        aria-hidden="true"
        className="absolute bottom-1.5 top-1.5 rounded-[14px] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all duration-300 ease-[cubic-bezier(0.68,-0.55,0.265,1.55)] [@media(max-height:760px)]:bottom-1 [@media(max-height:760px)]:top-1 [@media(max-height:760px)]:rounded-[11px]"
        style={{
          left: `calc(${activeIndex * itemWidth}% + 6px)`,
          width: `calc(${itemWidth}% - 6px)`,
        }}
      />
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={cn(
              "relative z-[1] cursor-pointer rounded-[14px] px-4 py-2.5 text-center text-[14px] font-bold transition-colors",
              "[@media(max-height:760px)]:rounded-[11px] [@media(max-height:760px)]:px-1.5 [@media(max-height:760px)]:py-1.5 [@media(max-height:760px)]:text-[12px]",
              active ? "text-[#1A365D]" : "text-[#718096]",
              disabled && "pointer-events-none opacity-50",
              itemClassName,
            )}
            onClick={() => {
              if (disabled || option.value === value) return;
              onChange(option.value);
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
