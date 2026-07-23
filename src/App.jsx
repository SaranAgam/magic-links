import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
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
  DatabaseZap,
  TrendingUp,
  RefreshCw,
  Share2,
  Clock,
  ChevronDown,
  ChevronUp,
  BarChart2,
} from "lucide-react";


const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Initialize Supabase client once at module level
const supabaseClient =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;


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

const formatReferrer = (referrer) => {
  if (!referrer || referrer === "direct" || referrer.trim() === "") return "Direct";
  try {
    const url = new URL(referrer);
    const host = url.hostname.replace("www.", "");
    const map = {
      "linkedin.com": "LinkedIn",
      "lnkd.in": "LinkedIn",
      "twitter.com": "Twitter / X",
      "x.com": "Twitter / X",
      "t.co": "Twitter / X",
      "facebook.com": "Facebook",
      "fb.me": "Facebook",
      "instagram.com": "Instagram",
      "google.com": "Google",
      "google.co.in": "Google",
      "github.com": "GitHub",
      "reddit.com": "Reddit",
      "whatsapp.com": "WhatsApp",
      "wa.me": "WhatsApp",
      "telegram.org": "Telegram",
      "t.me": "Telegram",
      "youtube.com": "YouTube",
    };
    return map[host] || host;
  } catch {
    return referrer.length > 40 ? referrer.slice(0, 40) + "…" : referrer;
  }
};

const getReferrerColor = (label) => {
  const colors = {
    "LinkedIn": "bg-blue-600",
    "Twitter / X": "bg-sky-500",
    "Facebook": "bg-indigo-600",
    "Instagram": "bg-pink-500",
    "Google": "bg-red-500",
    "GitHub": "bg-gray-800",
    "Reddit": "bg-orange-500",
    "WhatsApp": "bg-green-500",
    "Telegram": "bg-cyan-500",
    "YouTube": "bg-red-600",
    "Direct": "bg-emerald-500",
  };
  return colors[label] || "bg-purple-500";
};

export default function App() {
  const [supabase] = useState(supabaseClient);

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

  // Analytics State
  const [expandedLink, setExpandedLink] = useState(null);
  const [clickEvents, setClickEvents] = useState({});   // shortCode -> events[]
  const [loadingEvents, setLoadingEvents] = useState({}); // shortCode -> bool


  // Fetch URLs when supabase client is ready or tab changes
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
            // Increment click counter
            await supabase
              .from("urls")
              .update({ clicks: data.clicks + 1 })
              .eq("short_code", path);
            // Log detailed click event with referrer
            await supabase.from("click_events").insert([{
              short_code: path,
              referrer: document.referrer || "direct",
              user_agent: navigator.userAgent,
            }]).then(() => {}).catch(() => {});
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

  // Log a click event to click_events table
  const logClickEvent = async (shortCode) => {
    if (!supabase) return;
    try {
      await supabase.from("click_events").insert([{
        short_code: shortCode,
        referrer: document.referrer || "direct",
        user_agent: navigator.userAgent,
      }]);
    } catch (err) {
      console.error("Failed to log click event:", err);
    }
  };

  // Fetch per-link click events for analytics
  const fetchClickEvents = async (shortCode) => {
    if (!supabase) return;
    setLoadingEvents((prev) => ({ ...prev, [shortCode]: true }));
    try {
      const { data } = await supabase
        .from("click_events")
        .select("*")
        .eq("short_code", shortCode)
        .order("clicked_at", { ascending: false })
        .limit(200);
      setClickEvents((prev) => ({ ...prev, [shortCode]: data || [] }));
    } catch (err) {
      console.error("Error fetching click events:", err);
    } finally {
      setLoadingEvents((prev) => ({ ...prev, [shortCode]: false }));
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
        // Log click event for analytics
        await logClickEvent(shortCode);
        // Refresh events if this link is currently expanded
        if (expandedLink === shortCode) {
          fetchClickEvents(shortCode);
        }
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
          <DatabaseZap className="w-16 h-16 mx-auto text-emerald-600 mb-4" />
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
      <nav className="bg-white shadow-sm px-4 py-3 relative z-10">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
          <div
            className="flex items-center gap-2 text-xl font-bold text-emerald-600 cursor-pointer"
            onClick={() => setActiveTab("shorten")}
          >
            <Link2 className="w-6 h-6" />
            ShortUrl
            <span className="text-gray-800 text-base ml-1 font-medium">Clone</span>
          </div>
          <div className="flex gap-1 sm:gap-3">
            <button
              onClick={() => setActiveTab("shorten")}
              className={`flex-1 sm:flex-none text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${activeTab === "shorten" ? "text-emerald-600 bg-emerald-50" : "text-gray-600 hover:text-emerald-600"}`}
            >
              Shorten
            </button>
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex-1 sm:flex-none text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${activeTab === "dashboard" ? "text-emerald-600 bg-emerald-50" : "text-gray-600 hover:text-emerald-600"}`}
            >
              My Links
            </button>
            <button
              onClick={() => setActiveTab("unshorten")}
              className={`flex-1 sm:flex-none text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${activeTab === "unshorten" ? "text-emerald-600 bg-emerald-50" : "text-gray-600 hover:text-emerald-600"}`}
            >
              Unshorten
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto pt-8 sm:pt-12 pb-24 px-4 sm:px-6 w-full flex-1">
        {/* TAB: SHORTEN (HOME) */}
        {activeTab === "shorten" && (
          <div className="animate-in fade-in duration-300">
            <div className="text-center mb-8 sm:mb-10">
              <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 mb-3 sm:mb-4 leading-tight">
                Paste the URL to be shortened
              </h1>
              <p className="text-base sm:text-lg text-gray-600">
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
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 sm:p-8 max-w-3xl mx-auto mb-10 sm:mb-16 text-center animate-in slide-in-from-top-4">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
                  Your shortened URL
                </h3>
                <p className="text-gray-500 mb-5 truncate max-w-xl mx-auto text-sm sm:text-base">
                  {newShortUrl.originalUrl}
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
                  <div className="bg-white border-2 border-gray-200 text-base sm:text-xl font-bold text-emerald-600 px-4 sm:px-6 py-3 rounded-lg w-full break-all text-left sm:text-center">
                    {newShortUrl.fullShortUrl}
                  </div>
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => handleCopy(newShortUrl.fullShortUrl)}
                      className="flex-1 sm:flex-none bg-gray-800 hover:bg-gray-900 text-white p-3 sm:p-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                      title="Copy to clipboard"
                    >
                      {copied ? (
                        <><Check className="w-5 h-5 text-emerald-400" /><span className="sm:hidden text-sm">Copied!</span></>
                      ) : (
                        <><Copy className="w-5 h-5" /><span className="sm:hidden text-sm">Copy</span></>
                      )}
                    </button>
                    <button
                      onClick={() =>
                        simulateRedirect(
                          newShortUrl.shortCode,
                          newShortUrl.originalUrl,
                        )
                      }
                      className="flex-1 sm:flex-none bg-emerald-100 hover:bg-emerald-200 text-emerald-700 p-3 sm:p-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                      title="Test Link"
                    >
                      <ExternalLink className="w-5 h-5" />
                      <span className="sm:hidden text-sm">Test</span>
                    </button>
                  </div>
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

        {/* TAB: ANALYTICS DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="animate-in fade-in duration-300 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h2>
                <p className="text-gray-500 mt-1 text-sm">Track clicks and traffic sources for all your short links</p>
              </div>
              <button
                onClick={() => {
                  fetchMyLinks();
                  if (expandedLink) fetchClickEvents(expandedLink);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors font-medium text-sm border border-emerald-200"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>

            {/* Summary Cards */}
            {urls.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex items-center gap-4">
                  <div className="bg-emerald-100 p-3 rounded-xl">
                    <Link2 className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Links</p>
                    <p className="text-3xl font-bold text-gray-900">{urls.length}</p>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex items-center gap-4">
                  <div className="bg-blue-100 p-3 rounded-xl">
                    <MousePointerClick className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Clicks</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {urls.reduce((sum, u) => sum + (u.clicks || 0), 0)}
                    </p>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex items-center gap-4">
                  <div className="bg-amber-100 p-3 rounded-xl">
                    <TrendingUp className="w-6 h-6 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Top Link</p>
                    {(() => {
                      const top = urls.reduce((max, u) => (u.clicks || 0) > (max?.clicks || 0) ? u : max, null);
                      return top
                        ? <p className="text-lg font-bold text-gray-900 truncate">/{top.short_code} <span className="text-sm font-normal text-gray-500">({top.clicks} clicks)</span></p>
                        : <p className="text-gray-400">—</p>;
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Links Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {urls.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <BarChart2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No links yet</p>
                  <p className="text-sm text-gray-400 mt-1">Shorten a URL to start tracking analytics</p>
                  <button
                    onClick={() => setActiveTab("shorten")}
                    className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                  >
                    Shorten your first link
                  </button>
                </div>
              ) : (
                <div>
                  {/* Table header */}
                  <div className="hidden sm:grid grid-cols-12 gap-2 px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <div className="col-span-2">Short Link</div>
                    <div className="col-span-4">Destination</div>
                    <div className="col-span-3">Performance</div>
                    <div className="col-span-2 text-center">Clicks</div>
                    <div className="col-span-1"></div>
                  </div>

                  {urls.map((u) => {
                    const maxClicks = Math.max(...urls.map((x) => x.clicks || 0), 1);
                    const pct = Math.round(((u.clicks || 0) / maxClicks) * 100);
                    const isExpanded = expandedLink === u.short_code;
                    const events = clickEvents[u.short_code] || [];
                    const isLoading = loadingEvents[u.short_code];

                    // Aggregate referrers
                    const referrerMap = {};
                    events.forEach((ev) => {
                      const label = formatReferrer(ev.referrer);
                      referrerMap[label] = (referrerMap[label] || 0) + 1;
                    });
                    const referrers = Object.entries(referrerMap).sort((a, b) => b[1] - a[1]);

                    return (
                      <div key={u.short_code} className="border-b border-gray-100 last:border-0">
                        {/* Main clickable row — mobile: 3 cols, sm+: 12 cols */}
                        <div
                          className="flex sm:grid sm:grid-cols-12 gap-2 px-4 sm:px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer items-center"
                          onClick={() => {
                            if (isExpanded) {
                              setExpandedLink(null);
                            } else {
                              setExpandedLink(u.short_code);
                              if (!clickEvents[u.short_code]) fetchClickEvents(u.short_code);
                            }
                          }}
                        >
                          {/* Short code */}
                          <div className="flex-shrink-0 sm:col-span-2">
                            <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-xs sm:text-sm font-mono">
                              /{u.short_code}
                            </span>
                          </div>
                          {/* Destination — hidden on mobile, shown sm+ */}
                          <div className="hidden sm:block sm:col-span-4">
                            <p className="text-gray-700 text-sm truncate" title={u.original_url}>
                              {u.original_url}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              Created {new Date(u.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          {/* URL shown on mobile only */}
                          <div className="flex-1 sm:hidden min-w-0 px-2">
                            <p className="text-gray-700 text-xs truncate">{u.original_url}</p>
                            <p className="text-xs text-gray-400">{new Date(u.created_at).toLocaleDateString()}</p>
                          </div>
                          {/* Performance bar — sm+ only */}
                          <div className="hidden sm:block sm:col-span-3 pr-4">
                            <div className="w-full bg-gray-100 rounded-full h-2">
                              <div
                                className="bg-emerald-500 h-2 rounded-full transition-all duration-700"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                          {/* Clicks */}
                          <div className="flex-shrink-0 sm:col-span-2 sm:text-center">
                            <span className="inline-flex items-center gap-1 font-bold text-gray-800 text-sm">
                              <MousePointerClick className="w-4 h-4 text-emerald-500" />
                              {u.clicks || 0}
                            </span>
                          </div>
                          {/* Chevron */}
                          <div className="flex-shrink-0 sm:col-span-1 flex justify-end">
                            {isExpanded
                              ? <ChevronUp className="w-4 h-4 text-gray-400" />
                              : <ChevronDown className="w-4 h-4 text-gray-400" />}
                          </div>
                        </div>

                        {/* Expanded Analytics Panel */}
                        {isExpanded && (
                          <div className="bg-gradient-to-br from-gray-50 to-slate-50 border-t border-gray-100 px-5 py-5">
                            {/* Quick actions */}
                            <div className="flex flex-wrap gap-2 mb-5">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleCopy(`${window.location.origin}/${u.short_code}`); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                <Copy className="w-3.5 h-3.5" /> Copy Link
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); simulateRedirect(u.short_code, u.original_url); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5" /> Test Link
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); fetchClickEvents(u.short_code); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors ml-auto"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh Stats
                              </button>
                            </div>

                            {isLoading ? (
                              <div className="flex items-center justify-center py-8 gap-3 text-gray-400">
                                <RefreshCw className="w-5 h-5 animate-spin" />
                                <span className="text-sm">Loading analytics...</span>
                              </div>
                            ) : events.length === 0 ? (
                              <div className="text-center py-8">
                                <Share2 className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                                <p className="text-gray-500 font-medium text-sm">No clicks tracked yet</p>
                                <p className="text-gray-400 text-xs mt-1">Share this link — clicks will appear here automatically</p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Traffic Sources */}
                                <div className="bg-white rounded-xl border border-gray-200 p-4">
                                  <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                    <Share2 className="w-4 h-4 text-gray-400" />
                                    Traffic Sources
                                    <span className="ml-auto text-xs font-normal text-gray-400">{events.length} total</span>
                                  </h4>
                                  <div className="space-y-3">
                                    {referrers.slice(0, 6).map(([label, count]) => (
                                      <div key={label}>
                                        <div className="flex justify-between items-center text-xs mb-1.5">
                                          <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${getReferrerColor(label)}`} />
                                            <span className="text-gray-700 font-medium">{label}</span>
                                          </div>
                                          <span className="text-gray-500">{count} click{count !== 1 ? "s" : ""} ({Math.round((count / events.length) * 100)}%)</span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                                          <div
                                            className={`h-1.5 rounded-full transition-all duration-500 ${getReferrerColor(label)}`}
                                            style={{ width: `${(count / events.length) * 100}%` }}
                                          />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Recent Clicks */}
                                <div className="bg-white rounded-xl border border-gray-200 p-4">
                                  <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    Recent Clicks
                                    <span className="ml-auto text-xs font-normal text-gray-400">latest {Math.min(events.length, 8)}</span>
                                  </h4>
                                  <div className="space-y-2.5">
                                    {events.slice(0, 8).map((ev, idx) => {
                                      const label = formatReferrer(ev.referrer);
                                      return (
                                        <div key={ev.id || idx} className="flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-2 min-w-0">
                                            <span className={`flex-shrink-0 w-2 h-2 rounded-full ${getReferrerColor(label)}`} />
                                            <span className="text-xs text-gray-500 truncate">
                                              {new Date(ev.clicked_at).toLocaleString("en-IN", {
                                                month: "short", day: "numeric",
                                                hour: "2-digit", minute: "2-digit"
                                              })}
                                            </span>
                                          </div>
                                          <span className={`flex-shrink-0 text-xs font-semibold text-white px-2 py-0.5 rounded-full ${getReferrerColor(label)}`}>
                                            {label}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Setup Note */}
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm">
              <p className="font-semibold text-amber-800 mb-1">📋 Supabase Setup Required for Analytics</p>
              <p className="text-amber-700">Run this SQL in your Supabase SQL Editor to enable detailed click tracking:</p>
              <pre className="mt-2 text-xs bg-white border border-amber-100 rounded-lg p-3 overflow-x-auto text-gray-700">{`CREATE TABLE IF NOT EXISTS click_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  short_code TEXT NOT NULL,
  clicked_at TIMESTAMPTZ DEFAULT NOW(),
  referrer TEXT,
  user_agent TEXT
);
ALTER TABLE click_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow insert" ON click_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select" ON click_events FOR SELECT USING (true);`}</pre>
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
