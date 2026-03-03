(() => {
  const AD_CLASS_TOKENS = [
    'ad-showing',
    'ad-interrupting',
    'ytp-ad-player-overlay',
    'ytp-ad-overlay-open'
  ];

  const AD_SELECTORS = [
    '.video-ads',
    '.ytp-ad-module',
    '.ytp-ad-overlay-container',
    '.ytp-ad-image-overlay',
    '.ytp-ad-text',
    '.ytp-ad-message-container',
    '.ytp-ad-survey',
    '.ytd-display-ad-renderer',
    '.ytd-promoted-sparkles-web-renderer',
    'ytd-companion-slot-renderer',
    'ytd-ad-slot-renderer',
    'ytd-in-feed-ad-layout-renderer',
    'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"]',
    '#player-ads',
    '#masthead-ad',
    '#panels:has(ytd-ads-engagement-panel-content-renderer)',
    '[class*="ad-slot"]',
    '[id*="ad_creative"]',
    '[data-title-no-tooltip*="Sponsored"]',
    '[aria-label*="Sponsored"]'
  ];

  const SKIP_BUTTON_SELECTORS = [
    '.ytp-ad-skip-button',
    '.ytp-ad-skip-button-modern',
    '.ytp-skip-ad-button',
    '.ytp-ad-skip-button-container button',
    'button[aria-label*="Skip"]',
    'button[aria-label*="skip"]'
  ];

  const CLICKABLE_TEXT = [
    'Skip',
    'Skip Ad',
    'Skip Ads',
    'Dismiss ad',
    'Close ad'
  ];

  const STYLE_ID = 'yt-auto-block-ads-style';
  const IFRAME_FILTER_KEYWORDS = ['doubleclick', 'googlesyndication', 'adservice', 'youtube.com/pagead'];

  const markRun = { count: 0 };

  const getVideo = () => document.querySelector('video');
  const getPlayer = () => document.querySelector('.html5-video-player');
  const isAdShowing = () => {
    const player = getPlayer();
    if (!player) return false;
    return AD_CLASS_TOKENS.some((token) => player.classList.contains(token)) || !!document.querySelector('.ad-showing');
  };

  const safeClick = (element) => {
    if (!(element instanceof HTMLElement)) return;
    if (element.offsetParent === null) return;
    element.click();
  };

  const removeBySelectors = (selectors) => {
    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((node) => node.remove());
    });
  };

  const hideBySelectors = (selectors) => {
    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((node) => {
        if (node instanceof HTMLElement) {
          node.style.setProperty('display', 'none', 'important');
          node.style.setProperty('visibility', 'hidden', 'important');
          node.style.setProperty('opacity', '0', 'important');
        }
      });
    });
  };

  const stripAdAttrs = () => {
    document.querySelectorAll('[class*="ad"], [id*="ad"]').forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      const isYouTubeContainer = node.tagName.startsWith('YTD-') || node.closest('#movie_player');
      if (!isYouTubeContainer) return;
      if (/(^|\b)ad(s|vert|slot|module|container)?(\b|$)/i.test(node.className) || /ad/i.test(node.id)) {
        node.style.setProperty('display', 'none', 'important');
      }
    });
  };

  const jumpVideoToNearEnd = () => {
    const video = getVideo();
    if (!(video instanceof HTMLVideoElement)) return;
    const end = Math.max(video.duration - 0.1, 0);
    if (Number.isFinite(end) && video.currentTime < end) {
      video.currentTime = end;
    }
  };

  const methods = [
    // 1-10: remove common ad surfaces
    () => removeBySelectors(AD_SELECTORS),
    () => hideBySelectors(AD_SELECTORS),
    () => document.querySelectorAll('tp-yt-paper-dialog ytd-popup-container, .yt-mealbar-promo-renderer').forEach((n) => n.remove()),
    () => document.querySelectorAll('ytd-reel-shelf-renderer[is-shorts], ytd-rich-item-renderer').forEach((n) => {
      if (n.textContent?.includes('Sponsored')) n.remove();
    }),
    () => document.querySelectorAll('ytd-video-masthead-ad-v3-renderer, ytd-banner-promo-renderer').forEach((n) => n.remove()),
    () => document.querySelectorAll('ytd-player-legacy-desktop-watch-ads-renderer').forEach((n) => n.remove()),
    () => document.querySelectorAll('ytd-ad-slot-renderer, ytd-display-ad-renderer').forEach((n) => n.remove()),
    () => document.querySelectorAll('iframe').forEach((frame) => {
      const src = frame.getAttribute('src') || '';
      if (IFRAME_FILTER_KEYWORDS.some((k) => src.includes(k))) frame.remove();
    }),
    () => document.querySelectorAll('a[href*="googleadservices"], a[href*="doubleclick"]').forEach((n) => n.remove()),
    () => stripAdAttrs(),

    // 11-20: click/close ad affordances
    () => SKIP_BUTTON_SELECTORS.forEach((s) => document.querySelectorAll(s).forEach(safeClick)),
    () => document.querySelectorAll('.ytp-ad-overlay-close-button, .ytp-ad-overlay-slot .ytp-ad-overlay-close-button').forEach(safeClick),
    () => document.querySelectorAll('.ytp-ad-feedback-dialog-reason-input ~ button, .ytp-ad-feedback-dialog .yt-spec-button-shape-next').forEach(safeClick),
    () => document.querySelectorAll('button').forEach((b) => {
      if (CLICKABLE_TEXT.some((text) => b.textContent?.trim() === text)) safeClick(b);
    }),
    () => document.querySelectorAll('[role="button"]').forEach((b) => {
      const label = b.getAttribute('aria-label') || '';
      if (/skip|dismiss|close ad/i.test(label)) safeClick(b);
    }),
    () => document.querySelectorAll('button[aria-label*="Close"], button[title*="Close"]').forEach(safeClick),
    () => document.querySelectorAll('.ytp-ad-player-overlay-instream-info, .ytp-ad-simple-ad-badge').forEach((n) => n.remove()),
    () => document.querySelectorAll('.annotation').forEach((n) => {
      if (n.textContent?.includes('Sponsored')) n.remove();
    }),
    () => document.querySelectorAll('yt-button-view-model button').forEach((b) => {
      if (/skip/i.test(b.textContent || '')) safeClick(b);
    }),
    () => document.querySelectorAll('.ytp-ce-element').forEach((n) => {
      if (n.textContent?.includes('Visit advertiser')) n.remove();
    }),

    // 21-30: player state forcing
    () => {
      if (!isAdShowing()) return;
      const v = getVideo();
      if (v) v.playbackRate = 16;
    },
    () => {
      if (!isAdShowing()) return;
      const v = getVideo();
      if (v) v.muted = true;
    },
    () => {
      if (!isAdShowing()) return;
      jumpVideoToNearEnd();
    },
    () => {
      if (!isAdShowing()) return;
      const v = getVideo();
      if (v) v.volume = 0;
    },
    () => {
      if (!isAdShowing()) return;
      const player = getPlayer();
      if (player?.classList.contains('ad-showing')) player.classList.remove('ad-showing');
    },
    () => {
      const v = getVideo();
      if (!v) return;
      if (isAdShowing() && v.paused) {
        v.play().catch(() => {});
      }
    },
    () => {
      const player = getPlayer();
      if (!player) return;
      if (isAdShowing()) {
        player.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
      }
    },
    () => {
      const v = getVideo();
      if (!v) return;
      if (isAdShowing()) v.defaultPlaybackRate = 16;
      else v.defaultPlaybackRate = 1;
    },
    () => {
      const v = getVideo();
      if (!v) return;
      if (!isAdShowing() && v.playbackRate !== 1) v.playbackRate = 1;
    },
    () => {
      const player = getPlayer();
      if (!player || !isAdShowing()) return;
      player.setAttribute('data-ad-interrupted', 'true');
    },

    // 31-40: style and DOM hardening
    () => {
      if (document.getElementById(STYLE_ID)) return;
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `${AD_SELECTORS.join(',')} { display:none !important; visibility:hidden !important; opacity:0 !important; }
        .ytp-ad-overlay-container, .ytp-ad-image-overlay, .ytp-ad-text-overlay { display:none !important; }
        ytd-rich-item-renderer:has([aria-label*="Sponsored"]) { display:none !important; }`;
      document.documentElement.appendChild(style);
    },
    () => document.querySelectorAll('style, link[rel="stylesheet"]').forEach((n) => {
      if ((n.textContent || '').includes('.ytp-ad')) {
        n.setAttribute('data-ad-checked', '1');
      }
    }),
    () => document.querySelectorAll('[class]').forEach((n) => {
      if (!(n instanceof HTMLElement)) return;
      if (/\byt[-_]?ad|\bad[-_]?container/i.test(n.className)) n.style.display = 'none';
    }),
    () => document.querySelectorAll('[id]').forEach((n) => {
      if (!(n instanceof HTMLElement)) return;
      if (/ad|promo|sponsor/i.test(n.id) && n.closest('ytd-app')) n.style.display = 'none';
    }),
    () => document.querySelectorAll('ytd-rich-grid-renderer ytd-rich-item-renderer').forEach((item) => {
      if (item.textContent?.match(/Sponsored|Promoted/i)) item.remove();
    }),
    () => document.querySelectorAll('[slot="masthead-ad"]').forEach((n) => n.remove()),
    () => {
      const banner = document.querySelector('#masthead-container ytd-banner-promo-renderer');
      if (banner) banner.remove();
    },
    () => {
      document.querySelectorAll('ytd-popup-container tp-yt-iron-overlay-backdrop').forEach((n) => {
        if (document.body.textContent?.includes('ad')) n.remove();
      });
    },
    () => {
      const chips = document.querySelectorAll('yt-chip-cloud-chip-renderer');
      chips.forEach((chip) => {
        if (/sponsored/i.test(chip.textContent || '')) chip.remove();
      });
    },
    () => {
      const shelf = document.querySelectorAll('ytd-rich-shelf-renderer');
      shelf.forEach((node) => {
        if (/sponsored|from our partners/i.test(node.textContent || '')) node.remove();
      });
    },

    // 41-50: runtime hooks and safeguards
    () => {
      if (!window.__ytAdBlockXHRPatched) {
        window.__ytAdBlockXHRPatched = true;
        const originalOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function patchedOpen(method, url, ...rest) {
          if (typeof url === 'string' && /(doubleclick|pagead|ad_break|get_midroll_info)/i.test(url)) {
            return;
          }
          return originalOpen.call(this, method, url, ...rest);
        };
      }
    },
    () => {
      if (!window.__ytAdBlockFetchPatched) {
        window.__ytAdBlockFetchPatched = true;
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
          const req = args[0];
          const url = typeof req === 'string' ? req : req?.url || '';
          if (/(doubleclick|pagead|ad_break|midroll)/i.test(url)) {
            return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
          }
          return originalFetch(...args);
        };
      }
    },
    () => {
      if (!window.__ytAdBlockJSONPatched) {
        window.__ytAdBlockJSONPatched = true;
        const originalParse = JSON.parse;
        JSON.parse = function patchedParse(text, reviver) {
          const data = originalParse(text, reviver);
          if (data && typeof data === 'object') {
            if (data.playerAds) data.playerAds = [];
            if (data.adPlacements) data.adPlacements = [];
          }
          return data;
        };
      }
    },
    () => {
      if (!window.__ytAdBlockSetIntervalPatched) {
        window.__ytAdBlockSetIntervalPatched = true;
        const originalSetInterval = window.setInterval;
        window.setInterval = (fn, delay, ...args) => {
          if (typeof fn === 'function' && /ad|doubleclick|sponsor/i.test(fn.toString())) {
            return 0;
          }
          return originalSetInterval(fn, delay, ...args);
        };
      }
    },
    () => {
      if (window.__ytAdBlockMediaSourcePatched || typeof MediaSource === 'undefined') return;
      window.__ytAdBlockMediaSourcePatched = true;
      const originalAddSourceBuffer = MediaSource.prototype.addSourceBuffer;
      MediaSource.prototype.addSourceBuffer = function patchedAddSourceBuffer(mimeType) {
        if (typeof mimeType === 'string' && /ad/i.test(mimeType)) {
          throw new Error('Blocked ad source buffer');
        }
        return originalAddSourceBuffer.call(this, mimeType);
      };
    },
    () => {
      if (!window.__ytAdBlockBeaconPatched && navigator.sendBeacon) {
        window.__ytAdBlockBeaconPatched = true;
        const originalBeacon = navigator.sendBeacon.bind(navigator);
        navigator.sendBeacon = (url, data) => {
          if (typeof url === 'string' && /(ad|doubleclick|pagead|impression)/i.test(url)) return true;
          return originalBeacon(url, data);
        };
      }
    },
    () => {
      if (!window.__ytAdBlockOpenPatched) {
        window.__ytAdBlockOpenPatched = true;
        const originalWindowOpen = window.open;
        window.open = (url, ...rest) => {
          if (typeof url === 'string' && /(ad|doubleclick|googlesyndication)/i.test(url)) return null;
          return originalWindowOpen.call(window, url, ...rest);
        };
      }
    },
    () => {
      if (!window.__ytAdBlockHistoryPatched) {
        window.__ytAdBlockHistoryPatched = true;
        const originalPushState = history.pushState;
        history.pushState = function patchedPushState(state, unused, url) {
          const ret = originalPushState.apply(this, [state, unused, url]);
          setTimeout(runAllMethods, 30);
          return ret;
        };
      }
    },
    () => {
      const miniPlayer = document.querySelector('ytd-miniplayer ytd-player');
      if (miniPlayer && /ad/i.test(miniPlayer.textContent || '')) {
        miniPlayer.remove();
      }
    },
    () => {
      markRun.count += 1;
      document.documentElement.setAttribute('data-yt-adblock-run', String(markRun.count));
    }
  ];

  const runAllMethods = () => {
    for (const method of methods) {
      try {
        method();
      } catch (_) {
        // Keep running all methods even if one fails.
      }
    }
  };

  runAllMethods();

  setInterval(runAllMethods, 400);
  setInterval(() => {
    if (isAdShowing()) jumpVideoToNearEnd();
  }, 120);

  const observer = new MutationObserver(runAllMethods);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'id', 'style', 'src']
  });
})();
