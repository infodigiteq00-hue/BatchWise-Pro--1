import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { toast } from "sonner";
import * as api from "@/lib/api";
import { Users, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/teams")({
  component: TeamsPage,
});

function StatusBadge({ status }: { status?: string }) {
  if (!status || status === "active") return null;
  const styles: Record<string, string> = {
    pending_signup: "bg-sky-100 text-sky-800",
    inactive: "bg-slate-100 text-slate-700",
    paused: "bg-amber-100 text-amber-800",
  };
  return (
    <span
      className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${styles[status] || "bg-muted text-muted-foreground"}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function TeamsPage() {
  const [members, setMembers] = useState<api.TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [department, setDepartment] = useState<"production" | "qaqc">(
    "production",
  );

  const loadMembers = async () => {
    setLoading(true);
    try {
      setMembers(await api.getTeams());
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load team");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMembers();
  }, []);

  const addMember = async () => {
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setSaving(true);
    try {
      const created = await api.createTeamMember({
        name: name.trim(),
        email: email.trim(),
        contactNumber: contactNumber.trim() || undefined,
        department,
      });
      setMembers((prev) => [created, ...prev]);
      setName("");
      setEmail("");
      setContactNumber("");
      setDepartment("production");
      toast.success("Team member invited — they can sign up with this email");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to add team member");
    } finally {
      setSaving(false);
    }
  };

  const removeMember = async (id: string) => {
    try {
      await api.deleteTeamMember(id);
      setMembers((prev) => prev.filter((m) => m.id !== id));
      toast.success("Team member removed");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to remove team member");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Users in your company. Production users can access only Production, QA/QC users can access only QA/QC.
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading team members...</p>
          ) : members.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              No team members added yet.
            </div>
          ) : (
            <div className="space-y-2">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 rounded-md border p-3"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      {m.name}
                      <StatusBadge status={m.status} />
                    </div>
                    <div className="text-xs text-muted-foreground">{m.email}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Department:{" "}
                      <span className="font-medium text-foreground">
                        {m.department === "qaqc" ? "QA / QC" : "Production"}
                      </span>
                      {m.contactNumber ? ` · ${m.contactNumber}` : ""}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => void removeMember(m.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add Team Member</CardTitle>
          <p className="text-xs text-muted-foreground">
            Add the member here. They will set their own password on the sign-up page.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ravi Kumar"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@company.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Contact Number</Label>
            <Input
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Department</Label>
            <Select
              value={department}
              onValueChange={(v) => setDepartment(v as "production" | "qaqc")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="production">Production</SelectItem>
                <SelectItem value="qaqc">QA / QC</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" disabled={saving} onClick={() => void addMember()}>
            {saving ? "Adding..." : "Add Member"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
