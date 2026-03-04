chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'toggleFeature') return;
  chrome.storage.sync.get(['enabledFeatures'], ({ enabledFeatures = {} }) => {
    enabledFeatures[message.id] = !enabledFeatures[message.id];
    chrome.storage.sync.set({ enabledFeatures }, async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: 'featuresUpdated' });
      sendResponse({ ok: true, enabled: enabledFeatures[message.id] });
    });
  });
  return true;
});
