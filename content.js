// Bridge between dashboard page and extension background.js
window.addEventListener("FasihRequestNewSession", () => {
    console.log("[Fasih Extension Bridge] Requesting session refresh...");
    chrome.runtime.sendMessage({ action: "refresh_and_sync" });
});

chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "sync_complete") {
        console.log("[Fasih Extension Bridge] Session sync complete!");
        window.dispatchEvent(new CustomEvent("FasihSessionSyncComplete", { detail: { success: message.success } }));
    }
});
