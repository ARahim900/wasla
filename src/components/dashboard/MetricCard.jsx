import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

function MetricCard({ title, value, icon: Icon, isLoading, intent = "default", trend }) {
  const intentClasses = {
    default: "text-foreground",
    success: "text-status-success",
    warning: "text-status-warning",
    danger: "text-status-danger",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground truncate">
                {title}
              </p>
              {isLoading ? (
                <div className="h-8 w-24 mt-2 bg-muted animate-pulse rounded-md" />
              ) : (
                <p className={cn("mt-2 text-2xl lg:text-3xl font-semibold tracking-tight truncate", intentClasses[intent])}>
                  {value}
                </p>
              )}
              {trend && !isLoading && (
                <p className="mt-1 text-xs text-muted-foreground">{trend}</p>
              )}
            </div>
            {Icon && (
              <Icon className="w-5 h-5 text-muted-foreground/70 flex-shrink-0 mt-0.5" aria-hidden="true" />
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default React.memo(MetricCard);
