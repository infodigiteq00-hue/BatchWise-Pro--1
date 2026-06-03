import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtDateTime } from "@/lib/format";

export const Route = createFileRoute("/production/history")({
  component: History,
});

function History() {
  const requests = useStore((s) => s.requests);
  return (
    <Card>
      <CardHeader><CardTitle>My BMR Requests</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-2 pr-4">Product</th>
                <th className="py-2 pr-4">Batch</th>
                <th className="py-2 pr-4">Department</th>
                <th className="py-2 pr-4">Requested</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">No requests yet.</td></tr>
              )}
              {requests.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="py-3 pr-4 font-medium">{r.productName}</td>
                  <td className="py-3 pr-4">{r.batchNumber}</td>
                  <td className="py-3 pr-4">{r.department}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{fmtDateTime(r.requestedAt)}</td>
                  <td className="py-3 pr-4"><Badge s={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function Badge({ s }: { s: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    approved: "bg-emerald-100 text-emerald-800",
    rejected: "bg-rose-100 text-rose-800",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${map[s]}`}>{s}</span>;
}
