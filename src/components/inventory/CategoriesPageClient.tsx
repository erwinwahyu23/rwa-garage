"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function CategoriesPageClient() {
  const router = useRouter();
  const [items, setItems] = useState<{ id: string; name: string; hasItems?: boolean }[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((data) => setItems(data || []))
      .catch(() => setItems([]));
  }, []);

  async function handleCreate() {
    if (!name) return;
    setLoading(true);
    try {
      const res = await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      if (!res.ok) throw new Error('Failed');
      const created = await res.json();
      setItems((s) => [created, ...s]);
      setName('');
      toast.success('Category added');
    } catch (err) {
      toast.error('Failed to create category');
    } finally { setLoading(false); }
  }

  function startEdit(it: { id: string; name: string }) {
    setEditingId(it.id);
    setEditingName(it.name);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingName('');
  }

  async function saveEdit(id: string) {
    if (!editingName) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: editingName }) });
      if (!res.ok) throw new Error('Failed');
      const updated = await res.json();
      setItems((s) => s.map((x) => x.id === id ? updated : x));
      toast.success('Category updated');
      cancelEdit();
    } catch (err) {
      toast.error('Failed to update category');
    } finally { setEditLoading(false); }
  }

  async function deleteCategory(id: string) {
    if (!confirm('Hapus kategori ini?')) return;
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      setItems((s) => s.filter((x) => x.id !== id));
      toast.success('Category deleted');
    } catch (err) {
      try {
        const json = await (err instanceof Response ? err.json() : Promise.resolve({}));
        toast.error(json.error || 'Failed to delete category');
      } catch (e) {
        toast.error('Failed to delete category');
      }
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Categories</h2>
      <div className="mb-4 flex gap-2 items-center">
        <Link href="/inventory" className="text-sm btn-link">&larr; Back</Link>
        <div className="flex-1 flex gap-2">
          <Input placeholder="Category name" value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={handleCreate} disabled={loading}>{loading ? 'Adding...' : 'Add'}</Button>
        </div>
      </div>

      <ul>
        {items.map((s) => (
          <li key={s.id} className="py-1 flex items-center gap-4">
            {editingId === s.id ? (
              <div className="flex gap-2 items-center">
                <Input value={editingName} onChange={(e) => setEditingName(e.target.value)} />
                <Button onClick={() => saveEdit(s.id)} disabled={editLoading}>{editLoading ? 'Saving...' : 'Save'}</Button>
                <Button variant="ghost" onClick={cancelEdit}>Cancel</Button>
              </div>
            ) : (
              <>
                <span className="flex-1">{s.name}{s.hasItems ? <span className="text-sm text-gray-500 ml-2">(has items)</span> : null}</span>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => startEdit(s)}>Edit</Button>
                  <Button variant="destructive" onClick={() => deleteCategory(s.id)} disabled={s.hasItems}>{s.hasItems ? 'In use' : 'Delete'}</Button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
