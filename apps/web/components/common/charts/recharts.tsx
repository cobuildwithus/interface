"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, type ComponentType, type ForwardRefExoticComponent } from "react";

type RechartsModule = typeof import("recharts");
type AreaChartComponent = RechartsModule["AreaChart"];
type AreaComponent = RechartsModule["Area"];
type XAxisComponent = RechartsModule["XAxis"];
type YAxisComponent = RechartsModule["YAxis"];
type ResponsiveContainerComponent = RechartsModule["ResponsiveContainer"];
type TooltipComponent = RechartsModule["Tooltip"];
type ReferenceDotComponent = RechartsModule["ReferenceDot"];

let rechartsReady = false;
let rechartsPromise: Promise<void> | null = null;

type RechartsComponent<P> = ComponentType<P> | ForwardRefExoticComponent<P>;

const dynamicRecharts = <P,>(selector: (module: RechartsModule) => RechartsComponent<P>) =>
  dynamic<P>(
    async () => {
      const mod = await import("recharts");
      return selector(mod) as ComponentType<P>;
    },
    { ssr: false }
  );

const loadRecharts = () => {
  if (!rechartsPromise) {
    rechartsPromise = import("recharts").then(() => {
      rechartsReady = true;
    });
  }
  return rechartsPromise;
};

export const useRechartsReady = () => {
  const [ready, setReady] = useState(rechartsReady);

  useEffect(() => {
    if (rechartsReady) return;
    let active = true;
    loadRecharts().then(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  return ready;
};

export const AreaChart = dynamicRecharts((mod) => mod.AreaChart) as AreaChartComponent;
export const Area = dynamicRecharts((mod) => mod.Area) as AreaComponent;
export const XAxis = dynamicRecharts((mod) => mod.XAxis) as XAxisComponent;
export const YAxis = dynamicRecharts((mod) => mod.YAxis) as YAxisComponent;
export const ResponsiveContainer = dynamicRecharts(
  (mod) => mod.ResponsiveContainer
) as ResponsiveContainerComponent;
export const Tooltip = dynamicRecharts((mod) => mod.Tooltip) as TooltipComponent;
export const ReferenceDot = dynamicRecharts((mod) => mod.ReferenceDot) as ReferenceDotComponent;
