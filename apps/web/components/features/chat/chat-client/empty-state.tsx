import { ConversationEmptyState } from "@/components/ai-elements/conversation";
import { Button } from "@/components/ui/button";

export function ChatEmptyState({
  shouldShowConnect,
  onConnect,
}: {
  shouldShowConnect: boolean;
  onConnect: () => void;
}) {
  if (!shouldShowConnect) {
    return <ConversationEmptyState />;
  }

  return (
    <ConversationEmptyState>
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">Connect to view this chat</h3>
          <p className="text-muted-foreground text-sm">
            Connect your wallet to load this conversation.
          </p>
        </div>
        <Button type="button" onClick={onConnect}>
          Connect
        </Button>
      </div>
    </ConversationEmptyState>
  );
}
