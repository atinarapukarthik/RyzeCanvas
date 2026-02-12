import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchHistory } from "@/lib/api";
import { Search, Calendar, Wand2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

export default function HistoryPage() {
  const [search, setSearch] = useState("");
  const { data: projects, isLoading } = useQuery({ queryKey: ["history"], queryFn: fetchHistory });

  const filtered = projects?.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.prompt.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">History</h1>
        <p className="text-sm text-muted-foreground mt-1">Your past AI generations</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search generations…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <ScrollArea className="h-[calc(100vh-14rem)]">
        <div className="space-y-3">
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          {filtered?.map((p) => (
            <div key={p.id} className="glass-card p-4 flex items-start gap-4 hover:border-primary/30 transition-colors cursor-pointer">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Wand2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm">{p.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.prompt}</p>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {new Date(p.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
          {filtered?.length === 0 && !isLoading && (
            <p className="text-center text-sm text-muted-foreground py-8">No results found</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
