import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtDateTime } from "@/lib/format";

export const Route = createFileRoute("/qa/rejected")({
  component: Rejected,
});

function Rejected() {
  const requests = useStore((s) => s.requests).filter((r) => r.status === "rejected");
  return (
    <Card>
      <CardHeader><CardTitle>Rejected Requests</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-2 pr-4">Product</th>
                <th className="py-2 pr-4">Batch</th>
                <th className="py-2 pr-4">Rejected By</th>
                <th className="py-2 pr-4">When</th>
                <th className="py-2 pr-4">Reason</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">None.</td></tr>}
              {requests.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="py-3 pr-4 font-medium">{r.productName}</td>
                  <td className="py-3 pr-4">{r.batchNumber}</td>
                  <td className="py-3 pr-4">{r.rejection?.rejectedBy}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{r.rejection && fmtDateTime(r.rejection.rejectedAt)}</td>
                  <td className="py-3 pr-4">{r.rejection?.reason || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
