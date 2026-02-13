type LayoutProps = {
  children: React.ReactNode;
};

export default function ChatLayout({ children }: LayoutProps) {
  return <div className="h-[calc(100dvh-65px)] min-h-0 w-full">{children}</div>;
}
