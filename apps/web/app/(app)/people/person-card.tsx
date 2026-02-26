import { Avatar } from "@/components/ui/avatar";
import type { Profile } from "@/lib/domains/profile/types";

type PersonCardProps = {
  address: string;
  profile: Profile;
  subtitle: React.ReactNode;
};

export function PersonCard({ address, profile, subtitle }: PersonCardProps) {
  return (
    <a
      href={profile.url}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:bg-muted/50 flex items-center gap-3 rounded-lg border p-4 transition-colors"
    >
      <Avatar size={48} src={profile.avatar} fallback={address} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{profile.name}</div>
        <div className="text-muted-foreground text-sm">{subtitle}</div>
      </div>
    </a>
  );
}
