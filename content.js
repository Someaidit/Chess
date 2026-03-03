(() => {
  const AD_SELECTORS = [
    '.video-ads',
    '.ytp-ad-module',
    '.ytp-ad-overlay-container',
    '.ytd-display-ad-renderer',
    '.ytd-promoted-sparkles-web-renderer',
    'ytd-companion-slot-renderer',
    'ytd-ad-slot-renderer',
    'ytd-in-feed-ad-layout-renderer',
    '#player-ads',
    '#masthead-ad'
  ];

  const SKIP_BUTTON_SELECTORS = [
    '.ytp-ad-skip-button',
    '.ytp-ad-skip-button-modern',
    '.ytp-skip-ad-button'
  ];

  const removeAdElements = () => {
    for (const selector of AD_SELECTORS) {
      document.querySelectorAll(selector).forEach((element) => {
        element.remove();
      });
    }
  };

  const clickSkipButtons = () => {
    for (const selector of SKIP_BUTTON_SELECTORS) {
      document.querySelectorAll(selector).forEach((button) => {
        if (button instanceof HTMLElement && button.offsetParent !== null) {
          button.click();
        }
      });
    }
  };

  const speedThroughActiveAd = () => {
    const player = document.querySelector('video');
    const isAdPlaying = document.querySelector('.ad-showing');

    if (!(player instanceof HTMLVideoElement) || !isAdPlaying) {
      return;
    }

    player.muted = true;
    player.playbackRate = 16;

    const nearEnd = Math.max(player.duration - 0.15, 0);
    if (Number.isFinite(nearEnd) && player.currentTime < nearEnd) {
      player.currentTime = nearEnd;
    }
  };

  const run = () => {
    removeAdElements();
    clickSkipButtons();
    speedThroughActiveAd();
  };

  run();
  setInterval(run, 500);

  const observer = new MutationObserver(run);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class']
  });
})();
