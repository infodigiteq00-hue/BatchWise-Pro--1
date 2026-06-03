import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import * as api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Building2, Pause, Pencil, Play, Plus, Trash2, UserPlus } from "lucide-react";

export const Route = createFileRoute("/super-admin/")({
  component: SuperAdminDashboard,
});

type Status = "active" | "inactive" | "paused";
type UnifiedStatus = Status | "pending_signup";

function getUnifiedStatus(company: api.CompanyRecord): UnifiedStatus {
  return company.status as UnifiedStatus;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-800",
    inactive: "bg-slate-100 text-slate-700",
    paused: "bg-amber-100 text-amber-800",
    pending_signup: "bg-sky-100 text-sky-800",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${styles[status] || "bg-muted text-muted-foreground"}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function SuperAdminDashboard() {
  const [data, setData] = useState<api.SuperAdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const [faCompany, setFaCompany] = useState("");
  const [faEmail, setFaEmail] = useState("");
  const [faContact, setFaContact] = useState("");
  const [faBusy, setFaBusy] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editTarget, setEditTarget] = useState<{
    company: api.CompanyRecord;
    admin: api.FirmAdminRecord | null;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api.getSuperAdminDashboard());
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createFirmAdmin = async () => {
    if (!faCompany.trim() || !faEmail.trim() || !faContact.trim()) {
      toast.error("Company name, email, and contact number are required");
      return false;
    }
    setFaBusy(true);
    try {
      await api.createSuperAdminFirmAdmin({
        name: faCompany.trim(),
        companyName: faCompany.trim(),
        email: faEmail.trim(),
        contactNumber: faContact.trim(),
      });
      toast.success("Firm admin created — they can complete signup");
      setFaCompany("");
      setFaEmail("");
      setFaContact("");
      await load();
      return true;
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create firm admin");
      return false;
    } finally {
      setFaBusy(false);
    }
  };

  const setMappedStatus = async (companyId: string, status: Status) => {
    try {
      await api.setSuperAdminCompanyStatus(companyId, status);
      toast.success(`Status updated to ${status}`);
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  if (loading && !data) {
    return <p className="text-sm text-muted-foreground">Loading dashboard…</p>;
  }

  const getAdminForCompany = (companyName: string) =>
    data?.firmAdmins.find(
      (a) =>
        (a.companyName || "").trim().toLowerCase() ===
        companyName.trim().toLowerCase(),
    );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Super Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Manage companies, firm admins, and access control.
        </p>
      </div>

      {data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Companies" value={data.totals.companies} />
          <StatCard label="Firm admins" value={data.totals.firmAdmins} />
          <StatCard label="Pending signup" value={data.totals.pendingFirmAdmins} />
          <StatCard label="Team members" value={data.totals.teamMembers} />
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Companies & Firm Admins
            </CardTitle>
          </div>
          <Button type="button" onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create company
          </Button>
        </CardHeader>
        <CardContent>
            {!data?.companies.length ? (
              <p className="text-sm text-muted-foreground">No companies yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-4">Company</th>
                      <th className="py-2 pr-4">Firm admin</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Members</th>
                      <th className="py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.companies.map((c) => {
                      const admin = getAdminForCompany(c.companyName);
                      const status = getUnifiedStatus(c);
                      return (
                        <tr key={c.id} className="border-b last:border-0">
                          <td className="py-3 pr-4 font-medium">{c.companyName}</td>
                          <td className="py-3 pr-4">
                            {admin ? (
                              <div className="space-y-0.5">
                                <div>{admin.name || "-"}</div>
                                <div className="text-xs text-muted-foreground">
                                  {admin.email}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Not assigned</span>
                            )}
                          </td>
                          <td className="py-3 pr-4">
                            <StatusBadge status={status} />
                          </td>
                          <td className="py-3 pr-4">{c.teamMemberCount ?? 0}</td>
                          <td className="py-3 text-right">
                            <div className="flex justify-end gap-2 flex-wrap">
                              <Button
                                size="sm"
                                variant="outline"
                                title="Edit mapped details"
                                onClick={() => setEditTarget({ company: c, admin })}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              {status !== "pending_signup" &&
                                (status !== "paused" ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    title="Pause"
                                    onClick={() => void setMappedStatus(c.id, "paused")}
                                  >
                                    <Pause className="h-3.5 w-3.5" />
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    title="Activate"
                                    onClick={() => void setMappedStatus(c.id, "active")}
                                  >
                                    <Play className="h-3.5 w-3.5" />
                                  </Button>
                                ))}
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Delete mapped record"
                                onClick={async () => {
                                  const msg = admin
                                    ? "Delete this company and mapped firm admin?"
                                    : "Delete this company and all its users?";
                                  if (!confirm(msg)) return;
                                  try {
                                    await api.deleteSuperAdminCompany(c.id);
                                    toast.success(
                                      admin
                                        ? "Company and mapped firm admin deleted"
                                        : "Company deleted",
                                    );
                                    await load();
                                  } catch (e: unknown) {
                                    toast.error(
                                      e instanceof Error ? e.message : "Delete failed",
                                    );
                                  }
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
      </Card>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Create company
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Company name</Label>
              <Input value={faCompany} onChange={(e) => setFaCompany(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Firm admin email</Label>
              <Input type="email" value={faEmail} onChange={(e) => setFaEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Contact number</Label>
              <Input value={faContact} onChange={(e) => setFaContact(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button
              disabled={faBusy}
              onClick={async () => {
                const ok = await createFirmAdmin();
                if (ok) setShowCreateModal(false);
              }}
            >
              {faBusy ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CommonEditDialog
        target={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={load}
      />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="mt-1 text-3xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function CommonEditDialog({
  target,
  onClose,
  onSaved,
}: {
  target: { company: api.CompanyRecord; admin: api.FirmAdminRecord | null } | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [companyName, setCompanyName] = useState("");
  const [status, setStatus] = useState<UnifiedStatus>("active");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminContact, setAdminContact] = useState("");

  useEffect(() => {
    if (!target) return;
    setCompanyName(target.company.companyName);
    setStatus(getUnifiedStatus(target.company));
    setAdminName(target.admin?.name || "");
    setAdminEmail(target.admin?.email || "");
    setAdminContact(target.admin?.contactNumber || "");
  }, [target]);

  if (!target) return null;

  const save = async () => {
    try {
      if (status !== "pending_signup") {
        await api.updateSuperAdminCompany(target.company.id, {
          companyName,
          status,
        });
      } else {
        await api.updateSuperAdminCompany(target.company.id, { companyName });
      }
      if (target.admin) {
        await api.updateSuperAdminFirmAdmin(target.admin.id, {
          name: adminName,
          email: adminEmail,
          contactNumber: adminContact,
          companyName,
          ...(status !== "pending_signup" ? { status } : {}),
        });
      }
      toast.success("Record updated");
      onClose();
      await onSaved();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit company details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Company name</Label>
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            {status === "pending_signup" ? (
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                Pending signup (changes after firm admin completes signup)
              </div>
            ) : (
              <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {target.admin ? (
            <>
              <div className="space-y-1.5">
                <Label>Firm admin name</Label>
                <Input value={adminName} onChange={(e) => setAdminName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Firm admin email</Label>
                <Input value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Contact number</Label>
                <Input value={adminContact} onChange={(e) => setAdminContact(e.target.value)} />
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              No firm admin is mapped to this company yet.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void save()}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
