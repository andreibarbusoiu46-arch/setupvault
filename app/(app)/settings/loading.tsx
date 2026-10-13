import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-80" />
      </div>

      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} className="flex flex-col gap-4 p-5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-64" />
          <Skeleton className="h-20 w-full" />
        </Card>
      ))}
    </div>
  );
}
