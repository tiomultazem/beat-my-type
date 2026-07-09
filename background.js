// Register declarativeNetRequest rules to bypass X-Frame-Options and CSP for framing
const registerDNRRules = () => {
  const rule = {
    id: 1,
    priority: 1,
    action: {
      type: "modifyHeaders",
      responseHeaders: [
        { header: "X-Frame-Options", operation: "remove" },
        { header: "Content-Security-Policy", operation: "remove" }
      ]
    },
    condition: {
      urlFilter: "||fasih-sm.bps.go.id",
      resourceTypes: ["sub_frame"]
    }
  };

  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1],
    addRules: [rule]
  }, () => {
    if (chrome.runtime.lastError) {
      console.error("[FasihSM Guard] DNR rule registration failed:", chrome.runtime.lastError.message);
    } else {
      console.log("[FasihSM Guard] DNR rules registered successfully.");
    }
  });
};

registerDNRRules();

// Global tracking for the last synced Fasih-SM tab
let lastFasihTabId = null;

// Helper function to extract and sync cookies to local Flask server
function extractAndSync(ua, senderTabId, callback) {
  const targetUrl = "https://fasih-sm.bps.go.id/survey/api/v1/surveys/datatable";
  const partitionKeys = [
    null,
    {},
    { topLevelSite: "https://bps.go.id" },
    { topLevelSite: "https://fasih-sm.bps.go.id" },
    { topLevelSite: "https://sso.bps.go.id" }
  ];

  const queries = [];
  partitionKeys.forEach(pk => {
    const q = { url: targetUrl };
    if (pk !== null) {
      q.partitionKey = pk;
    }
    queries.push(q);
  });

  const allCookies = [];
  const seen = new Set();
  let completed = 0;

  const checkFinish = () => {
    completed++;
    if (completed === queries.length) {
      if (allCookies.length === 0) {
        chrome.action.setBadgeText({ text: "FAIL" });
        chrome.action.setBadgeBackgroundColor({ color: "#dc3545" });
        if (callback) callback(false);
        return;
      }

      const cookieStr = allCookies.map(c => `${c.name}=${c.value}`).join("; ");
      const LOCAL_APP_URL = "http://127.0.0.1:5000/fasihsm-fetcher/import-session-cookies";

      fetch(LOCAL_APP_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          session_text: "Cookie: " + cookieStr + "\nUser-Agent: " + ua
        })
      })
      .then(res => res.json())
      .then(data => {
        chrome.action.setBadgeText({ text: "OK" });
        chrome.action.setBadgeBackgroundColor({ color: "#28a745" });
        setTimeout(() => chrome.action.setBadgeText({ text: "" }), 3000);
        if (callback) callback(true);
      })
      .catch(err => {
        console.warn("[Session Sync] Flask server offline, silent skip:", err.message);
        chrome.action.setBadgeText({ text: "OK" });
        chrome.action.setBadgeBackgroundColor({ color: "#28a745" });
        setTimeout(() => chrome.action.setBadgeText({ text: "" }), 3000);
        if (callback) callback(true);
      });
    }
  };

  queries.forEach(q => {
    try {
      chrome.cookies.getAll(q, (cookies) => {
        if (chrome.runtime.lastError) {
          console.error("Cookie query error:", chrome.runtime.lastError.message, q);
        }
        if (cookies) {
          for (const c of cookies) {
            if (!seen.has(c.name)) {
              seen.add(c.name);
              allCookies.push(c);
            }
          }
        }
        checkFinish();
      });
    } catch (e) {
      console.error("Cookie sync catch error:", e, q);
      checkFinish();
    }
  });
}

// Manual trigger via extension icon click
chrome.action.onClicked.addListener((tab) => {
  if (tab.url && tab.url.includes("bps.go.id")) {
    lastFasihTabId = tab.id; // Record tab ID during manual sync
    console.log("[Fasih Sync Service] Recorded Fasih-SM tab ID:", lastFasihTabId);
    
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => navigator.userAgent
    }, (results) => {
      let ua = navigator.userAgent;
      if (results && results[0]) {
        ua = results[0].result;
      }
      extractAndSync(ua, null, null);
    });
  } else {
    chrome.action.setBadgeText({ text: "OPEN" });
    chrome.action.setBadgeBackgroundColor({ color: "#ffc107" });
    setTimeout(() => chrome.action.setBadgeText({ text: "" }), 3000);
  }
});

// Automatic trigger from dashboard page bridge
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "sync_only") {
    console.log("[Fasih Sync Service] Received sync_only request.");
    const tabId = sender.tab ? sender.tab.id : lastFasihTabId;
    if (tabId) {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => navigator.userAgent
      }, (results) => {
        let ua = navigator.userAgent;
        if (results && results[0]) {
          ua = results[0].result;
        }
        extractAndSync(ua, tabId, (success) => {
          console.log("[Fasih Sync Service] Silent sync complete, success:", success);
        });
      });
    }
  } else if (request.action === "trigger_keepalive") {
    console.log("[FasihSM Guard] Received keepalive trigger.");
    reloadKeepaliveTab();
  } else if (request.action === "refresh_and_sync") {
    console.log("[Fasih Sync Service] Received refresh_and_sync request.");
    
    const reloadAndSync = (tabId) => {
      console.log(`[Fasih Sync Service] Reloading Fasih tab ID ${tabId} to trigger F5 challenge resolution...`);
      chrome.tabs.reload(tabId, { bypassCache: true }, () => {
        if (chrome.runtime.lastError) {
          console.error("[Fasih Sync Service] Reload error:", chrome.runtime.lastError.message);
          fallbackSearch();
          return;
        }
        
        setTimeout(() => {
          console.log("[Fasih Sync Service] Fetching user agent and extracting cookies...");
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => navigator.userAgent
          }, (results) => {
            if (chrome.runtime.lastError) {
              console.error("[Fasih Sync Service] Script injection error:", chrome.runtime.lastError.message);
              fallbackSearch();
              return;
            }
            
            let ua = navigator.userAgent;
            if (results && results[0]) {
              ua = results[0].result;
            }
            
            extractAndSync(ua, sender.tab ? sender.tab.id : null, (success) => {
              if (sender.tab && sender.tab.id) {
                chrome.tabs.sendMessage(sender.tab.id, { action: "sync_complete", success: success });
              }
            });
          });
        }, 5000);
      });
    };

    const fallbackSearch = () => {
      console.log("[Fasih Sync Service] Performing blind query search for BPS tab...");
      chrome.tabs.query({}, (tabs) => {
        const fasihTab = tabs.find(t => t.url && t.url.includes("fasih-sm.bps.go.id"));
        if (!fasihTab) {
          console.error("[Fasih Sync Service] Fasih-SM tab not found.");
          if (sender.tab && sender.tab.id) {
            chrome.tabs.sendMessage(sender.tab.id, { action: "sync_complete", success: false });
          }
          return;
        }
        lastFasihTabId = fasihTab.id; // Remember this ID
        reloadAndSync(fasihTab.id);
      });
    };

    if (lastFasihTabId !== null) {
      chrome.tabs.get(lastFasihTabId, (tab) => {
        if (chrome.runtime.lastError || !tab || !tab.url || !tab.url.includes("bps.go.id")) {
          console.log("[Fasih Sync Service] Saved tab ID not valid anymore. Falling back to query search.");
          fallbackSearch();
        } else {
          reloadAndSync(lastFasihTabId);
        }
      });
    } else {
      fallbackSearch();
    }
  }
});

// ── Hidden Tab Keep-Alive Management ──────────────────────────────────────────

let keepaliveTabId = null;

async function ensureKeepaliveTab() {
  // ONLY check if OUR dedicated keepalive tab still exists
  // NEVER search for or reuse user's working tabs!
  if (keepaliveTabId !== null) {
    try {
      const tab = await chrome.tabs.get(keepaliveTabId);
      // Tab exists - trust our tracking
      // Don't validate URL because it might be loading after reload
      if (tab) {
        console.log("[FasihSM Guard] Using dedicated keepalive tab:", keepaliveTabId);
        return keepaliveTabId;
      }
    } catch (e) {
      // Tab was closed by user or browser
      console.log("[FasihSM Guard] Dedicated keepalive tab was closed.");
      keepaliveTabId = null;
    }
  }
  
  // Create NEW dedicated keepalive tab
  // This tab is SEPARATE from user's working tabs
  console.log("[FasihSM Guard] Creating dedicated keepalive tab...");
  const tab = await chrome.tabs.create({
    url: "https://fasih-sm.bps.go.id/app/",
    active: false  // Don't steal focus from user
  });
  
  keepaliveTabId = tab.id;
  
  // Add distinctive title so user can identify keepalive tab
  setTimeout(() => {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => { 
        document.title = "[Keep-Alive] " + document.title; 
      }
    }).catch(e => console.log("[FasihSM Guard] Could not set tab title:", e));
  }, 2000);
  
  console.log("[FasihSM Guard] Dedicated keepalive tab created:", keepaliveTabId);
  
  return keepaliveTabId;
}

async function reloadKeepaliveTab() {
  try {
    const tabId = await ensureKeepaliveTab();
    await chrome.tabs.reload(tabId, { bypassCache: false });
    console.log("[FasihSM Guard] Keepalive tab reloaded at:", new Date().toLocaleTimeString());
  } catch (err) {
    console.error("[FasihSM Guard] Failed to reload keepalive tab:", err);
    keepaliveTabId = null; // Reset so next call will create new tab
  }
}
