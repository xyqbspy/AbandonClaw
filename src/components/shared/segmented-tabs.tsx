"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cn } from "@/lib/utils";

type SegmentedTabsContextValue = {
  value: string;
};

const SegmentedTabsContext = React.createContext<SegmentedTabsContextValue | null>(null);

function useSegmentedTabsContext() {
  const context = React.useContext(SegmentedTabsContext);
  if (!context) {
    throw new Error("SegmentedTabs components must be used within SegmentedTabs.");
  }
  return context;
}

type SegmentedTabsProps = TabsPrimitive.Root.Props & {
  value: string;
};

export function SegmentedTabs({ className, value, orientation = "horizontal", ...props }: SegmentedTabsProps) {
  return (
    <SegmentedTabsContext.Provider value={{ value }}>
      <TabsPrimitive.Root
        data-slot="segmented-tabs"
        data-orientation={orientation}
        className={cn(
          "group/tabs flex min-w-0 flex-col gap-2 [@media(max-height:760px)]:gap-1.5",
          className,
        )}
        value={value}
        orientation={orientation}
        {...props}
      />
    </SegmentedTabsContext.Provider>
  );
}

export function SegmentedTabsList({
  className,
  children,
  ...props
}: TabsPrimitive.List.Props) {
  const { value } = useSegmentedTabsContext();
  const items = React.Children.toArray(children).filter(React.isValidElement);
  const itemCount = Math.max(items.length, 1);
  const activeIndex = Math.max(
    0,
    items.findIndex((child) => {
      const childValue = child.props?.value;
      return typeof childValue === "string" && childValue === value;
    }),
  );
  const itemWidth = 100 / itemCount;

  return (
    <TabsPrimitive.List
      data-slot="segmented-tabs-list"
      className={cn(
        "relative grid w-full min-w-0 items-center overflow-hidden rounded-[18px] bg-[#F7FAFC] p-1.5",
        "[@media(max-height:760px)]:rounded-[15px] [@media(max-height:760px)]:p-1",
        className,
      )}
      style={{
        gridTemplateColumns: `repeat(${itemCount}, minmax(0, 1fr))`,
      }}
      {...props}
    >
      <div
        aria-hidden="true"
        className="absolute bottom-1.5 top-1.5 rounded-[14px] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all duration-300 ease-[cubic-bezier(0.68,-0.55,0.265,1.55)] [@media(max-height:760px)]:bottom-1 [@media(max-height:760px)]:top-1 [@media(max-height:760px)]:rounded-[11px]"
        style={{
          left: `calc(${activeIndex * itemWidth}% + 6px)`,
          width: `calc(${itemWidth}% - 6px)`,
        }}
      />
      {children}
    </TabsPrimitive.List>
  );
}

export function SegmentedTabsTrigger({
  className,
  ...props
}: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="segmented-tabs-trigger"
      className={cn(
        "relative z-[1] inline-flex w-full min-w-0 items-center justify-center rounded-[14px] px-3 py-2.5 text-center text-[14px] font-bold whitespace-nowrap text-[#718096] transition-colors",
        "[@media(max-height:760px)]:rounded-[11px] [@media(max-height:760px)]:px-1.5 [@media(max-height:760px)]:py-1.5 [@media(max-height:760px)]:text-[12px]",
        "data-active:bg-transparent data-active:text-[#1A365D]",
        "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function SegmentedTabsContent({
  className,
  ...props
}: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="segmented-tabs-content"
      className={cn("min-w-0 text-sm outline-none", className)}
      {...props}
    />
  );
}
