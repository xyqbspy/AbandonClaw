"use client";

import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { useCardTapMotion } from "@/hooks/use-card-tap-motion";

export type MotionCardStateAttrs = {
  "data-pressed": "true" | "false";
  "data-activated": "true" | "false";
};

type MotionCardLinkProps = Omit<
  ComponentProps<typeof Link>,
  "children" | "onPointerDown" | "onPointerUp" | "onPointerCancel" | "onPointerLeave" | "onClick"
> & {
  motionId: string;
  ignoreSelector?: string;
  activationDurationMs?: number;
  children: (stateAttrs: MotionCardStateAttrs) => ReactNode;
};

export function MotionCardLink({
  motionId,
  ignoreSelector,
  activationDurationMs,
  children,
  ...linkProps
}: MotionCardLinkProps) {
  const { getTapMotionProps } = useCardTapMotion();
  const tapMotionProps = getTapMotionProps(motionId, { ignoreSelector, activationDurationMs });

  return (
    <Link
      {...linkProps}
      onPointerDown={tapMotionProps.onPointerDown}
      onPointerUp={tapMotionProps.onPointerUp}
      onPointerCancel={tapMotionProps.onPointerCancel}
      onPointerLeave={tapMotionProps.onPointerLeave}
      onClick={tapMotionProps.onClick}
    >
      {children({
        "data-pressed": tapMotionProps["data-pressed"],
        "data-activated": tapMotionProps["data-activated"],
      })}
    </Link>
  );
}
