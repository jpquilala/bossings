"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

const Tabs = ({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) => (
  <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col gap-4", className)} {...props} />
);

const TabsList = ({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) => (
  <TabsPrimitive.List
    data-slot="tabs-list"
    className={cn(
      "bg-muted text-muted-foreground inline-flex h-13 w-full items-center justify-center rounded-xl p-1.5",
      className,
    )}
    {...props}
  />
);

const TabsTrigger = ({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) => (
  <TabsPrimitive.Trigger
    data-slot="tabs-trigger"
    className={cn(
      "inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg px-4 py-1 text-sm font-bold whitespace-nowrap transition-all outline-none",
      "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
      "data-[state=active]:bg-brand-gradient data-[state=active]:text-white data-[state=active]:shadow-md",
      "disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4",
      className,
    )}
    {...props}
  />
);

const TabsContent = ({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) => (
  <TabsPrimitive.Content
    data-slot="tabs-content"
    className={cn("flex-1 outline-none", className)}
    {...props}
  />
);

export { Tabs, TabsList, TabsTrigger, TabsContent };
