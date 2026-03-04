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

  const NORMALIZED_TERMS = BLOCKED_TERMS
    .map((term) => term.trim().toLowerCase())
    .filter(Boolean);

  const CARD_SELECTORS = [
    "ytd-rich-item-renderer",
    "ytd-video-renderer",
    "ytd-grid-video-renderer",
    "ytd-compact-video-renderer",
    "ytd-reel-item-renderer",
    "ytd-reel-video-renderer",
    "ytd-shorts-lockup-view-model",
    "ytm-video-with-context-renderer",
    "ytm-compact-video-renderer"
  ].join(",");

  const HIDE_STYLE = "display: none !important;";
  const PROCESSED_ATTR = "data-brainrot-checked";

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

  function extractTextFromCard(card) {
    const parts = [];

    const titleCandidates = card.querySelectorAll(
      "#video-title, #title, h3, h4, a[title], yt-formatted-string"
    );
    titleCandidates.forEach((el) => {
      const text = el.getAttribute("title") || el.textContent;
      if (text) parts.push(text);
    });

    const descCandidates = card.querySelectorAll(
      "#description-text, #description, .metadata-snippet-text, yt-formatted-string"
    );
    descCandidates.forEach((el) => {
      if (el.textContent) parts.push(el.textContent);
    });

    const ariaLabelled = card.querySelectorAll("a[aria-label], img[alt]");
    ariaLabelled.forEach((el) => {
      const text = el.getAttribute("aria-label") || el.getAttribute("alt");
      if (text) parts.push(text);
    });

    return parts.join(" \n ");
  }

  function hideCard(card, reason) {
    card.setAttribute("data-brainrot-hidden", "1");
    card.setAttribute("data-brainrot-reason", reason);
    card.style.cssText += HIDE_STYLE;
  }

  function checkAndHideCard(card) {
    if (!card || card.getAttribute(PROCESSED_ATTR) === "1") return;

    const text = extractTextFromCard(card);
    if (containsBlockedTerm(text)) {
      hideCard(card, "title-or-description");
    }

    card.setAttribute(PROCESSED_ATTR, "1");
  }

  function processAllCards() {
    const cards = document.querySelectorAll(CARD_SELECTORS);
    cards.forEach(checkAndHideCard);
  }

  function getWatchPageMetadataText() {
    const chunks = [];

    const titleEl = document.querySelector("h1.ytd-watch-metadata yt-formatted-string, h1.title");
    if (titleEl?.textContent) chunks.push(titleEl.textContent);

    const descriptionEl = document.querySelector(
      "#description-inline-expander, #description, ytd-text-inline-expander"
    );
    if (descriptionEl?.textContent) chunks.push(descriptionEl.textContent);

    const scripts = document.querySelectorAll("script");
    for (const script of scripts) {
      const text = script.textContent || "";
      if (!text.includes("ytInitialPlayerResponse")) continue;

      try {
        const match = text.match(/ytInitialPlayerResponse\s*=\s*(\{[\s\S]*?\});/);
        if (!match) continue;

        const data = JSON.parse(match[1]);
        const details = data?.videoDetails || {};
        if (details.title) chunks.push(details.title);
        if (details.shortDescription) chunks.push(details.shortDescription);
        if (Array.isArray(details.keywords)) {
          chunks.push(details.keywords.join(" "));
        }
      } catch (_err) {
        // Ignore parse errors and continue.
      }
    }

    return chunks.join(" \n ");
  }

  function blockCurrentWatchPageIfNeeded() {
    const isWatchOrShorts = location.pathname.startsWith("/watch") || location.pathname.startsWith("/shorts/");
    if (!isWatchOrShorts) return;

    const combined = getWatchPageMetadataText();
    if (!containsBlockedTerm(combined)) return;

    const player = document.querySelector("#player, ytd-player, ytm-player") || document.body;
    const overlayId = "brainrot-block-overlay";

    if (document.getElementById(overlayId)) return;

    const overlay = document.createElement("div");
    overlay.id = overlayId;
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

    player.appendChild(overlay);

    const video = document.querySelector("video");
    if (video) {
      video.pause();
      video.currentTime = 0;
      video.muted = true;
    }
  }

  let lastUrl = location.href;

  function runBlockingPass() {
    processAllCards();
    blockCurrentWatchPageIfNeeded();
  }

  function onPotentialNavigation() {
    if (location.href === lastUrl) return;
    lastUrl = location.href;

    document.querySelectorAll(`[${PROCESSED_ATTR}]`).forEach((el) => {
      el.removeAttribute(PROCESSED_ATTR);
    });

    setTimeout(runBlockingPass, 300);
    setTimeout(runBlockingPass, 1200);
  }

  const observer = new MutationObserver(() => {
    runBlockingPass();
    onPotentialNavigation();
  });

  observer.observe(document.documentElement || document.body, {
    childList: true,
    subtree: true
  });

  window.addEventListener("yt-navigate-finish", () => {
    onPotentialNavigation();
    runBlockingPass();
  });

  runBlockingPass();
})();
