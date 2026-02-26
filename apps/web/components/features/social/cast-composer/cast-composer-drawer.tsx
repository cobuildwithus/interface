"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { useFarcasterSigner } from "@/lib/hooks/use-farcaster-signer";
import { CharacterCounter } from "./character-counter";
import { ConnectFarcasterCta } from "./connect-farcaster-cta";

const CHARACTER_LIMIT = 1024;

type CastComposerDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onPost: (text: string) => void;
  placeholder?: string;
  children?: ReactNode;
};

export function CastComposerDrawer({
  open,
  onOpenChange,
  title,
  onPost,
  placeholder = "What's on your mind?",
  children,
}: CastComposerDrawerProps) {
  const [text, setText] = useState("");
  const { status: signerStatus, isLoading: isSignerLoading } = useFarcasterSigner();

  const hasSigner = signerStatus.hasSigner;
  const isOverLimit = text.length > CHARACTER_LIMIT;
  const canPost = text.trim().length > 0 && !isOverLimit;

  const handlePost = () => {
    if (!canPost) return;
    onPost(text);
    setText("");
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setText("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="border-border border-b pb-3">
          <DrawerTitle className="text-base">{title}</DrawerTitle>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-4">
          {isSignerLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="bg-muted h-6 w-6 animate-pulse rounded-full" />
            </div>
          ) : !hasSigner ? (
            <ConnectFarcasterCta />
          ) : (
            <div className="space-y-4">
              {children}
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={placeholder}
                className="min-h-32 resize-none"
                autoFocus
              />
            </div>
          )}
        </div>

        {hasSigner && !isSignerLoading && (
          <DrawerFooter className="border-border flex-row items-center justify-between border-t pt-3">
            <CharacterCounter count={text.length} limit={CHARACTER_LIMIT} />
            <div className="flex items-center gap-2">
              <DrawerClose asChild>
                <Button variant="ghost" size="sm">
                  Cancel
                </Button>
              </DrawerClose>
              <Button size="sm" onClick={handlePost} disabled={!canPost}>
                Post
              </Button>
            </div>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
