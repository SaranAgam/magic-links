import React, { useState, useEffect } from "react";
import {
  Link,
  Link2,
  MousePointerClick,
  ShieldCheck,
  Zap,
  ThumbsUp,
  Smartphone,
  Copy,
  Check,
  ExternalLink,
  Search,
  Database,
} from "lucide-react";

// Safely access env variables (will be undefined in this web preview, but work locally in Vite)
const getEnvVar = (name) => {
  try {
    return import.meta.env[name];
  } catch (e) {
    return null;
  }
};

const supabaseUrl = getEnvVar("VITE_SUPABASE_URL");
const supabaseKey = getEnvVar("VITE_SUPABASE_ANON_KEY");

// Generate a local session ID so users can see their own links
const getSessionId = () => {
  let sessionId = localStorage.getItem("anon_session_id");
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem("anon_session_id", sessionId);
  }
  return sessionId;
};

const generateShortCode = () => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

export default function App() {
  const [supabase, setSupabase] = useState(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  // App State
  const [urls, setUrls] = useState([]);
  const [sessionId] = useState(getSessionId());

  // Form State
  const [longUrl, setLongUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [newShortUrl, setNewShortUrl] = useState(null);
  const [copied, setCopied] = useState(false);

  // Unshorten State
  const [lookupCode, setLookupCode] = useState("");
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupError, setLookupError] = useState("");

  const [activeTab, setActiveTab] = useState("shorten"); // 'shorten' | 'dashboard' | 'unshorten'

  const [isRedirecting, setIsRedirecting] = useState(false);
  const [redirectError, setRedirectError] = useState("");

  // Dynamically load Supabase to avoid compilation errors in the preview environment
  useEffect(() => {
    if (window.supabase) {
      setIsScriptLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    script.async = true;
    script.onload = () => setIsScriptLoaded(true);
    document.body.appendChild(script);
  }, []);

  // Initialize Supabase using ENV variables once the script is loaded
  useEffect(() => {
    if (isScriptLoaded && supabaseUrl && supabaseKey) {
      try {
        const client = window.supabase.createClient(supabaseUrl, supabaseKey);
        setSupabase(client);
      } catch (err) {
        console.error("Failed to initialize Supabase client", err);
      }
    }
  }, [isScriptLoaded]);

  // Fetch URLs when component mounts or tab changes
  useEffect(() => {
    if (supabase) fetchMyLinks();
  }, [activeTab, supabase]);

  // Handle Redirection if a short code is in the URL path (e.g. localhost:5173/aB3x9)
  useEffect(() => {
    if (!supabase) return;

    const path = window.location.pathname.slice(1);
    if (path && path.length > 0) {
      setIsRedirecting(true);
      const processRedirect = async () => {
        try {
          const { data, error } = await supabase
            .from("urls")
            .select("*")
            .eq("short_code", path)
            .single();

          if (error || !data) {
            setRedirectError("Short link not found.");
          } else {
            await supabase
              .from("urls")
              .update({ clicks: data.clicks + 1 })
              .eq("short_code", path);
            window.location.href = data.original_url;
          }
        } catch (err) {
          setRedirectError("Error processing redirect.");
        }
      };
      processRedirect();
    }
  }, [supabase]);

  const fetchMyLinks = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from("urls")
        .select("*")
        .eq("user_id", sessionId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUrls(data || []);
    } catch (err) {
      console.error("Error fetching URLs from Supabase:", err.message);
    }
  };

  const handleShorten = async (e) => {
    e.preventDefault();
    setError("");
    setNewShortUrl(null);
    setCopied(false);

    if (!supabase) {
      setError("Database connection not established.");
      return;
    }

    if (!longUrl) {
      setError("Please enter a URL");
      return;
    }

    let finalUrl = longUrl.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = "https://" + finalUrl;
    }

    if (!isValidUrl(finalUrl)) {
      setError("Please enter a valid URL (e.g., https://example.com)");
      return;
    }

    setIsLoading(true);

    try {
      const shortCode = generateShortCode();

      const { data, error: insertError } = await supabase
        .from("urls")
        .insert([
          {
            short_code: shortCode,
            original_url: finalUrl,
            user_id: sessionId,
            clicks: 0,
          },
        ])
        .select();

      if (insertError) throw new Error(insertError.message);

      setNewShortUrl({
        originalUrl: finalUrl,
        shortCode: shortCode,
        fullShortUrl: `${window.location.origin}/${shortCode}`,
      });

      setLongUrl("");
      fetchMyLinks();
    } catch (err) {
      console.error(err);
      setError(`Failed to shorten URL: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const simulateRedirect = async (shortCode, originalUrl) => {
    if (!supabase) return;
    try {
      const { data: currentData, error: fetchError } = await supabase
        .from("urls")
        .select("clicks")
        .eq("short_code", shortCode)
        .single();

      if (!fetchError && currentData) {
        await supabase
          .from("urls")
          .update({ clicks: currentData.clicks + 1 })
          .eq("short_code", shortCode);
        fetchMyLinks();
      }
      window.open(originalUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("Failed to redirect:", err);
    }
  };

  const handleLookup = async (e) => {
    e.preventDefault();
    setLookupError("");
    setLookupResult(null);

    if (!supabase) {
      setLookupError("Database connection not established.");
      return;
    }

    if (!lookupCode) return;

    let codeToLookUp = lookupCode.trim();
    if (codeToLookUp.includes("/")) {
      const parts = codeToLookUp.split("/");
      codeToLookUp = parts[parts.length - 1];
    }

    try {
      const { data, error } = await supabase
        .from("urls")
        .select("*")
        .eq("short_code", codeToLookUp)
        .single();

      if (error || !data) {
        setLookupError("This short URL does not exist in our database.");
      } else {
        setLookupResult(data);
      }
    } catch (err) {
      setLookupError("Error looking up URL.");
    }
  };

  // If keys are missing in the .env file, show a helpful warning screen
  if (!supabaseUrl || !supabaseKey) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 font-sans">
        <div className="bg-white p-8 rounded-xl shadow-xl max-w-lg w-full text-center border border-gray-200">
          <Database className="w-16 h-16 mx-auto text-emerald-600 mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Local Development Setup
          </h1>
          <p className="text-gray-600 mb-6">
            To run this app locally, you need to create a <code>.env</code> file
            in your project root with your Supabase keys:
          </p>
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-left text-sm overflow-x-auto mb-6">
            VITE_SUPABASE_URL=https://your-project.supabase.co
            <br />
            VITE_SUPABASE_ANON_KEY=eyJhbGci...
          </pre>
          <div className="p-4 bg-emerald-50 text-emerald-800 rounded-lg text-sm text-left">
            <p className="font-bold mb-2">Troubleshooting Checklist:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Make sure the file is named exactly <code>.env</code>
              </li>
              <li>
                Ensure it is in the same folder as <code>package.json</code>
              </li>
              <li>
                Restart your terminal (press Ctrl+C, then run{" "}
                <code>npm run dev</code>)
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Render Redirecting Screen
  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <Zap className="w-16 h-16 text-emerald-500 mb-4 animate-pulse" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Redirecting...
        </h2>
        {redirectError && (
          <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg max-w-md">
            {redirectError}
            <br />
            <button
              onClick={() => {
                setIsRedirecting(false);
                window.history.pushState({}, "", "/");
              }}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Go Home
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 flex flex-col">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center relative z-10">
        <div
          className="flex items-center gap-2 text-2xl font-bold text-emerald-600 cursor-pointer"
          onClick={() => setActiveTab("shorten")}
        >
          <Link2 className="w-8 h-8" />
          ShortUrl
          <span className="text-gray-800 text-lg ml-1 font-medium">Clone</span>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("shorten")}
            className={`font-medium px-3 py-1 rounded-md transition-colors ${activeTab === "shorten" ? "text-emerald-600 bg-emerald-50" : "text-gray-600 hover:text-emerald-600"}`}
          >
            Shorten
          </button>
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`font-medium px-3 py-1 rounded-md transition-colors ${activeTab === "dashboard" ? "text-emerald-600 bg-emerald-50" : "text-gray-600 hover:text-emerald-600"}`}
          >
            My Links
          </button>
          <button
            onClick={() => setActiveTab("unshorten")}
            className={`font-medium px-3 py-1 rounded-md transition-colors ${activeTab === "unshorten" ? "text-emerald-600 bg-emerald-50" : "text-gray-600 hover:text-emerald-600"}`}
          >
            Unshorten
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto pt-12 pb-24 px-6 w-full flex-1">
        {/* TAB: SHORTEN (HOME) */}
        {activeTab === "shorten" && (
          <div className="animate-in fade-in duration-300">
            <div className="text-center mb-10">
              <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
                Paste the URL to be shortened
              </h1>
              <p className="text-lg text-gray-600">
                ShortUrl is a free tool to shorten URLs and generate short links
              </p>
            </div>

            {/* Input Form Card */}
            <div className="bg-white rounded-xl shadow-lg p-2 max-w-3xl mx-auto mb-16 border border-gray-100">
              <form
                onSubmit={handleShorten}
                className="flex flex-col sm:flex-row gap-2"
              >
                <input
                  type="text"
                  placeholder="Enter the link here"
                  className="flex-1 px-6 py-4 text-lg border-2 border-transparent bg-gray-50 focus:bg-white focus:border-emerald-500 rounded-lg outline-none transition-all"
                  value={longUrl}
                  onChange={(e) => setLongUrl(e.target.value)}
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !supabase}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-8 rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-70"
                >
                  {isLoading ? "Shortening..." : "Shorten URL"}
                </button>
              </form>
              {error && (
                <p className="text-red-500 text-sm mt-3 px-4 font-medium">
                  {error}
                </p>
              )}
            </div>

            {/* Result Card */}
            {newShortUrl && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 max-w-3xl mx-auto mb-16 text-center animate-in slide-in-from-top-4">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  Your shortened URL
                </h3>
                <p className="text-gray-500 mb-6 truncate max-w-xl mx-auto">
                  {newShortUrl.originalUrl}
                </p>

                <div className="flex items-center justify-center gap-3">
                  <div className="bg-white border-2 border-gray-200 text-xl font-bold text-emerald-600 px-6 py-3 rounded-lg w-full max-w-md">
                    {newShortUrl.fullShortUrl}
                  </div>
                  <button
                    onClick={() => handleCopy(newShortUrl.fullShortUrl)}
                    className="bg-gray-800 hover:bg-gray-900 text-white p-4 rounded-lg flex items-center justify-center transition-colors"
                    title="Copy to clipboard"
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    onClick={() =>
                      simulateRedirect(
                        newShortUrl.shortCode,
                        newShortUrl.originalUrl,
                      )
                    }
                    className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 p-4 rounded-lg flex items-center justify-center transition-colors"
                    title="Test Link"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
              <FeatureCard
                icon={<ThumbsUp className="w-8 h-8 text-emerald-500" />}
                title="Easy"
                desc="ShortURL is easy and fast, enter the long link to get your shortened link"
              />
              <FeatureCard
                icon={<Link className="w-8 h-8 text-emerald-500" />}
                title="Shortened"
                desc="Use any link, no matter what size, ShortURL always shortens"
              />
              <FeatureCard
                icon={<ShieldCheck className="w-8 h-8 text-emerald-500" />}
                title="Secure"
                desc="It is fast and secure, our service uses HTTPS protocol and data encryption"
              />
              <FeatureCard
                icon={
                  <MousePointerClick className="w-8 h-8 text-emerald-500" />
                }
                title="Statistics"
                desc="Check the number of clicks that your shortened URL received"
              />
              <FeatureCard
                icon={<Zap className="w-8 h-8 text-emerald-500" />}
                title="Reliable"
                desc="All links that try to disseminate spam, viruses and malware are deleted"
              />
              <FeatureCard
                icon={<Smartphone className="w-8 h-8 text-emerald-500" />}
                title="Devices"
                desc="Compatible with smartphones, tablets and desktop"
              />
            </div>
          </div>
        )}

        {/* TAB: DASHBOARD (MY LINKS) */}
        {activeTab === "dashboard" && (
          <div className="animate-in fade-in duration-300 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-gray-900">
                My Links (Supabase DB)
              </h2>
              <div className="text-sm bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-medium">
                {urls.length} Links Total
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {urls.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <Link2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg">You haven't shortened any URLs yet.</p>
                  <button
                    onClick={() => setActiveTab("shorten")}
                    className="mt-4 text-emerald-600 font-medium hover:underline"
                  >
                    Shorten your first link
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-600 text-sm border-b border-gray-200">
                        <th className="p-4 font-semibold">Short Link</th>
                        <th className="p-4 font-semibold">Original URL</th>
                        <th className="p-4 font-semibold text-center">
                          Clicks
                        </th>
                        <th className="p-4 font-semibold text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {urls.map((u) => (
                        <tr
                          key={u.short_code}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="p-4">
                            <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                              /{u.short_code}
                            </span>
                          </td>
                          <td className="p-4">
                            <p
                              className="w-64 sm:w-96 truncate text-gray-600 text-sm"
                              title={u.original_url}
                            >
                              {u.original_url}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(u.created_at).toLocaleDateString()}
                            </p>
                          </td>
                          <td className="p-4 text-center">
                            <span className="inline-flex items-center gap-1 font-bold text-gray-700">
                              <MousePointerClick className="w-4 h-4 text-gray-400" />
                              {u.clicks}
                            </span>
                          </td>
                          <td className="p-4 text-right flex justify-end gap-2">
                            <button
                              onClick={() =>
                                handleCopy(
                                  `${window.location.origin}/${u.short_code}`,
                                )
                              }
                              className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
                              title="Copy"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                simulateRedirect(u.short_code, u.original_url)
                              }
                              className="p-2 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-100 rounded transition-colors"
                              title="Visit Link (Tests Redirect & Counter)"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: UNSHORTEN */}
        {activeTab === "unshorten" && (
          <div className="animate-in fade-in duration-300 max-w-2xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Unshorten URL
              </h2>
              <p className="text-gray-600">
                Find out where a short link really goes before clicking it.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-2 mb-8 border border-gray-100">
              <form
                onSubmit={handleLookup}
                className="flex flex-col sm:flex-row gap-2"
              >
                <input
                  type="text"
                  placeholder="Paste short URL or code (e.g. aB3x9)"
                  className="flex-1 px-6 py-4 text-lg border-2 border-transparent bg-gray-50 focus:bg-white focus:border-emerald-500 rounded-lg outline-none transition-all"
                  value={lookupCode}
                  onChange={(e) => setLookupCode(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={!supabase}
                  className="bg-gray-800 hover:bg-gray-900 text-white font-bold py-4 px-8 rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-70"
                >
                  <Search className="w-5 h-5" />
                  Look Up
                </button>
              </form>
              {lookupError && (
                <p className="text-red-500 text-sm mt-3 px-4 font-medium">
                  {lookupError}
                </p>
              )}
            </div>

            {lookupResult && (
              <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm text-left">
                <div className="flex items-start gap-4 mb-6">
                  <div className="bg-emerald-100 p-3 rounded-full">
                    <ShieldCheck className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">
                      Destination Found in Supabase
                    </h3>
                    <p className="text-sm text-gray-500">
                      This link is registered in your database.
                    </p>
                  </div>
                </div>

                <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                      Original URL (Destination)
                    </p>
                    <a
                      href={lookupResult.original_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-600 font-medium hover:underline break-all"
                    >
                      {lookupResult.original_url}
                    </a>
                  </div>
                  <div className="pt-4 border-t border-gray-200 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Short Code
                      </p>
                      <p className="font-medium text-gray-800">
                        {lookupResult.short_code}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Total Clicks
                      </p>
                      <p className="font-medium text-gray-800 flex items-center gap-1">
                        <MousePointerClick className="w-4 h-4 text-gray-400" />
                        {lookupResult.clicks}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-gray-400 text-sm border-t border-gray-200 mt-auto bg-white flex flex-col items-center justify-center gap-2">
        <p>© 2026 ShortUrl Clone. Powered by React & Supabase.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="flex flex-col items-center text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="mb-4 bg-emerald-50 p-4 rounded-full">{icon}</div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{desc}</p>
    </div>
  );
}
