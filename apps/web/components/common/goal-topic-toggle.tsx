import type { LucideIcon } from "lucide-react";

export type GoalTopicOption<Id extends string = string> = {
  id: Id;
  label: string;
  blurb: string;
  icon: LucideIcon;
};

type GoalTopicToggleProps<Id extends string> = {
  topics: GoalTopicOption<Id>[];
  value: Id;
  onChange: (id: Id) => void;
};

export function GoalTopicToggle<Id extends string>({
  topics,
  value,
  onChange,
}: GoalTopicToggleProps<Id>) {
  return (
    <div className="flex flex-wrap gap-2">
      {topics.map((topic) => {
        const isActive = value === topic.id;
        const Icon = topic.icon;
        return (
          <button
            key={topic.id}
            type="button"
            onClick={() => onChange(topic.id)}
            aria-pressed={isActive}
            className={`group flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium tracking-wide uppercase transition-all duration-200 focus-visible:ring-1 focus-visible:ring-white/50 focus-visible:outline-none ${
              isActive
                ? "border border-white/30 bg-white/10 text-white"
                : "border border-white/10 bg-white/[0.03] text-white/50 hover:border-white/20 hover:bg-white/[0.06] hover:text-white/80"
            }`}
          >
            <Icon className="size-3.5" />
            <span>{topic.label}</span>
          </button>
        );
      })}
    </div>
  );
}
