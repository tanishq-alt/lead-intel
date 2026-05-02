import { Badge } from "@/components/ui/badge";

export interface ChannelConfig {
  id: string;
  name: string;
  description: string;
  category: "high-intent" | "mid-intent" | "advanced";
  enabled: boolean;
  leadsFound?: number;
  lastRun?: string;
  icon: string;
}

interface ChannelCardProps {
  channel: ChannelConfig;
}

const categoryLabels = {
  "high-intent": { label: "High Intent", variant: "success" as const },
  "mid-intent": { label: "Mid Intent", variant: "warning" as const },
  advanced: { label: "Advanced", variant: "purple" as const },
};

export function ChannelCard({ channel }: ChannelCardProps) {
  const cat = categoryLabels[channel.category];

  return (
    <div
      className={`bg-gray-900 border rounded-xl p-4 flex flex-col gap-3 transition-colors ${
        channel.enabled
          ? "border-gray-700 hover:border-gray-600"
          : "border-gray-800 opacity-60"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="text-xl leading-none">{channel.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">
                {channel.name}
              </span>
              {channel.enabled && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
              )}
            </div>
            <Badge variant={cat.variant} className="mt-0.5">
              {cat.label}
            </Badge>
          </div>
        </div>

        <div
          className={`w-8 h-5 rounded-full flex-shrink-0 relative cursor-pointer transition-colors ${
            channel.enabled ? "bg-violet-600" : "bg-gray-700"
          }`}
          role="switch"
          aria-checked={channel.enabled}
        >
          <div
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              channel.enabled ? "translate-x-3" : "translate-x-0.5"
            }`}
          />
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-gray-400 leading-relaxed">
        {channel.description}
      </p>

      {/* Stats */}
      {channel.enabled && (
        <div className="flex items-center gap-4 pt-1 border-t border-gray-800">
          {channel.leadsFound !== undefined && (
            <div>
              <div className="text-sm font-semibold text-white">
                {channel.leadsFound}
              </div>
              <div className="text-[10px] text-gray-500">leads found</div>
            </div>
          )}
          {channel.lastRun && (
            <div>
              <div className="text-xs text-gray-400">{channel.lastRun}</div>
              <div className="text-[10px] text-gray-500">last run</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
