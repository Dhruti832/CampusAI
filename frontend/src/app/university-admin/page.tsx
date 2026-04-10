"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import {
  getMe,
  getDocuments,
  deleteDocument,
  getScrapeJobs,
  triggerScrape,
  getUsers,
  createUser,
} from "@/lib/api";
import type { User, Document, ScrapeJob } from "@/types";

type Tab = "documents" | "scrape-jobs" | "users";

export default function UniversityAdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState<Tab>("documents");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [jobs, setJobs] = useState<ScrapeJob[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showNewUser, setShowNewUser] = useState(false);
  const [userForm, setUserForm] = useState({ full_name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = Cookies.get("access_token");
    if (!token) { router.push("/auth/login"); return; }
    getMe().then(({ data }) => {
      if (data.role !== "university_admin") { router.push("/chat"); return; }
      setUser(data);
      loadAll();
    }).catch(() => router.push("/auth/login"));
  }, [router]);

  async function loadAll() {
    const [docRes, jobRes, userRes] = await Promise.allSettled([
      getDocuments(),
      getScrapeJobs(),
      getUsers(),
    ]);
    if (docRes.status === "fulfilled") setDocuments(docRes.value.data);
    if (jobRes.status === "fulfilled") setJobs(jobRes.value.data);
    if (userRes.status === "fulfilled") setUsers(userRes.value.data);
  }

  async function handleDeleteDocument(id: string) {
    await deleteDocument(id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    toast.success("Document removed");
  }

  async function handleTriggerScrape() {
    if (!user?.university_id) return;
    try {
      const { data } = await triggerScrape(user.university_id);
      toast.success("Scrape job queued!");
      setJobs((prev) => [data, ...prev]);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to trigger scrape");
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await createUser({ ...userForm, role: "student" });
      toast.success("Student account created!");
      setUsers((prev) => [data, ...prev]);
      setShowNewUser(false);
      setUserForm({ full_name: "", email: "", password: "" });
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    Cookies.remove("access_token");
    router.push("/auth/login");
  }

  const TABS: { key: Tab; label: string; emoji: string }[] = [
    { key: "documents", label: "Documents", emoji: "📄" },
    { key: "scrape-jobs", label: "Scrape Jobs", emoji: "🕷️" },
    { key: "users", label: "Students", emoji: "👥" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary-700 text-white px-6 py-4 flex items-center justify-between shadow">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎓</span>
          <div>
            <h1 className="font-bold text-lg">CampusAI — Admin</h1>
            <p className="text-primary-200 text-xs">University management</p>
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
        <div className="flex gap-1 mb-6 bg-white p-1 rounded-xl shadow-sm border border-gray-200 w-fit">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.key ? "bg-primary-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        {/* Documents */}
        {tab === "documents" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Indexed Documents ({documents.length})</h2>
              <button onClick={loadAll} className="btn-secondary text-sm">⟳ Refresh</button>
            </div>
            <div className="card overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {["Title", "Type", "Status", "Chunks", "Added", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {documents.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <a href={d.source_url} target="_blank" className="text-primary-600 hover:underline font-medium line-clamp-1">
                          {d.title}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-gray-500 capitalize">{d.doc_type}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs rounded px-2 py-0.5 font-medium ${
                          d.status === "indexed" ? "bg-green-100 text-green-700" :
                          d.status === "failed" ? "bg-red-100 text-red-700" :
                          "bg-yellow-100 text-yellow-700"
                        }`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">{d.chunk_count}</td>
                      <td className="px-4 py-3 text-gray-500">{new Date(d.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleDeleteDocument(d.id)} className="text-red-600 hover:underline text-xs">
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {documents.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  No documents indexed yet. Trigger a scrape job to start.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Scrape Jobs */}
        {tab === "scrape-jobs" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Scrape Jobs</h2>
              <div className="flex gap-2">
                <button onClick={loadAll} className="btn-secondary text-sm">⟳ Refresh</button>
                <button onClick={handleTriggerScrape} className="btn-primary">
                  🕷️ Trigger Scrape
                </button>
              </div>
            </div>
            <div className="card overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {["Status", "Pages Scraped", "Pages Indexed", "Started", "Completed", "Error"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {jobs.map((j) => (
                    <tr key={j.id} className="hover:bg-gray-50">
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
                      <td className="px-4 py-3 text-red-500 text-xs">{j.error_message || "—"}</td>
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

        {/* Students */}
        {tab === "users" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Students ({users.length})</h2>
              <button onClick={() => setShowNewUser(true)} className="btn-primary">
                + Add Student
              </button>
            </div>

            {showNewUser && (
              <div className="card mb-6">
                <h3 className="font-semibold mb-4">New Student Account</h3>
                <form onSubmit={handleCreateUser} className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Full Name</label>
                    <input required className="input-field" value={userForm.full_name}
                      onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input required type="email" className="input-field" value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Password</label>
                    <input required type="password" minLength={8} className="input-field" value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
                  </div>
                  <div className="col-span-3 flex gap-3">
                    <button type="submit" disabled={loading} className="btn-primary">
                      {loading ? "Creating…" : "Create"}
                    </button>
                    <button type="button" onClick={() => setShowNewUser(false)} className="btn-secondary">Cancel</button>
                  </div>
                </form>
              </div>
            )}

            <div className="card overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {["Name", "Email", "Status"].map((h) => (
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
                        <span className={`text-xs rounded px-2 py-0.5 ${u.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <div className="p-8 text-center text-gray-500">No students enrolled yet.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
