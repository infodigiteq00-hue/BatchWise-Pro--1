import { createFileRoute } from "@tanstack/react-router";
import { useStore, setState } from "@/lib/store";
import { addSignature, ensureSignaturesLoaded, removeSignature, saveQaUser } from "@/lib/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fileToDataUrl } from "@/lib/pdf";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/signatures")({
  beforeLoad: async () => {
    if (typeof window !== "undefined") {
      await ensureSignaturesLoaded();
    }
  },
  component: Signatures,
});

function Signatures() {
  const sigs = useStore((s) => s.signatures);
  const qaUser = useStore((s) => s.qaUser);

  useEffect(() => {
    void ensureSignaturesLoaded();
  }, []);

  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const upload = async () => {
    if (!name || !file) return toast.error("Name and image required");
    try {
      const dataUrl = await fileToDataUrl(file);
      await addSignature({ name, imageDataUrl: dataUrl });
      toast.success("Signature added");
      setName("");
      setFile(null);
      (document.getElementById("sig-file") as HTMLInputElement).value = "";
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to add signature");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle>Digital Signatures</CardTitle></CardHeader>
        <CardContent>
          {sigs.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">No signatures uploaded.</div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {sigs.map((s) => (
                <div key={s.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{s.name}</div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={async () => {
                        try {
                          await removeSignature(s.id);
                        } catch (e: unknown) {
                          toast.error(e instanceof Error ? e.message : "Delete failed");
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-2 flex h-16 items-center justify-center rounded bg-muted/40">
                    <img src={s.imageDataUrl} alt={s.name} className="max-h-14 object-contain" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Upload Signature</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Approver Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={qaUser} />
            </div>
            <div className="space-y-1.5">
              <Label>Signature Image (PNG/JPG)</Label>
              <Input id="sig-file" type="file" accept="image/png,image/jpeg" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
            <Button className="w-full" onClick={upload}>Add Signature</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>QA/QC Approver Name</CardTitle></CardHeader>
          <CardContent>
            <Input
              value={qaUser}
              onChange={(e) => setState({ qaUser: e.target.value })}
              onBlur={(e) => {
                saveQaUser(e.target.value).catch((err: unknown) => {
                  toast.error(err instanceof Error ? err.message : "Failed to save name");
                });
              }}
            />
            <p className="mt-2 text-xs text-muted-foreground">This name appears on stamped BMRs.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
