import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { LeadsContent } from "./leads-content";
import { Loader2 } from "lucide-react";

export default function LeadsPage() {
  return (
    <div className="flex flex-col flex-1">
      <Header title="Leads" subtitle="High-intent prospects" />
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
          </div>
        }
      >
        <LeadsContent />
      </Suspense>
    </div>
  );
}
