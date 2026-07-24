const fs = require('fs');

let content = fs.readFileSync('src/App.jsx', 'utf-8');

// 1. Comment out the My Links button
const navBtn = `            <button
              onClick={() => setActiveTab("dashboard")}
              className={\`flex-1 sm:flex-none text-sm font-medium px-3 py-1.5 rounded-md transition-colors \${activeTab === "dashboard" ? "text-emerald-600 bg-emerald-50" : "text-gray-600 hover:text-emerald-600"}\`}
            >
              My Links
            </button>`;

const navBtnCommented = `            {/* <button
              onClick={() => setActiveTab("dashboard")}
              className={\`flex-1 sm:flex-none text-sm font-medium px-3 py-1.5 rounded-md transition-colors \${activeTab === "dashboard" ? "text-emerald-600 bg-emerald-50" : "text-gray-600 hover:text-emerald-600"}\`}
            >
              My Links
            </button> */}`;

content = content.replace(navBtn, navBtnCommented);

// 2. Comment out the Dashboard tab
const startStr = '{/* TAB: ANALYTICS DASHBOARD */}';
const endStr = '{/* TAB: UNSHORTEN */}';

const startIdx = content.indexOf(startStr);
const endIdx = content.indexOf(endStr);

if (startIdx !== -1 && endIdx !== -1) {
    const dashboardSection = content.substring(startIdx, endIdx);
    
    // Remove nested block comments to avoid breaking the outer comment
    let dashboardSectionClean = dashboardSection.replace(/{\/\*/g, '').replace(/\*\/}/g, '');
    
    // Wrap in block comment
    const dashboardCommented = startStr + '\n        {/*\n' + dashboardSectionClean.trim() + '\n        */}\n\n        ';
    
    content = content.substring(0, startIdx) + dashboardCommented + content.substring(endIdx);
}

fs.writeFileSync('src/App.jsx', content, 'utf-8');
console.log('Success');
