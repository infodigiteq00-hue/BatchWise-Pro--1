import { createFileRoute } from "@tanstack/react-router";
import { useStore, getState } from "@/lib/store";
import { updateRequestStampedPdf } from "@/lib/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fmtDateTime } from "@/lib/format";
import { stampPdf } from "@/lib/pdf";
import { resolveTemplatePdfDataUrl } from "@/lib/templatePdf";
import {
  getStampedPdfDownloadUrl,
  getStampedPdfPreviewUrl,
} from "@/lib/api/client";
import { Eye, Download, Printer, History } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { BMRRequest } from "@/lib/store";

export const Route = createFileRoute("/qa/approved")({
  component: Approved,
});

function Approved() {
  const requests = useStore((s) => s.requests).filter((r) => r.status === "approved");
  const [viewing, setViewing] = useState<BMRRequest | null>(null);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Approved BMRs</CardTitle>
          <p className="text-sm text-muted-foreground">View, download, or print the issued BMR. Hold <kbd className="rounded border bg-muted px-1 text-[10px]">Shift</kbd> while clicking Print to use the original approval timestamp (audit reprint).</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4">Product</th>
                  <th className="py-2 pr-4">Batch</th>
                  <th className="py-2 pr-4">Approved By</th>
                  <th className="py-2 pr-4">Approved At</th>
                  <th className="py-2 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No approved BMRs yet.</td></tr>
                )}
                {requests.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-3 pr-4 font-medium">{r.productName}</td>
                    <td className="py-3 pr-4">{r.batchNumber}</td>
                    <td className="py-3 pr-4">{r.approval?.approvedBy}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{r.approval && fmtDateTime(r.approval.approvedAt)}</td>
                    <td className="py-3 pr-4 text-right">
                      <div className="inline-flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => setViewing(r)}><Eye className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="outline" onClick={() => downloadPdf(r)}><Download className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" onClick={(e) => printPdf(r, e.shiftKey)} title="Click: print with current time. Shift+Click: reprint with original approval time.">
                          <Printer className="h-3.5 w-3.5" />
                          {/* hidden visual cue */}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-md border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
            <History className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <b>Print modes:</b> Normal print stamps the <i>current</i> date/time. <b>Shift + Print</b> = audit reprint that uses the <i>original approval</i> timestamp (no print-time footer).
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader><DialogTitle>{viewing?.productName} — {viewing?.batchNumber}</DialogTitle></DialogHeader>
          {viewing?.approval && (
            <iframe
              src={getStampedPdfPreviewUrl(viewing.id)}
              title={`BMR ${viewing.batchNumber}`}
              className="h-[75vh] w-full rounded-md border"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function downloadPdf(r: BMRRequest) {
  if (!r.approval) return;
  const a = document.createElement("a");
  a.href = getStampedPdfDownloadUrl(r.id);
  a.download = `BMR_${r.productName.replace(/\s+/g, "_")}_${r.batchNumber}.pdf`;
  a.rel = "noopener noreferrer";
  a.click();
}

async function printPdf(r: BMRRequest, useOriginalTime: boolean) {
  if (!r.approval) return;
  try {
    const { templates, signatures } = getState();
    const template = templates.find((t) => t.productName === r.productName);
    let pdfUrl = getStampedPdfPreviewUrl(r.id);

    if (!useOriginalTime && template) {
      // Re-stamp with current print time footer
      const sourcePdf = await resolveTemplatePdfDataUrl(template);
      pdfUrl = await stampPdf(sourcePdf, {
        batchNumber: r.batchNumber,
        approvalDateTime: fmtDateTime(r.approval.approvedAt),
        approvedByName: r.approval.approvedBy,
        signatureDataUrl: r.approval.signatureId
          ? signatures.find((s) => s.id === r.approval!.signatureId)?.imageDataUrl
          : undefined,
        printDateTime: fmtDateTime(new Date().toISOString()),
      });
      toast.success("Printing with current date/time");
    } else if (useOriginalTime) {
      toast.success("Audit reprint — using original approval time");
    }

    const w = window.open(pdfUrl, "_blank");
    if (w) setTimeout(() => { try { w.print(); } catch {} }, 700);

    // Persist re-stamped pdf so view is consistent
    if (!useOriginalTime && template) {
      await updateRequestStampedPdf(r.id, pdfUrl);
    }
  } catch (e: any) {
    toast.error("Print failed: " + e.message);
  }
}
