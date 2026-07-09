console.log("[FasihSM Guard] Keep-alive active (Hidden Tab Mode).");

const ping = () => {
  console.log("[FasihSM Guard] Triggering keepalive reload...");
  chrome.runtime.sendMessage({ action: "trigger_keepalive" });
};

// Ping every 30 seconds
setInterval(ping, 30000);

// Initial ping after 5 seconds (allow page to load first)
setTimeout(ping, 5000);
