import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, errorMessage, tint } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import {
  AccessDenied,
  ConfirmAction,
  EmptyState,
  Loading,
  PageHeader,
  PupilAvatar,
  SampleBadge,
  SectionCard,
} from "@/components/common";

export default function Pupils() {
  const { can } = useApp();
  const [pupils, setPupils] = useState(null);
  const [groups, setGroups] = useState([]);
  const [draft, setDraft] = useState({ first_name: "", last_initial: "" });
  const [groupName, setGroupName] = useState("");

  const canEdit = can("pupil.edit");

  const load = useCallback(async () => {
    try {
      const [p, g] = await Promise.all([api.get("/pupils"), api.get("/pupils/groups")]);
      setPupils(p.data);
      setGroups(g.data);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!can("pupil.view")) return <AccessDenied what="pupil records" />;
  if (!pupils) return <Loading label="Loading pupils" />;

  return (
    <div className="wp-stack">
      <PageHeader
        eyebrow="Our class"
        title="Pupils"
        description="Avatars are used by default. Photographs are optional, access controlled, and can be switched off per context."
      />

      <SectionCard title={`${pupils.length} pupils`} testId="pupil-grid">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {pupils.map((p) => (
            <Link key={p.id} to={`/pupils/${p.id}`} className="wp-card flex items-center gap-3 p-4 transition-shadow duration-200 hover:shadow-[var(--wp-shadow-md)]" data-testid="pupil-card">
              <PupilAvatar pupil={p} size={56} context="profile" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold">{p.display_name}</p>
                  {p.is_sample ? <SampleBadge /> : null}
                </div>
                <p className="text-xs text-[hsl(var(--wp-ink-muted))]">
                  {p.has_photo ? "Photograph stored" : "Avatar only"}
                </p>
              </div>
            </Link>
          ))}
          {!pupils.length ? (
            <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4">
              <EmptyState title="No pupils yet" description="Add the pupils in your provision." />
            </div>
          ) : null}
        </div>

        {canEdit ? (
          <div className="mt-4 flex flex-wrap items-end gap-3 rounded-[var(--wp-radius-lg)] border border-dashed border-[hsl(var(--border))] p-3">
            <div>
              <Label htmlFor="pupil-first">First name</Label>
              <Input
                id="pupil-first"
                value={draft.first_name}
                onChange={(e) => setDraft({ ...draft, first_name: e.target.value })}
                className="mt-1.5 w-[170px]"
                data-testid="new-pupil-first-name"
              />
            </div>
            <div>
              <Label htmlFor="pupil-last">Last initial</Label>
              <Input
                id="pupil-last"
                value={draft.last_initial}
                maxLength={2}
                onChange={(e) => setDraft({ ...draft, last_initial: e.target.value })}
                className="mt-1.5 w-[110px]"
                data-testid="new-pupil-last-initial"
              />
            </div>
            <Button
              onClick={async () => {
                if (!draft.first_name.trim()) {
                  toast.error("Enter a first name");
                  return;
                }
                await api.post("/pupils", draft);
                toast.success("Pupil added");
                setDraft({ first_name: "", last_initial: "" });
                load();
              }}
              data-testid="add-pupil"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Add pupil
            </Button>
            <p className="text-xs text-[hsl(var(--wp-ink-muted))]">
              Only a first name and an initial are stored. Keep information to what is needed.
            </p>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Groups"
        description="Group pupils however you work — by table, by support need, by activity."
        symbol={<Users className="h-5 w-5" aria-hidden="true" />}
        testId="pupil-groups"
      >
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <li
              key={g.id}
              className="rounded-[var(--wp-radius-xl)] border border-[hsl(var(--border))] p-4"
              style={{ backgroundColor: tint(g.colour) }}
              data-testid="group-card"
            >
              <div className="flex items-center gap-2">
                {canEdit ? (
                  <Input
                    defaultValue={g.name}
                    onBlur={async (e) => {
                      if (e.target.value === g.name) return;
                      await api.patch(`/pupils/groups/${g.id}`, { name: e.target.value });
                      toast.success("Group renamed");
                      load();
                    }}
                    className="h-9 bg-white"
                    data-testid="group-name-input"
                  />
                ) : (
                  <p className="flex-1 font-semibold">{g.name}</p>
                )}
                {g.is_sample ? <SampleBadge /> : null}
                {canEdit ? (
                  <ConfirmAction
                    trigger={
                      <Button variant="ghost" size="sm" data-testid="group-delete">
                        Delete
                      </Button>
                    }
                    title={`Delete the ${g.name} group?`}
                    description="Pupils are not deleted, only the grouping."
                    onConfirm={async () => {
                      await api.delete(`/pupils/groups/${g.id}`);
                      load();
                    }}
                  />
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {pupils.map((p) => {
                  const inGroup = (g.pupil_ids || []).includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={!canEdit}
                      onClick={async () => {
                        const next = inGroup
                          ? (g.pupil_ids || []).filter((x) => x !== p.id)
                          : [...(g.pupil_ids || []), p.id];
                        await api.patch(`/pupils/groups/${g.id}`, { pupil_ids: next });
                        load();
                      }}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                        inGroup
                          ? "border-[hsl(var(--wp-teal))] bg-white"
                          : "border-[hsl(var(--border))] bg-white/60 opacity-60"
                      }`}
                      data-testid="group-member-toggle"
                    >
                      {p.first_name}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
        {canEdit ? (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor="new-group">New group</Label>
              <Input
                id="new-group"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="mt-1.5 w-[190px]"
                data-testid="new-group-name"
              />
            </div>
            <Button
              onClick={async () => {
                if (!groupName.trim()) return;
                await api.post("/pupils/groups", { name: groupName.trim(), pupil_ids: [] });
                toast.success("Group created");
                setGroupName("");
                load();
              }}
              data-testid="add-group"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Add group
            </Button>
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}
