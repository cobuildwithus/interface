type LayoutProps = {
  children: React.ReactNode;
};

export default function GoalChatLayout({ children }: LayoutProps) {
  return <div className="flex min-h-0 flex-1 overflow-hidden">{children}</div>;
}
