(() => {
  "use strict";

  const BLOCKED_TERMS = [
    "brainrot","brain rot","gen alpha","skibidi","skibidi toilet","sigma","ohio","gyatt","gyat","rizz",
    "rizzler","fanum","fanum tax","tax","alpha","beta","omega","grimace","shake","mewing",
    "looksmaxxing","looks maxxing","looksmax","looksmaxing","mog","mogging","mew","chad","gigachad",
    "stacy","incel","cuck","pilled","redpill","red pill","blackpill","black pill","bluepill","blue pill",

    "toilet","cameraman","speakerman","tv man","tvwoman","titan","astro","astro toilet","gman","plunger",
    "plungerman","dop dop","bop bop","ai","ais",

    "bussing","bussin","cap","no cap","capping","based","cringe","mid","npc","npc energy","side eye",
    "the ick","cheugy","bet","yeet","cuh","bruh","fr fr","for real","ong","deadass","slay","queen",
    "king","goat","dub","dubz","w rizz","l rizz",

    "18+","17+","16+","21+","adult","mature","nsfw","sex","sexy","dating","kiss","kissing","romance",
    "love","crush","boyfriend","girlfriend","simp","simping","onlyfans","leak","leaked","nude","naked",
    "bikini","swimsuit","thirst","thirsty",

    "garden","farm","garten","garten of banban","garden of banban","banban","jumbo josh","opila bird",
    "stinger flynn","captain fiddles","poppy playtime","huggy wuggy","kissy missy","mommy long legs",
    "daddy long legs","catnap","dogday","bobby bearhug","rainbow friends",

    "fnaf","five nights","freddy","bonnie","chica","foxy","springtrap","bendy","bendy and the ink",
    "cuphead","mugman",

    "grow a","grow your","grow your poop","poop","pee","fart","potty","diaper","baby","toddler","infant",
    "booger","snot","vomit","throw up","puke","slime","poop simulator","poop race","poop battle",
    "fart simulator","fart race",

    "steal","steal a","steal my","steal your","robbery","rob","thief","stealing","stolen","crime",
    "criminal","gang","mafia","hood","hood simulator","hood wars","hood life","projects","trap",
    "trapping","drugs","weed","cocaine","meth","lean","sizzurp","xan","xanax",

    "kreekcraft","kreek","flamingo","mrflimflam","tanqr","russo","russoplays","itsfunneh","funneh",
    "denis","denisdaily","preston","prestonplays","tbnr","moose","moosecraft","unspeakable",
    "unspeakablegaming"
  ];

  const NORMALIZED_TERMS = BLOCKED_TERMS.map((term) => term.trim().toLowerCase()).filter(Boolean);
  const OVERLAY_ID = "brainrot-block-overlay";

  const CARD_SELECTORS = [
    "ytd-video-renderer",
    "ytd-rich-item-renderer",
    "ytd-grid-video-renderer",
    "ytd-compact-video-renderer",
    "ytd-reel-item-renderer",
    "ytd-reel-video-renderer",
    "ytd-reel-shelf-renderer",
    "ytd-shorts-lockup-view-model",
    "ytm-video-with-context-renderer",
    "ytm-compact-video-renderer"
  ].join(",");

  function normalize(value) {
    return (value || "")
      .toString()
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function containsBlockedTerm(text) {
    const haystack = normalize(text);
    if (!haystack) return false;
    return NORMALIZED_TERMS.some((term) => haystack.includes(term));
  }

  function getNodeText(node) {
    if (!node) return "";
    const parts = [node.innerText || "", node.textContent || ""];

    node.querySelectorAll("a[title], a[aria-label], img[alt]").forEach((el) => {
      const title = el.getAttribute("title");
      const aria = el.getAttribute("aria-label");
      const alt = el.getAttribute("alt");
      if (title) parts.push(title);
      if (aria) parts.push(aria);
      if (alt) parts.push(alt);
    });

    return parts.join(" \n ");
  }

  function getAllShortsLinks(scope = document) {
    return Array.from(scope.querySelectorAll("a[href*='/shorts/']"));
  }

  function hideElement(node, reason) {
    if (!node) return;
    node.setAttribute("data-brainrot-hidden", "1");
    node.setAttribute("data-brainrot-reason", reason);
    node.style.setProperty("display", "none", "important");
  }

  function findBestContainerForLink(link) {
    return (
      link.closest("ytd-rich-item-renderer") ||
      link.closest("ytd-reel-item-renderer") ||
      link.closest("ytd-reel-video-renderer") ||
      link.closest("ytd-grid-video-renderer") ||
      link.closest("ytd-video-renderer") ||
      link.closest("ytd-shorts-lockup-view-model") ||
      link.closest("ytm-video-with-context-renderer") ||
      link.closest("ytm-compact-video-renderer") ||
      link.closest("ytd-reel-shelf-renderer") ||
      link
    );
  }

  function processCards() {
    const cards = document.querySelectorAll(CARD_SELECTORS);
    cards.forEach((card) => {
      const combined = getNodeText(card);
      if (containsBlockedTerm(combined)) {
        hideElement(card, "card-text");
      }
    });
  }

  function processShortsLinks(forceHideAllShorts = false) {
    const links = getAllShortsLinks();
    links.forEach((link) => {
      const linkText = [
        link.getAttribute("title") || "",
        link.getAttribute("aria-label") || "",
        link.textContent || "",
        link.href || ""
      ].join(" \n ");

      const container = findBestContainerForLink(link);
      const containerText = getNodeText(container);

      if (forceHideAllShorts || containsBlockedTerm(`${linkText}\n${containerText}`)) {
        hideElement(container, "shorts-link-text");
      }
    });
  }


  function hideShortsForBlockedSearchQuery() {
    const isSearchPage = location.pathname.startsWith("/results");
    if (!isSearchPage) return false;

    const params = new URLSearchParams(location.search);
    const query = params.get("search_query") || "";
    if (!containsBlockedTerm(query)) return false;

    document
      .querySelectorAll("ytd-reel-shelf-renderer, ytd-shelf-renderer ytd-reel-shelf-renderer")
      .forEach((shelf) => hideElement(shelf, "blocked-search-query-shorts-shelf"));

    processShortsLinks(true);
    return true;
  }

  function getWatchPageMetadataText() {
    const chunks = [];

    if (document.title) chunks.push(document.title);

    const metaSelectors = [
      "meta[property='og:title']",
      "meta[name='title']",
      "meta[property='og:description']",
      "meta[name='description']",
      "meta[name='keywords']"
    ];

    metaSelectors.forEach((selector) => {
      const node = document.querySelector(selector);
      if (node?.content) chunks.push(node.content);
    });

    const textSelectors = [
      "h1.ytd-watch-metadata yt-formatted-string",
      "h1.title",
      "#description-inline-expander",
      "#description",
      "ytd-text-inline-expander",
      "ytd-reel-player-header-renderer #title",
      "ytm-shorts-lockup-view-model h3"
    ];

    textSelectors.forEach((selector) => {
      const node = document.querySelector(selector);
      if (node?.textContent) chunks.push(node.textContent);
    });

    const playerResponse = window.ytInitialPlayerResponse;
    if (playerResponse?.videoDetails) {
      const details = playerResponse.videoDetails;
      if (details.title) chunks.push(details.title);
      if (details.shortDescription) chunks.push(details.shortDescription);
      if (Array.isArray(details.keywords)) chunks.push(details.keywords.join(" "));
    }

    return chunks.join(" \n ");
  }

  function blockCurrentWatchPageIfNeeded() {
    const isWatchOrShorts =
      location.pathname.startsWith("/watch") ||
      location.pathname.startsWith("/shorts/") ||
      location.href.includes("/shorts/");

    if (!isWatchOrShorts) return;

    const combined = getWatchPageMetadataText();
    if (!containsBlockedTerm(combined)) return;

    if (!document.getElementById(OVERLAY_ID)) {
      const overlay = document.createElement("div");
      overlay.id = OVERLAY_ID;
      overlay.style.cssText = [
        "position: fixed",
        "inset: 0",
        "z-index: 2147483647",
        "background: #111",
        "color: #fff",
        "display: flex",
        "align-items: center",
        "justify-content: center",
        "font-family: Arial, sans-serif",
        "font-size: 20px",
        "padding: 24px",
        "text-align: center"
      ].join(";");
      overlay.textContent = "Blocked by YouTube Brainrot Blocker (matched title/description/tags).";
      document.body.appendChild(overlay);
    }

    document.querySelectorAll("video").forEach((video) => {
      video.pause();
      video.muted = true;
      video.currentTime = 0;
    });
  }

  function runBlockingPass() {
    processCards();
    const forcedBySearchQuery = hideShortsForBlockedSearchQuery();
    if (!forcedBySearchQuery) {
      processShortsLinks();
    }
    blockCurrentWatchPageIfNeeded();
  }

  let scheduled = false;
  function scheduleBlockingPass() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      runBlockingPass();
    });
  }

  const observer = new MutationObserver(() => {
    scheduleBlockingPass();
  });

  observer.observe(document.documentElement || document.body, {
    childList: true,
    subtree: true
  });

  window.addEventListener("yt-navigate-finish", () => {
    setTimeout(runBlockingPass, 50);
    setTimeout(runBlockingPass, 400);
    setTimeout(runBlockingPass, 1200);
  });

  runBlockingPass();
})();
