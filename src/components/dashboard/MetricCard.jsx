import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function MetricCard({ title, value, icon: Icon, isLoading }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}>
      <Card className="shadow-lg">
        <CardContent className="mx-4 my-3 px-12 py-6 relative">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-primary mb-2 text-base font-semibold truncate">{title}</p>
              {isLoading ?
                <div className="h-8 w-24 bg-slate-200 animate-pulse rounded-md" /> :
                <p className="text-2xl font-semibold truncate">{value}</p>
              }
            </div>
            <div className="p-3 rounded-lg bg-primary/10 flex-shrink-0 ml-4">
              <Icon className="w-6 h-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>);
}