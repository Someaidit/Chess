const list = document.getElementById('featureList');
const search = document.getElementById('search');

function render(features, enabled) {
  list.innerHTML = '';
  for (const feature of features) {
    const label = document.createElement('label');
    label.innerHTML = `
      <div class="row">
        <input type="checkbox" data-id="${feature.id}" ${enabled[feature.id] ? 'checked' : ''} />
        <div>
          <strong>${feature.name}</strong>
          <small>${feature.description}</small>
        </div>
      </div>`;
    list.appendChild(label);
  }

  list.querySelectorAll('input[type="checkbox"]').forEach((box) => {
    box.addEventListener('change', () => {
      chrome.storage.sync.get(['enabledFeatures'], ({ enabledFeatures = {} }) => {
        enabledFeatures[box.dataset.id] = box.checked;
        chrome.storage.sync.set({ enabledFeatures }, async () => {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: 'featuresUpdated' });
        });
      });
    });
  });
}

chrome.storage.sync.get(['enabledFeatures'], ({ enabledFeatures = {} }) => {
  render(FEATURES, enabledFeatures);
  search.addEventListener('input', () => {
    const q = search.value.toLowerCase().trim();
    const filtered = !q ? FEATURES : FEATURES.filter((f) =>
      f.name.toLowerCase().includes(q) ||
      f.description.toLowerCase().includes(q) ||
      f.id.toLowerCase().includes(q)
    );
    render(filtered, enabledFeatures);
  });
});
