import { CornerUpLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReplyContextItem } from "@/lib/domains/chat/reply-context";

type ReplyContextProps = {
  items: ReplyContextItem[];
  onRemove?: (id: string) => void;
};

export function ReplyContext({ items, onRemove }: ReplyContextProps) {
  if (items.length === 0) return null;

  return (
    <div className="bg-muted/40 -mx-1.5 -mt-1 rounded-t-[24px] rounded-b-lg px-3 py-2 pb-2">
      <div className="flex flex-col gap-1">
        {items.map((item) => (
          <div key={item.id} className="text-muted-foreground flex items-center gap-2 text-sm">
            <CornerUpLeft className="size-4 -scale-x-100 -scale-y-100" />
            <span className="min-w-0 flex-1 truncate">&ldquo;{item.text}&rdquo;</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground -mr-1"
              onClick={() => onRemove?.(item.id)}
              aria-label="Remove reply context"
            >
              <X className="size-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
