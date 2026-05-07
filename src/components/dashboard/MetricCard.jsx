import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const intentValueClasses = {
  default: "text-foreground",
  success: "text-status-success",
  warning: "text-status-warning",
  danger: "text-status-danger",
};

const iconToneClasses = {
  blue:    "bg-blue-500/10    text-blue-600    dark:bg-blue-400/10    dark:text-blue-400",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400",
  violet:  "bg-violet-500/10  text-violet-600  dark:bg-violet-400/10  dark:text-violet-400",
  amber:   "bg-amber-500/10   text-amber-600   dark:bg-amber-400/10   dark:text-amber-400",
  rose:    "bg-rose-500/10    text-rose-600    dark:bg-rose-400/10    dark:text-rose-400",
  neutral: "bg-muted          text-muted-foreground",
};

function MetricCard({ title, value, icon: Icon, isLoading, intent = "default", iconTone = "neutral", trend }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardContent className="p-4 lg:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground truncate">
                {title}
              </p>
              {isLoading ? (
                <div className="h-7 w-24 mt-1.5 bg-muted animate-pulse rounded-md" />
              ) : (
                <p className={cn("mt-1.5 text-xl lg:text-2xl font-semibold tracking-tight truncate", intentValueClasses[intent])}>
                  {value}
                </p>
              )}
              {trend && !isLoading && (
                <p className="mt-1 text-xs text-muted-foreground">{trend}</p>
              )}
            </div>
            {Icon && (
              <div
                className={cn(
                  "flex-shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg",
                  iconToneClasses[iconTone] || iconToneClasses.neutral
                )}
                aria-hidden="true"
              >
                <Icon className="w-[18px] h-[18px]" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default React.memo(MetricCard);
