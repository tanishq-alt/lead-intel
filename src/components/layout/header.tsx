import { ReactNode } from "react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <div className="h-16 flex items-center justify-between px-6 border-b border-gray-800 bg-gray-950 flex-shrink-0">
      <div>
        <h1 className="text-base font-semibold text-white leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
