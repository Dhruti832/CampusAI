import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-900 to-primary-600 text-white">
      <div className="text-center max-w-2xl px-4">
        <h1 className="text-5xl font-bold mb-4">🎓 CampusAI</h1>
        <p className="text-xl text-primary-100 mb-8">
          Multi-tenant AI assistant platform for universities. Each institution
          gets its own chatbot trained exclusively on official content.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/auth/login"
            className="bg-white text-primary-700 font-semibold py-3 px-8 rounded-xl hover:bg-primary-50 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/auth/register"
            className="border-2 border-white text-white font-semibold py-3 px-8 rounded-xl hover:bg-primary-700 transition-colors"
          >
            Register
          </Link>
        </div>
        <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { emoji: "🕷️", label: "Auto-scraping" },
            { emoji: "🧠", label: "RAG Pipeline" },
            { emoji: "🏫", label: "Multi-university" },
            { emoji: "🔐", label: "Role-based access" },
          ].map((f) => (
            <div key={f.label} className="bg-primary-800/40 rounded-xl p-4">
              <div className="text-3xl mb-2">{f.emoji}</div>
              <div className="text-sm font-medium">{f.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
