import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { submitBmrRequest } from "@/lib/actions";
import { toast } from "sonner";

export const Route = createFileRoute("/production/newrequest")({
  component: NewRequestPage,
});

function NewRequestPage() {
  const templates = useStore((s) => s.templates);
  const productionUser = useStore((s) => s.productionUser);
  const requests = useStore((s) => s.requests);

  const [productName, setProductName] = useState("");
  const [department, setDepartment] = useState("Production");
  const [batchNumber, setBatchNumber] = useState("");
  const [batchSize, setBatchSize] = useState("");
  const [remarks, setRemarks] = useState("");

  const productOptions = templates.map((t) => t.productName);

  const submit = async () => {
    if (!productName || !batchNumber || !batchSize) {
      toast.error("Please fill all required fields");
      return;
    }
    try {
      await submitBmrRequest({
        productName,
        department,
        batchNumber,
        batchSize,
        remarks: remarks || undefined,
        requestedBy: productionUser,
      });
      toast.success("BMR request submitted to QA/QC");
      setProductName("");
      setBatchNumber("");
      setBatchSize("");
      setRemarks("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to submit request");
    }
  };

  const myRecent = requests.slice(0, 5);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Request Blank BMR</CardTitle>
          <p className="text-sm text-muted-foreground">Production submits this form to QA/QC for approval & issuance.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Product Name *</Label>
              {productOptions.length > 0 ? (
                <Select value={productName} onValueChange={setProductName}>
                  <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>
                    {productOptions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="No templates yet — type product name" />
              )}
              {productOptions.length === 0 && (
                <p className="text-xs text-amber-600">Tip: Admin should upload BMR templates first.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Department *</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Production">Production</SelectItem>
                  <SelectItem value="Granulation">Granulation</SelectItem>
                  <SelectItem value="Compression">Compression</SelectItem>
                  <SelectItem value="Coating">Coating</SelectItem>
                  <SelectItem value="Packing">Packing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Batch Number *</Label>
              <Input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} placeholder="e.g. RP24A001" />
            </div>
            <div className="space-y-1.5">
              <Label>Batch Size *</Label>
              <Input value={batchSize} onChange={(e) => setBatchSize(e.target.value)} placeholder="e.g. 100,000 tablets" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Remarks</Label>
            <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional notes for QA/QC" rows={3} />
          </div>
          <div className="flex justify-end pt-2">
            <Button type="button" size="lg" onClick={submit}>Request BMR</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent Requests</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {myRecent.length === 0 && <p className="text-sm text-muted-foreground">No requests yet.</p>}
          {myRecent.map((r) => (
            <div key={r.id} className="rounded-md border p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{r.productName}</span>
                <StatusBadge status={r.status} />
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Batch: {r.batchNumber}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    approved: "bg-emerald-100 text-emerald-800",
    rejected: "bg-rose-100 text-rose-800",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${map[status]}`}>{status}</span>;
}
