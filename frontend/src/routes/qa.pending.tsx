import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { approveBmrRequest, rejectBmrRequest } from "@/lib/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { fmtDateTime } from "@/lib/format";
import { stampPdf } from "@/lib/pdf";
import { resolveTemplatePdfDataUrl } from "@/lib/templatePdf";
import { useState } from "react";
import { toast } from "sonner";
import type { BMRRequest } from "@/lib/store";

export const Route = createFileRoute("/qa/pending")({
  component: Pending,
});

function Pending() {
  const requests = useStore((s) => s.requests).filter((r) => r.status === "pending");
  const [approveTarget, setApproveTarget] = useState<BMRRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<BMRRequest | null>(null);

  return (
    <>
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Pending" value={requests.length} accent="amber" />
        <Stat label="Approved (today)" value={useApprovedToday()} accent="emerald" />
        <Stat label="Total Requests" value={useStore((s) => s.requests.length)} accent="sky" />
      </div>
      <Card>
        <CardHeader><CardTitle>Pending BMR Requests</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4">Product</th>
                  <th className="py-2 pr-4">Batch</th>
                  <th className="py-2 pr-4">Requested By</th>
                  <th className="py-2 pr-4">Requested At</th>
                  <th className="py-2 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No pending requests.</td></tr>
                )}
                {requests.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-3 pr-4 font-medium">{r.productName}</td>
                    <td className="py-3 pr-4">{r.batchNumber}</td>
                    <td className="py-3 pr-4">{r.requestedBy}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{fmtDateTime(r.requestedAt)}</td>
                    <td className="py-3 pr-4 text-right space-x-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => setRejectTarget(r)}>Reject</Button>
                      <Button type="button" size="sm" onClick={() => setApproveTarget(r)}>Approve</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ApproveDialog req={approveTarget} onClose={() => setApproveTarget(null)} />
      <RejectDialog req={rejectTarget} onClose={() => setRejectTarget(null)} />
    </>
  );
}

function useApprovedToday() {
  const reqs = useStore((s) => s.requests);
  const today = new Date().toDateString();
  return reqs.filter((r) => r.status === "approved" && r.approval && new Date(r.approval.approvedAt).toDateString() === today).length;
}

function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  const colors: Record<string, string> = {
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    sky: "border-sky-200 bg-sky-50 text-sky-900",
  };
  return (
    <div className={`rounded-lg border p-4 ${colors[accent]}`}>
      <div className="text-xs uppercase tracking-wider opacity-70">{label}</div>
      <div className="mt-1 text-3xl font-bold">{value}</div>
    </div>
  );
}

function ApproveDialog({ req, onClose }: { req: BMRRequest | null; onClose: () => void }) {
  const templates = useStore((s) => s.templates);
  const signatures = useStore((s) => s.signatures);
  const qaUser = useStore((s) => s.qaUser);
  const [expectedDate, setExpectedDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [signatureId, setSignatureId] = useState<string>(signatures[0]?.id ?? "");
  const [busy, setBusy] = useState(false);

  if (!req) return null;
  const template = templates.find((t) => t.productName === req.productName);

  const approve = async () => {
    if (!template) {
      toast.error(`No template found for "${req.productName}". Upload one in Admin → Templates.`);
      return;
    }
    setBusy(true);
    try {
      const approvedAt = new Date().toISOString();
      const sig = signatures.find((s) => s.id === signatureId);
      const sourcePdf = await resolveTemplatePdfDataUrl(template);
      const stamped = await stampPdf(sourcePdf, {
        batchNumber: req.batchNumber,
        approvalDateTime: fmtDateTime(approvedAt),
        approvedByName: qaUser,
        signatureDataUrl: sig?.imageDataUrl,
      });
      await approveBmrRequest(req.id, {
        approvedBy: qaUser,
        approvedAt,
        expectedSubmission: expectedDate || undefined,
        remarks: remarks || undefined,
        signatureId: sig?.id,
        stampedPdfDataUrl: stamped,
      });
      toast.success("BMR approved & stamped PDF generated");
      onClose();
      setExpectedDate(""); setRemarks("");
    } catch (e: any) {
      toast.error("Failed to stamp PDF: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!req} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Approve BMR Request</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="rounded-md border bg-muted/30 p-3">
            <div><span className="text-muted-foreground">Product:</span> <b>{req.productName}</b></div>
            <div><span className="text-muted-foreground">Batch:</span> {req.batchNumber} · <span className="text-muted-foreground">Size:</span> {req.batchSize}</div>
            <div className="text-xs text-muted-foreground mt-1">Requested by {req.requestedBy} · {fmtDateTime(req.requestedAt)}</div>
          </div>
          {!template && <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">No template mapped to this product. Add one in Admin → Templates.</div>}
          <div className="space-y-1.5">
            <Label>Expected Submission Date</Label>
            <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Signature</Label>
            <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={signatureId} onChange={(e) => setSignatureId(e.target.value)}>
              <option value="">— None (text placeholder) —</option>
              {signatures.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Remarks</Label>
            <Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" disabled={busy || !template} onClick={approve}>{busy ? "Stamping…" : "Approve & Issue"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RejectDialog({ req, onClose }: { req: BMRRequest | null; onClose: () => void }) {
  const qaUser = useStore((s) => s.qaUser);
  const [reason, setReason] = useState("");
  if (!req) return null;
  const reject = async () => {
    try {
      await rejectBmrRequest(req.id, {
        rejectedBy: qaUser,
        rejectedAt: new Date().toISOString(),
        reason,
      });
      toast.success("Request rejected");
      onClose();
      setReason("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to reject");
    }
  };
  return (
    <Dialog open={!!req} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Reject BMR Request</DialogTitle></DialogHeader>
        <Textarea placeholder="Reason for rejection" value={reason} onChange={(e) => setReason(e.target.value)} />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" variant="destructive" onClick={reject}>Reject</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
