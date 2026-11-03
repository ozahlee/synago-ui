"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Paginated } from "@/lib/api"

export function Pager({ meta, onPage }: { meta?: Paginated<unknown>["meta"]; onPage: (page: number) => void }) {
  if (!meta || meta.total === 0) return null
  return (
    <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
      <span className="tabular">
        Showing <span className="font-medium text-foreground">{meta.from}–{meta.to}</span> of{" "}
        <span className="font-medium text-foreground">{meta.total.toLocaleString()}</span>
      </span>
      {meta.last_page > 1 && (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Previous page"
            disabled={meta.current_page <= 1}
            onClick={() => onPage(meta.current_page - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="px-2 tabular">
            {meta.current_page} / {meta.last_page}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Next page"
            disabled={meta.current_page >= meta.last_page}
            onClick={() => onPage(meta.current_page + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
