const fs = require('fs');

let content = fs.readFileSync('src/App.jsx', 'utf-8');

// 1. Uncomment nav button
const navBtnCommented = `            {/* <button
              onClick={() => setActiveTab("dashboard")}
              className={\`flex-1 sm:flex-none text-sm font-medium px-3 py-1.5 rounded-md transition-colors \${activeTab === "dashboard" ? "text-emerald-600 bg-emerald-50" : "text-gray-600 hover:text-emerald-600"}\`}
            >
              My Links
            </button> */}`;

const navBtn = `            <button
              onClick={() => setActiveTab("dashboard")}
              className={\`flex-1 sm:flex-none text-sm font-medium px-3 py-1.5 rounded-md transition-colors \${activeTab === "dashboard" ? "text-emerald-600 bg-emerald-50" : "text-gray-600 hover:text-emerald-600"}\`}
            >
              My Links
            </button>`;

content = content.replace(navBtnCommented, navBtn);

// 2. Replace dashboard section
const startStr = '{/* TAB: ANALYTICS DASHBOARD */}';
const endStr = '</main>';
const startIdx = content.indexOf(startStr);
const endIdx = content.indexOf(endStr);

if (startIdx !== -1 && endIdx !== -1) {
  const newDashboard = `        {/* TAB: MY LINKS */}
        {activeTab === "dashboard" && (
          <div className="animate-in fade-in duration-300 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">My Links</h2>
                <p className="text-gray-500 mt-1 text-sm">View all your shortened links</p>
              </div>
              <button
                onClick={() => fetchMyLinks()}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors font-medium text-sm border border-emerald-200"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {urls.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <Link2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No links yet</p>
                  <p className="text-sm text-gray-400 mt-1">Shorten a URL to see it here</p>
                  <button
                    onClick={() => setActiveTab("shorten")}
                    className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                  >
                    Shorten your first link
                  </button>
                </div>
              ) : (
                <div>
                  <div className="hidden sm:grid grid-cols-12 gap-2 px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <div className="col-span-3">Short Link</div>
                    <div className="col-span-7">Destination</div>
                    <div className="col-span-2 text-right">Actions</div>
                  </div>

                  {urls.map((u) => (
                    <div key={u.short_code} className="border-b border-gray-100 last:border-0">
                      <div className="flex sm:grid sm:grid-cols-12 gap-2 px-4 sm:px-5 py-4 items-center">
                        <div className="flex-shrink-0 sm:col-span-3">
                          <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-xs sm:text-sm font-mono">
                            /{u.short_code}
                          </span>
                        </div>
                        <div className="hidden sm:block sm:col-span-7">
                          <p className="text-gray-700 text-sm truncate" title={u.original_url}>
                            {u.original_url}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Created {new Date(u.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex-1 sm:hidden min-w-0 px-2">
                          <p className="text-gray-700 text-xs truncate">{u.original_url}</p>
                          <p className="text-xs text-gray-400">{new Date(u.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex-shrink-0 sm:col-span-2 flex justify-end gap-2">
                          <button
                            onClick={() => handleCopy(\`\${window.location.origin}/\${u.short_code}\`)}
                            className="p-2 text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Copy Link"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => window.open(u.original_url, "_blank")}
                            className="p-2 text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                            title="Test Link"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      `;

  content = content.substring(0, startIdx) + newDashboard + endStr + content.substring(endIdx + endStr.length);
  fs.writeFileSync('src/App.jsx', content, 'utf-8');
  console.log('Success');
} else {
  console.log('Could not find start or end strings.');
}
