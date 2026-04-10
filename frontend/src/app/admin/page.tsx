"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import {
  getMe,
  getUniversities,
  createUniversity,
  deleteUniversity,
  getUsers,
  deleteUser,
  getScrapeJobs,
  triggerScrape,
} from "@/lib/api";
import type { User, University, ScrapeJob } from "@/types";

type Tab = "universities" | "users" | "scrape-jobs";

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState<Tab>("universities");
  const [universities, setUniversities] = useState<University[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [jobs, setJobs] = useState<ScrapeJob[]>([]);
  const [showNewUni, setShowNewUni] = useState(false);
  const [uniForm, setUniForm] = useState({ name: "", slug: "", website_url: "", description: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = Cookies.get("access_token");
    if (!token) { router.push("/auth/login"); return; }
    getMe().then(({ data }) => {
      if (data.role !== "super_admin") { router.push("/chat"); return; }
      setUser(data);
      loadAll();
    }).catch(() => router.push("/auth/login"));
  }, [router]);

  async function loadAll() {
    const [uniRes, userRes, jobRes] = await Promise.allSettled([
      getUniversities(),
      getUsers(),
      getScrapeJobs(),
    ]);
    if (uniRes.status === "fulfilled") setUniversities(uniRes.value.data);
    if (userRes.status === "fulfilled") setUsers(userRes.value.data);
    if (jobRes.status === "fulfilled") setJobs(jobRes.value.data);
  }

  async function handleCreateUniversity(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await createUniversity(uniForm);
      toast.success("University created!");
      setShowNewUni(false);
      setUniForm({ name: "", slug: "", website_url: "", description: "" });
      const { data } = await getUniversities();
      setUniversities(data);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to create university");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteUniversity(slug: string) {
    if (!confirm("Delete this university and all its data?")) return;
    await deleteUniversity(slug);
    setUniversities((prev) => prev.filter((u) => u.slug !== slug));
    toast.success("Deleted");
  }

  async function handleDeleteUser(id: string) {
    if (!confirm("Delete this user?")) return;
    await deleteUser(id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
    toast.success("Deleted");
  }

  async function handleTriggerScrape(universityId: string) {
    try {
      const { data } = await triggerScrape(universityId);
      toast.success("Scrape job queued!");
      setJobs((prev) => [data, ...prev]);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to trigger scrape");
    }
  }

  function handleLogout() {
    Cookies.remove("access_token");
    router.push("/auth/login");
  }

  const TABS: { key: Tab; label: string; emoji: string }[] = [
    { key: "universities", label: "Universities", emoji: "🏫" },
    { key: "users", label: "Users", emoji: "👥" },
    { key: "scrape-jobs", label: "Scrape Jobs", emoji: "🕷️" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary-700 text-white px-6 py-4 flex items-center justify-between shadow">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎓</span>
          <div>
            <h1 className="font-bold text-lg">CampusAI — Super Admin</h1>
            <p className="text-primary-200 text-xs">Platform management</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">{user?.full_name}</p>
          <button onClick={handleLogout} className="text-xs text-primary-200 hover:text-white">
            Sign out
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white p-1 rounded-xl shadow-sm border border-gray-200 w-fit">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.key
                  ? "bg-primary-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        {/* Universities */}
        {tab === "universities" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Universities ({universities.length})</h2>
              <button onClick={() => setShowNewUni(true)} className="btn-primary">
                + Add University
              </button>
            </div>

            {showNewUni && (
              <div className="card mb-6">
                <h3 className="font-semibold mb-4">New University</h3>
                <form onSubmit={handleCreateUniversity} className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <input
                      required
                      className="input-field"
                      value={uniForm.name}
                      onChange={(e) => setUniForm({ ...uniForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Slug (URL-safe)</label>
                    <input
                      required
                      className="input-field"
                      value={uniForm.slug}
                      onChange={(e) => setUniForm({ ...uniForm, slug: e.target.value })}
                      placeholder="e.g. mit"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Website URL</label>
                    <input
                      required
                      type="url"
                      className="input-field"
                      value={uniForm.website_url}
                      onChange={(e) => setUniForm({ ...uniForm, website_url: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                      className="input-field"
                      value={uniForm.description}
                      onChange={(e) => setUniForm({ ...uniForm, description: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="col-span-2 flex gap-3">
                    <button type="submit" disabled={loading} className="btn-primary">
                      {loading ? "Creating…" : "Create"}
                    </button>
                    <button type="button" onClick={() => setShowNewUni(false)} className="btn-secondary">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="grid gap-4">
              {universities.map((uni) => (
                <div key={uni.id} className="card flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{uni.name}</span>
                      <span className="text-xs bg-gray-100 rounded px-2 py-0.5 font-mono">{uni.slug}</span>
                      {uni.is_active ? (
                        <span className="text-xs bg-green-100 text-green-700 rounded px-2 py-0.5">Active</span>
                      ) : (
                        <span className="text-xs bg-red-100 text-red-700 rounded px-2 py-0.5">Inactive</span>
                      )}
                    </div>
                    <a href={uni.website_url} className="text-sm text-primary-600 hover:underline" target="_blank">
                      {uni.website_url}
                    </a>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleTriggerScrape(uni.id)}
                      className="btn-secondary text-sm"
                    >
                      🕷️ Scrape
                    </button>
                    <button
                      onClick={() => handleDeleteUniversity(uni.slug)}
                      className="text-red-600 hover:bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {universities.length === 0 && (
                <div className="card text-center text-gray-500">No universities yet. Add one above.</div>
              )}
            </div>
          </div>
        )}

        {/* Users */}
        {tab === "users" && (
          <div>
            <h2 className="text-xl font-bold mb-4">Users ({users.length})</h2>
            <div className="card overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {["Name", "Email", "Role", "University", "Status", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{u.full_name}</td>
                      <td className="px-4 py-3 text-gray-600">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs rounded px-2 py-0.5 font-medium ${
                          u.role === "super_admin" ? "bg-purple-100 text-purple-700" :
                          u.role === "university_admin" ? "bg-blue-100 text-blue-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>
                          {u.role.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {universities.find((uni) => uni.id === u.university_id)?.name || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs rounded px-2 py-0.5 ${u.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="text-red-600 hover:underline text-xs"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Scrape Jobs */}
        {tab === "scrape-jobs" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Scrape Jobs ({jobs.length})</h2>
              <button onClick={loadAll} className="btn-secondary text-sm">⟳ Refresh</button>
            </div>
            <div className="card overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {["University", "Status", "Pages Scraped", "Pages Indexed", "Started", "Completed"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {jobs.map((j) => (
                    <tr key={j.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">
                        {universities.find((u) => u.id === j.university_id)?.name || j.university_id}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs rounded px-2 py-0.5 font-medium ${
                          j.status === "completed" ? "bg-green-100 text-green-700" :
                          j.status === "running" ? "bg-blue-100 text-blue-700" :
                          j.status === "failed" ? "bg-red-100 text-red-700" :
                          "bg-yellow-100 text-yellow-700"
                        }`}>
                          {j.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">{j.pages_scraped}</td>
                      <td className="px-4 py-3">{j.pages_indexed}</td>
                      <td className="px-4 py-3 text-gray-500">{j.started_at ? new Date(j.started_at).toLocaleString() : "—"}</td>
                      <td className="px-4 py-3 text-gray-500">{j.completed_at ? new Date(j.completed_at).toLocaleString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {jobs.length === 0 && (
                <div className="p-8 text-center text-gray-500">No scrape jobs yet.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
