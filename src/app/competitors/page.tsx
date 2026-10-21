import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { CompetitorsContent } from "./competitors-content";
import { Loader2 } from "lucide-react";

export default function CompetitorsPage() {
  return (
    <div className="flex flex-col flex-1">
      <Header title="Competitor Intelligence" subtitle="Track product updates, lead magnets, and social activity" />
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
          </div>
        }
      >
        <CompetitorsContent />
      </Suspense>
    </div>
  );
}
