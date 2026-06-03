import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { uploadTemplate, removeTemplate } from "@/lib/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getTemplatePdfPreviewUrl } from "@/lib/api/client";
import { fileToDataUrl, generateDemoBmrPdf } from "@/lib/pdf";
import { fmtDateTime } from "@/lib/format";
import { useEffect, useState } from "react";
import { ensureTemplatesLoaded } from "@/lib/actions";
import { toast } from "sonner";
import { Trash2, FileText, Sparkles } from "lucide-react";

export const Route = createFileRoute("/admin/templates")({
  beforeLoad: async () => {
    if (typeof window !== "undefined") {
      await ensureTemplatesLoaded();
    }
  },
  component: Templates,
});

function Templates() {
  const templates = useStore((s) => s.templates);
  const [listLoading, setListLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await ensureTemplatesLoaded();
      } catch (e: unknown) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Failed to load templates");
        }
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const [productName, setProductName] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const upload = async () => {
    if (!productName || !file) return toast.error("Product name and PDF required");
    setBusy(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      await uploadTemplate({
        productName,
        pdfDataUrl: dataUrl,
        validUntil: validUntil || undefined,
        uploadedAt: new Date().toISOString(),
      });
      toast.success("Template uploaded");
      setProductName(""); setValidUntil(""); setFile(null);
      (document.getElementById("tpl-file") as HTMLInputElement).value = "";
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally { setBusy(false); }
  };

  const generateDemo = async (name: string) => {
    setBusy(true);
    try {
      const dataUrl = await generateDemoBmrPdf(name);
      await uploadTemplate({
        productName: name,
        pdfDataUrl: dataUrl,
        uploadedAt: new Date().toISOString(),
      });
      toast.success(`Demo template generated: ${name}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to generate template");
    } finally { setBusy(false); }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>BMR Templates</CardTitle>
          <p className="text-sm text-muted-foreground">Each product has its own template. Templates remain blank — the system stamps them on issuance.</p>
        </CardHeader>
        <CardContent>
          {listLoading ? (
            <p className="text-sm text-muted-foreground">Loading templates…</p>
          ) : templates.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              No templates yet. Upload one or generate a demo →
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((t) => (
                <div key={t.id} className="flex items-center gap-3 rounded-md border p-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{t.productName}</div>
                    <div className="text-xs text-muted-foreground">
                      Uploaded {fmtDateTime(t.uploadedAt)}{t.validUntil ? ` · Valid till ${t.validUntil}` : ""}
                    </div>
                  </div>
                  <a
                    href={getTemplatePdfPreviewUrl(t.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary underline"
                  >
                    Preview
                  </a>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={async () => {
                      try {
                        await removeTemplate(t.id);
                      } catch (e: unknown) {
                        toast.error(e instanceof Error ? e.message : "Delete failed");
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Upload Template</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Product Name</Label>
              <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="e.g. Paracetamol 500mg" />
            </div>
            <div className="space-y-1.5">
              <Label>Valid Until</Label>
              <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>PDF File</Label>
              <Input id="tpl-file" type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
            <Button className="w-full" disabled={busy} onClick={upload}>Upload Template</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> Demo Templates</CardTitle>
            <p className="text-xs text-muted-foreground">Generate a realistic 4-page BMR for testing.</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {["Paracetamol 500mg Tablets", "Amoxicillin 250mg Capsules", "Cetirizine 10mg Tablets"].map((n) => (
              <Button key={n} variant="outline" className="w-full justify-start" disabled={busy} onClick={() => generateDemo(n)}>
                <FileText className="mr-2 h-4 w-4" /> {n}
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
