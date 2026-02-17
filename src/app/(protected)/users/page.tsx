"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, RefreshCcw, Power, Pencil } from "lucide-react";

type User = {
    id: string;
    name: string;
    username: string;
    role: string;
    isActive: boolean;
    createdAt: string;
};

export default function UsersPage() {
    const { data: session } = useSession();
    const isSuperAdmin = session?.user?.role === "SUPERADMIN";

    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    // Create State
    const [openCreate, setOpenCreate] = useState(false);
    const [newUser, setNewUser] = useState({
        name: "", username: "", password: "", role: "MEKANIK"
    });

    // Edit State
    const [openEdit, setOpenEdit] = useState(false);
    const [editUser, setEditUser] = useState<{
        id: string;
        name: string;
        username: string;
        password: string;
        isActive: boolean;
        role: string;
    } | null>(null);

    async function handleSaveEdit() {
        if (!editUser) return;

        const payload: any = {
            name: editUser.name,
            isActive: editUser.isActive,
            role: editUser.role,
        };

        if (editUser.password) {
            payload.password = editUser.password;
        }

        const res = await fetch(`/api/users/${editUser.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (res.ok) {
            toast.success("User berhasil diupdate");
            setOpenEdit(false);
            setEditUser(null);
            fetchUsers();
            // Force reload session if editing self to reflect name changes immediately if needed
            if (session?.user?.id === editUser.id) {
                window.location.reload();
            }
        } else {
            toast.error("Gagal update user");
        }
    }

    async function fetchUsers() {
        setLoading(true);
        try {
            const res = await fetch("/api/users");
            if (res.ok) setUsers(await res.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchUsers();
    }, []);

    async function handleCreate() {
        if (!newUser.name || !newUser.username || !newUser.password) {
            toast.error("Semua field wajib diisi");
            return;
        }

        const res = await fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newUser),
        });

        if (res.ok) {
            toast.success("User berhasil dibuat");
            setOpenCreate(false);
            setNewUser({ name: "", username: "", password: "", role: "MEKANIK" });
            fetchUsers();
        } else {
            const json = await res.json();
            toast.error(json.message || "Gagal membuat user");
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Manajemen User</h1>
                    <p className="text-muted-foreground">Kelola akun pengguna sistem</p>
                </div>
                {isSuperAdmin && (
                    <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                        <DialogTrigger asChild>
                            <Button className="bg-sky-900 hover:bg-sky-700 text-white">
                                <Plus className="mr-2 h-4 w-4" /> Tambah User
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-white">
                            <DialogHeader>
                                <DialogTitle>Tambah User Baru</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Nama Lengkap</Label>
                                    <Input
                                        value={newUser.name}
                                        onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Username</Label>
                                    <Input
                                        value={newUser.username}
                                        onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Password</Label>
                                    <Input
                                        type="password"
                                        value={newUser.password}
                                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Role</Label>
                                    <Select
                                        value={newUser.role}
                                        onValueChange={(val) => setNewUser({ ...newUser, role: val })}
                                    >
                                        <SelectTrigger className="bg-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent position="popper">
                                            <SelectItem value="ADMIN">Admin</SelectItem>
                                            <SelectItem value="MEKANIK">Mekanik</SelectItem>
                                            <SelectItem value="SUPERADMIN">Super Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button className="w-full bg-sky-900 hover:bg-sky-700 text-white font-bold h-11" onClick={handleCreate}>Simpan</Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <div className="border rounded-lg bg-white">
                <Table>
                    <TableHeader className="bg-slate-100">
                        <TableRow>
                            <TableHead>Nama</TableHead>
                            <TableHead>Username</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">Memuat...</TableCell>
                            </TableRow>
                        ) : users.map((u) => (
                            <TableRow key={u.id}>
                                <TableCell className="font-medium">{u.name}</TableCell>
                                <TableCell>{u.username}</TableCell>
                                <TableCell>
                                    <Badge variant={u.role === "SUPERADMIN" ? "default" : "outline"}>
                                        {u.role}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge className={u.isActive ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}>
                                        {u.isActive ? "Aktif" : "Nonaktif"}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => {
                                            setEditUser({
                                                id: u.id,
                                                name: u.name,
                                                username: u.username,
                                                password: "",
                                                isActive: u.isActive,
                                                role: u.role,
                                            });
                                            setOpenEdit(true);
                                        }}
                                        title="Edit User"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* EDIT DIALOG */}
            <Dialog open={openEdit} onOpenChange={setOpenEdit}>
                <DialogContent className="bg-white">
                    <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                    </DialogHeader>
                    {editUser && (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Nama Lengkap</Label>
                                <Input
                                    value={editUser.name}
                                    onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Username</Label>
                                <Input
                                    value={editUser.username}
                                    disabled
                                    className="bg-slate-100"
                                />
                            </div>

                            {isSuperAdmin && (
                                <div className="space-y-2">
                                    <Label>Role</Label>
                                    <Select
                                        value={editUser.role}
                                        onValueChange={(val) => setEditUser({ ...editUser, role: val })}
                                    >
                                        <SelectTrigger className="bg-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent position="popper">
                                            <SelectItem value="ADMIN">Admin</SelectItem>
                                            <SelectItem value="MEKANIK">Mekanik</SelectItem>
                                            <SelectItem value="SUPERADMIN">Super Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>Password Baru</Label>
                                <Input
                                    type="password"
                                    placeholder="Kosongkan jika tidak ingin mengganti"
                                    value={editUser.password}
                                    onChange={(e) => setEditUser({ ...editUser, password: e.target.value })}
                                />
                            </div>

                            {isSuperAdmin && (
                                <div className="flex items-center justify-between p-3 border rounded-lg bg-white">
                                    <div className="flex items-center gap-2">
                                        <Label>Status Akun</Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-sm font-medium ${editUser.isActive ? "text-green-600" : "text-red-600"}`}>
                                            {editUser.isActive ? "Aktif" : "Nonaktif"}
                                        </span>
                                        <Switch
                                            checked={editUser.isActive}
                                            onCheckedChange={(checked) => setEditUser({ ...editUser, isActive: checked })}
                                            className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-slate-200 [&_span]:bg-white"
                                        />
                                    </div>
                                </div>
                            )}

                            <Button
                                className="w-full bg-sky-900 hover:bg-sky-700 text-white font-bold h-11"
                                onClick={handleSaveEdit}
                            >
                                Simpan Perubahan
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div >
    );
}
