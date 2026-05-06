"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, X, Search, UserPlus, Shield } from "lucide-react";

interface UserRow {
  id: string;
  name: string;
  username: string;
  email: string;
  mobilePhone: string | null;
  isActive: boolean;
  creationDate: string;
  roles: { id: number; name: string }[];
}

interface Props {
  initialUsers: UserRow[];
  allRoles: { id: number; name: string }[];
}

const EMPTY_FORM = {
  name: "",
  username: "",
  email: "",
  mobilePhone: "",
  password: "",
  confirmPassword: "",
};

export function AdminUsersClient({ initialUsers, allRoles }: Props) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [managingUser, setManagingUser] = useState<UserRow | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [roleSelectValue, setRoleSelectValue] = useState("");

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  function setF(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setFormError("");
  }

  async function createUser() {
    if (!form.name || !form.username || !form.email || !form.password) {
      setFormError("Name, username, email, and password are required.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          username: form.username,
          email: form.email,
          mobilePhone: form.mobilePhone || null,
          password: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Failed to create user.");
        return;
      }
      const newUser: UserRow = {
        id: data.id,
        name: data.name,
        username: data.username,
        email: data.email,
        mobilePhone: data.mobilePhone ?? null,
        isActive: data.isActive,
        creationDate: data.creationDate,
        roles: (data.userRoles ?? []).map((ur: any) => ({ id: ur.roleId, name: ur.role.name })),
      };
      setUsers((prev) => [newUser, ...prev]);
      setForm(EMPTY_FORM);
      setShowCreate(false);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(user: UserRow) {
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isActive: !u.isActive } : u))
      );
    }
  }

  async function addRole(user: UserRow, roleId: number) {
    const alreadyHas = user.roles.some((r) => r.id === roleId);
    if (alreadyHas) return;
    const role = allRoles.find((r) => r.id === roleId);
    if (!role) return;
    const res = await fetch(`/api/users/${user.id}/roles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleId }),
    });
    if (res.ok) {
      const updated = { ...user, roles: [...user.roles, { id: role.id, name: role.name }] };
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
      setManagingUser(updated);
    }
  }

  async function removeRole(user: UserRow, roleId: number) {
    const res = await fetch(`/api/users/${user.id}/roles?roleId=${roleId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      const updated = { ...user, roles: user.roles.filter((r) => r.id !== roleId) };
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
      setManagingUser(updated);
    }
  }

  const availableRoles = managingUser
    ? allRoles.filter((r) => !managingUser.roles.some((ur) => ur.id === r.id))
    : [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-sm text-gray-500 mt-0.5">{users.length} users</p>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="gap-2 bg-[#0f1e35] hover:bg-[#1a2f4f]"
        >
          <UserPlus className="h-4 w-4" />
          New User
        </Button>
      </div>

      {/* Search */}
      <div className="relative w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* Users table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Name</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Username</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Email</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Roles</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  {search ? "No users match the search." : "No users found."}
                </td>
              </tr>
            ) : (
              filtered.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{user.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600 bg-gray-50/50">
                    {user.username}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{user.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {user.roles.length === 0 ? (
                        <span className="text-xs text-gray-400">No roles</span>
                      ) : (
                        user.roles.slice(0, 3).map((r) => (
                          <Badge key={r.id} variant="secondary" className="text-xs">
                            {r.name}
                          </Badge>
                        ))
                      )}
                      {user.roles.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{user.roles.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={user.isActive ? "on-time" : "secondary"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setManagingUser(user);
                          setRoleSelectValue("");
                        }}
                        className="h-7 text-xs gap-1"
                      >
                        <Shield className="h-3 w-3" />
                        Roles
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleActive(user)}
                        className={`h-7 text-xs ${
                          user.isActive
                            ? "text-red-600 hover:text-red-700 hover:border-red-300"
                            : "text-green-600 hover:text-green-700 hover:border-green-300"
                        }`}
                      >
                        {user.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create User Dialog */}
      <Dialog open={showCreate} onOpenChange={(o) => { setShowCreate(o); if (!o) { setForm(EMPTY_FORM); setFormError(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {formError && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
                {formError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "name", label: "Full Name", type: "text", required: true },
                { key: "username", label: "Username", type: "text", required: true },
                { key: "email", label: "Email", type: "email", required: true },
                { key: "mobilePhone", label: "Mobile Phone", type: "tel", required: false },
                { key: "password", label: "Password", type: "password", required: true },
                { key: "confirmPassword", label: "Confirm Password", type: "password", required: true },
              ].map(({ key, label, type, required }) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  <Input
                    type={type}
                    value={(form as any)[key]}
                    onChange={(e) => setF(key, e.target.value)}
                    autoComplete="off"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); setFormError(""); }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={createUser}
                disabled={saving}
                className="flex-1 bg-[#0f1e35] hover:bg-[#1a2f4f]"
              >
                {saving ? "Creating..." : "Create User"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Role Management Dialog */}
      <Dialog
        open={!!managingUser}
        onOpenChange={(o) => { if (!o) { setManagingUser(null); setRoleSelectValue(""); } }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Manage Roles — {managingUser?.name}
            </DialogTitle>
          </DialogHeader>
          {managingUser && (
            <div className="space-y-4 pt-2">
              {/* Current roles */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Current Roles ({managingUser.roles.length})
                </Label>
                {managingUser.roles.length === 0 ? (
                  <p className="text-sm text-gray-400">No roles assigned.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {managingUser.roles.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center gap-1 rounded-full bg-[#0f1e35]/10 pl-2.5 pr-1.5 py-1"
                      >
                        <span className="text-xs font-medium text-[#0f1e35]">{r.name}</span>
                        <button
                          onClick={() => removeRole(managingUser, r.id)}
                          className="rounded-full p-0.5 hover:bg-[#0f1e35]/20 transition-colors"
                        >
                          <X className="h-3 w-3 text-[#0f1e35]" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add role */}
              {availableRoles.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Add Role</Label>
                  <div className="flex gap-2">
                    <Select value={roleSelectValue} onValueChange={setRoleSelectValue}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select a role..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles.map((r) => (
                          <SelectItem key={r.id} value={String(r.id)}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (roleSelectValue) {
                          addRole(managingUser, Number(roleSelectValue));
                          setRoleSelectValue("");
                        }
                      }}
                      disabled={!roleSelectValue}
                      className="gap-1.5 bg-[#0f1e35] hover:bg-[#1a2f4f]"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add
                    </Button>
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-400 border-t pt-3">
                <span className="font-medium">Note:</span> Username must match the user&apos;s Azure AD UPN exactly for SSO login.
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
