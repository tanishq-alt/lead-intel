export interface TechProfile {
  domain: string;
  technologies: string[];
  cms: string | null;
  framework: string | null;
  analytics: string[];
  crm: string | null;
  marketing: string[];
  hosting: string | null;
  adtech: string[];
  ecommerce: string | null;
  chatSupport: string | null;
  raw: Record<string, string>;
}

// ─── Signature database ───────────────────────────────────────────────────────
// Patterns checked against: HTML body, response headers (all values joined),
// Link: preconnect/prefetch values, Content-Security-Policy header,
// Set-Cookie header names, and script src attributes.

const SIGNATURES: { category: keyof TechProfile | "technologies"; name: string; patterns: string[] }[] = [
  // ── CMS ──────────────────────────────────────────────────────────────────
  { category: "cms", name: "WordPress",    patterns: ["wp-content", "wp-includes", "wp-json", "/xmlrpc.php", "wordpress"] },
  { category: "cms", name: "Shopify",      patterns: ["cdn.shopify.com", "shopify.com/s/files", "Shopify.theme", "myshopify.com"] },
  { category: "cms", name: "Webflow",      patterns: ["webflow.com", "js.webflow.com", "uploads-ssl.webflow.com"] },
  { category: "cms", name: "Squarespace",  patterns: ["squarespace.com", "static1.squarespace.com", "sqsp.net"] },
  { category: "cms", name: "Wix",          patterns: ["wix.com/", "wixstatic.com", "wixsite.com"] },
  { category: "cms", name: "Ghost",        patterns: ["ghost.org", "ghost.io", "content.ghost.io"] },
  { category: "cms", name: "Drupal",       patterns: ["drupal", "/sites/default/files", "Drupal.settings"] },
  { category: "cms", name: "Joomla",       patterns: ["/components/com_", "/media/jui", "joomla"] },
  { category: "cms", name: "HubSpot CMS",  patterns: ["hubspot.net/", "hs-sites.com", "hubspotpagebuilder.com"] },
  { category: "cms", name: "Contentful",   patterns: ["contentful.com", "cdn.contentful.com"] },
  { category: "cms", name: "Sanity",       patterns: ["sanity.io", "cdn.sanity.io"] },
  { category: "cms", name: "Prismic",      patterns: ["prismic.io", "cdn.prismic.io"] },
  { category: "cms", name: "Storyblok",    patterns: ["storyblok.com"] },

  // ── Frameworks ────────────────────────────────────────────────────────────
  { category: "framework", name: "Next.js",        patterns: ["__NEXT_DATA__", "_next/static", "/_next/", "next-router"] },
  { category: "framework", name: "Nuxt.js",         patterns: ["__NUXT__", "/_nuxt/", "nuxt-link"] },
  { category: "framework", name: "React",           patterns: ["react-dom", "__reactFiber", "data-reactroot", "react.development.js", "react.production.min.js"] },
  { category: "framework", name: "Vue.js",          patterns: ["__vue_app__", "vue.runtime", "vue.min.js", "vue@"] },
  { category: "framework", name: "Angular",         patterns: ["ng-version", "angular/core", "ng-app", "angular.min.js"] },
  { category: "framework", name: "Svelte",          patterns: ["__svelte", "svelte/internal", ".svelte-"] },
  { category: "framework", name: "Gatsby",          patterns: ["gatsby-", "___gatsby", "gatsby.js"] },
  { category: "framework", name: "Astro",           patterns: ["astro-", "@astro", "_astro/"] },
  { category: "framework", name: "Remix",           patterns: ["__remixContext", "__remix", "remix.run"] },
  { category: "framework", name: "Laravel",         patterns: ["laravel_session", "laravel.js", "laravel/"] },
  { category: "framework", name: "Ruby on Rails",  patterns: ["X-Runtime", "rails.js", "actioncable", "rails-ujs"] },
  { category: "framework", name: "Django",          patterns: ["csrfmiddlewaretoken", "django", "__django"] },
  { category: "framework", name: "FastAPI",         patterns: ["fastapi", "openapi.json"] },
  { category: "framework", name: "Express.js",     patterns: ["express", "x-powered-by: express"] },

  // ── Analytics ────────────────────────────────────────────────────────────
  { category: "analytics", name: "Google Analytics",  patterns: ["gtag(", "GA_MEASUREMENT_ID", "google-analytics.com/analytics", "googletagmanager.com", "gtag/js", "UA-", "G-"] },
  { category: "analytics", name: "Segment",           patterns: ["cdn.segment.com", "analytics.js", "segment.io", "api.segment.io"] },
  { category: "analytics", name: "Mixpanel",          patterns: ["cdn.mxpnl.com", "mixpanel.init", "api.mixpanel.com", "mixpanel.com"] },
  { category: "analytics", name: "Amplitude",         patterns: ["cdn.amplitude.com", "amplitude.getInstance", "amplitude.com/libs"] },
  { category: "analytics", name: "Heap",              patterns: ["cdn.heapanalytics.com", "heap.load(", "heapanalytics.com"] },
  { category: "analytics", name: "FullStory",         patterns: ["fullstory.com/s/fs.js", "FS.identify", "rs.fullstory.com", "edge.fullstory.com"] },
  { category: "analytics", name: "Hotjar",            patterns: ["static.hotjar.com", "hj(", "vars.hotjar.com", "insights.hotjar.com"] },
  { category: "analytics", name: "Plausible",         patterns: ["plausible.io/js/plausible", "plausible.io"] },
  { category: "analytics", name: "PostHog",           patterns: ["app.posthog.com", "posthog.init(", "eu.posthog.com", "posthog.com"] },
  { category: "analytics", name: "Pendo",             patterns: ["cdn.pendo.io", "pendo.io/agent", "app.pendo.io"] },
  { category: "analytics", name: "Clarity",           patterns: ["clarity.ms", "microsoft clarity"] },
  { category: "analytics", name: "Datadog RUM",       patterns: ["datadoghq-browser-agent", "browser-intake-datadoghq.com"] },

  // ── CRM ──────────────────────────────────────────────────────────────────
  { category: "crm", name: "HubSpot",    patterns: ["hs-scripts.com", "js.hs-scripts.com", "hbspt.cta", "hubspot.com", "hubspotutk", "hs-beacon.js", "hs-analytics.net"] },
  { category: "crm", name: "Salesforce", patterns: ["salesforce.com", "force.com", "visualforce.com", "lightning.force.com", "salesforceliveagent.com"] },
  { category: "crm", name: "Pipedrive",  patterns: ["pipedrive.com", "app.pipedrive.com"] },
  { category: "crm", name: "Intercom",   patterns: ["js.intercomcdn.com", "intercomSettings", "widget.intercom.io", "app.intercom.io", "api-iam.intercom.io"] },
  { category: "crm", name: "Drift",      patterns: ["js.driftt.com", "drift.js", "drift.load(", "app.drift.com"] },
  { category: "crm", name: "Zendesk",    patterns: ["static.zdassets.com", "zopim.com", "zendesk.com", "d3v-", "zd-"] },
  { category: "crm", name: "Freshdesk",  patterns: ["freshdesk.com", "freshchat.com", "freshworks.com", "wchat.freshchat.com"] },
  { category: "crm", name: "Attio",      patterns: ["attio.com"] },
  { category: "crm", name: "Close CRM",  patterns: ["close.com/api", "closecrm"] },

  // ── Marketing ─────────────────────────────────────────────────────────────
  { category: "marketing", name: "Mailchimp",       patterns: ["mailchimp.com", "chimpstatic.com", "list-manage.com"] },
  { category: "marketing", name: "Klaviyo",         patterns: ["klaviyo.com", "static.klaviyo.com", "a.klaviyo.com"] },
  { category: "marketing", name: "ActiveCampaign",  patterns: ["activecampaign.com", "activehosted.com", "trackcmp.net"] },
  { category: "marketing", name: "Marketo",         patterns: ["marketo.net", "munchkin.marketo.net", "mktoresp.com"] },
  { category: "marketing", name: "Customer.io",     patterns: ["customer.io", "cseg.io", "track.customer.io"] },
  { category: "marketing", name: "Braze",           patterns: ["braze.com", "appboy.com", "sdk.iad-01.braze.com"] },
  { category: "marketing", name: "Iterable",        patterns: ["iterable.com", "links.iterable.com"] },
  { category: "marketing", name: "Pardot",          patterns: ["pardot.com", "pi.pardot.com", "cdn.pardot.com"] },
  { category: "marketing", name: "Vero",            patterns: ["getvero.com", "d3qxef4rp70elm.cloudfront.net"] },
  { category: "marketing", name: "Sendgrid",        patterns: ["sendgrid.net", "sendgrid.com"] },
  { category: "marketing", name: "ConvertKit",      patterns: ["convertkit.com", "ck.page"] },
  { category: "marketing", name: "Beehiiv",         patterns: ["beehiiv.com"] },

  // ── Hosting / CDN ─────────────────────────────────────────────────────────
  { category: "hosting", name: "Vercel",       patterns: ["vercel.app", "x-vercel-id", "vercel-cdn", "_vercel"] },
  { category: "hosting", name: "Netlify",      patterns: ["netlify.app", "netlify.com", "x-nf-request-id"] },
  { category: "hosting", name: "AWS CloudFront", patterns: ["cloudfront.net", "x-amz-cf-id", "x-amz-cf-pop"] },
  { category: "hosting", name: "Cloudflare",   patterns: ["cloudflare", "cf-ray", "__cfduid", "cf-cache-status"] },
  { category: "hosting", name: "Fastly",       patterns: ["fastly.net", "x-fastly", "x-served-by: cache"] },
  { category: "hosting", name: "GitHub Pages", patterns: ["github.io", "githubusercontent.com"] },
  { category: "hosting", name: "Render",       patterns: ["onrender.com", "render.com"] },
  { category: "hosting", name: "Fly.io",       patterns: ["fly.io", "fly.dev"] },
  { category: "hosting", name: "Heroku",       patterns: ["heroku.com", "herokucdn.com", "herokuapp.com"] },
  { category: "hosting", name: "Supabase",     patterns: ["supabase.co", "supabase.com"] },
  { category: "hosting", name: "Firebase",     patterns: ["firebaseapp.com", "firebase.google.com", "firebaseio.com"] },
  { category: "hosting", name: "Akamai",       patterns: ["akamai.net", "akamaihd.net", "akamaized.net"] },

  // ── E-commerce ────────────────────────────────────────────────────────────
  { category: "ecommerce", name: "Shopify",      patterns: ["cdn.shopify.com", "checkout.shopify.com"] },
  { category: "ecommerce", name: "WooCommerce",  patterns: ["woocommerce", "wc-cart", "wc-ajax"] },
  { category: "ecommerce", name: "BigCommerce",  patterns: ["bigcommerce.com", "statics.bigcommerce.com", "cdn11.bigcommerce.com"] },
  { category: "ecommerce", name: "Stripe",       patterns: ["js.stripe.com/v3", "stripe.com/v3", "m.stripe.com", "q.stripe.com"] },
  { category: "ecommerce", name: "Braintree",    patterns: ["braintreepayments.com", "braintreegateway.com", "js.braintreegateway.com"] },
  { category: "ecommerce", name: "Paddle",       patterns: ["paddle.com", "cdn.paddle.com", "checkout.paddle.com"] },
  { category: "ecommerce", name: "Recurly",      patterns: ["recurly.com", "js.recurly.com"] },
  { category: "ecommerce", name: "Chargebee",    patterns: ["chargebee.com", "js.chargebee.com"] },
  { category: "ecommerce", name: "Recharge",     patterns: ["rechargeapps.com", "rechargepayments.com"] },

  // ── Ad Tech ───────────────────────────────────────────────────────────────
  { category: "adtech", name: "Facebook Pixel",    patterns: ["fbq(", "connect.facebook.net/en_US/fbevents.js", "connect.facebook.net"] },
  { category: "adtech", name: "Google Ads",        patterns: ["gtag('config', 'AW-", "googleadservices.com", "googlesyndication.com"] },
  { category: "adtech", name: "LinkedIn Insight",  patterns: ["snap.licdn.com", "linkedin.com/insight", "platform.linkedin.com"] },
  { category: "adtech", name: "Twitter/X Ads",     patterns: ["static.ads-twitter.com", "t.co/i/adsct", "analytics.twitter.com"] },
  { category: "adtech", name: "TikTok Pixel",      patterns: ["analytics.tiktok.com", "tok-tag"] },
  { category: "adtech", name: "Reddit Pixel",      patterns: ["alb.reddit.com", "redd.it/pixel"] },
  { category: "adtech", name: "Microsoft Ads",     patterns: ["bat.bing.com", "uet.microsoft.com"] },

  // ── Chat / Support ────────────────────────────────────────────────────────
  { category: "chatSupport", name: "Intercom",  patterns: ["js.intercomcdn.com", "widget.intercom.io"] },
  { category: "chatSupport", name: "Drift",     patterns: ["js.driftt.com", "js.drift.com"] },
  { category: "chatSupport", name: "Crisp",     patterns: ["client.crisp.chat", "crisp.chat"] },
  { category: "chatSupport", name: "Tidio",     patterns: ["code.tidio.co", "tidio.com"] },
  { category: "chatSupport", name: "LiveChat",  patterns: ["livechatinc.com", "cdn.livechatinc.com"] },
  { category: "chatSupport", name: "Tawk.to",   patterns: ["tawk.to", "embed.tawk.to"] },
  { category: "chatSupport", name: "Olark",     patterns: ["olark.com", "static.olark.com"] },
  { category: "chatSupport", name: "Front",     patterns: ["frontapp.com", "front.com/chat"] },
  { category: "chatSupport", name: "Gorgias",   patterns: ["gorgias.io", "gorgias.com"] },
  { category: "chatSupport", name: "Helpscout", patterns: ["beacon.helpscout.net", "helpscout.net"] },
];

// ─── CSP / preconnect domain → tech mapping ──────────────────────────────────
// When a domain appears in Content-Security-Policy or <link rel="preconnect">,
// it reliably indicates the service is loaded — even when HTML is minified.

const DOMAIN_TO_TECH: [string, { category: keyof TechProfile | "technologies"; name: string }][] = [
  ["js.intercomcdn.com",         { category: "crm", name: "Intercom" }],
  ["widget.intercom.io",         { category: "chatSupport", name: "Intercom" }],
  ["api-iam.intercom.io",        { category: "crm", name: "Intercom" }],
  ["js.driftt.com",              { category: "crm", name: "Drift" }],
  ["hs-scripts.com",             { category: "crm", name: "HubSpot" }],
  ["hs-analytics.net",           { category: "crm", name: "HubSpot" }],
  ["js.hs-scripts.com",          { category: "crm", name: "HubSpot" }],
  ["cdn.segment.com",            { category: "analytics", name: "Segment" }],
  ["api.segment.io",             { category: "analytics", name: "Segment" }],
  ["cdn.mxpnl.com",              { category: "analytics", name: "Mixpanel" }],
  ["api.mixpanel.com",           { category: "analytics", name: "Mixpanel" }],
  ["cdn.amplitude.com",          { category: "analytics", name: "Amplitude" }],
  ["cdn.heapanalytics.com",      { category: "analytics", name: "Heap" }],
  ["static.hotjar.com",          { category: "analytics", name: "Hotjar" }],
  ["insights.hotjar.com",        { category: "analytics", name: "Hotjar" }],
  ["fullstory.com",              { category: "analytics", name: "FullStory" }],
  ["edge.fullstory.com",         { category: "analytics", name: "FullStory" }],
  ["app.posthog.com",            { category: "analytics", name: "PostHog" }],
  ["eu.posthog.com",             { category: "analytics", name: "PostHog" }],
  ["cdn.pendo.io",               { category: "analytics", name: "Pendo" }],
  ["app.pendo.io",               { category: "analytics", name: "Pendo" }],
  ["clarity.ms",                 { category: "analytics", name: "Clarity" }],
  ["datadoghq-browser-agent",    { category: "analytics", name: "Datadog RUM" }],
  ["connect.facebook.net",       { category: "adtech", name: "Facebook Pixel" }],
  ["googleadservices.com",       { category: "adtech", name: "Google Ads" }],
  ["googlesyndication.com",      { category: "adtech", name: "Google Ads" }],
  ["snap.licdn.com",             { category: "adtech", name: "LinkedIn Insight" }],
  ["static.ads-twitter.com",     { category: "adtech", name: "Twitter/X Ads" }],
  ["analytics.tiktok.com",       { category: "adtech", name: "TikTok Pixel" }],
  ["bat.bing.com",               { category: "adtech", name: "Microsoft Ads" }],
  ["alb.reddit.com",             { category: "adtech", name: "Reddit Pixel" }],
  ["static.klaviyo.com",         { category: "marketing", name: "Klaviyo" }],
  ["a.klaviyo.com",              { category: "marketing", name: "Klaviyo" }],
  ["munchkin.marketo.net",       { category: "marketing", name: "Marketo" }],
  ["chimpstatic.com",            { category: "marketing", name: "Mailchimp" }],
  ["list-manage.com",            { category: "marketing", name: "Mailchimp" }],
  ["activehosted.com",           { category: "marketing", name: "ActiveCampaign" }],
  ["trackcmp.net",               { category: "marketing", name: "ActiveCampaign" }],
  ["appboy.com",                 { category: "marketing", name: "Braze" }],
  ["sdk.iad-01.braze.com",       { category: "marketing", name: "Braze" }],
  ["js.braintreegateway.com",    { category: "ecommerce", name: "Braintree" }],
  ["js.stripe.com",              { category: "ecommerce", name: "Stripe" }],
  ["m.stripe.com",               { category: "ecommerce", name: "Stripe" }],
  ["cdn.paddle.com",             { category: "ecommerce", name: "Paddle" }],
  ["js.chargebee.com",           { category: "ecommerce", name: "Chargebee" }],
  ["js.recurly.com",             { category: "ecommerce", name: "Recurly" }],
  ["cdn.livechatinc.com",        { category: "chatSupport", name: "LiveChat" }],
  ["client.crisp.chat",          { category: "chatSupport", name: "Crisp" }],
  ["embed.tawk.to",              { category: "chatSupport", name: "Tawk.to" }],
  ["static.olark.com",           { category: "chatSupport", name: "Olark" }],
  ["beacon.helpscout.net",       { category: "chatSupport", name: "Helpscout" }],
  ["code.tidio.co",              { category: "chatSupport", name: "Tidio" }],
  ["cloudfront.net",             { category: "hosting", name: "AWS CloudFront" }],
  ["vercel.app",                 { category: "hosting", name: "Vercel" }],
  ["netlify.app",                { category: "hosting", name: "Netlify" }],
  ["salesforceliveagent.com",    { category: "crm", name: "Salesforce" }],
  ["lightning.force.com",        { category: "crm", name: "Salesforce" }],
  ["zdassets.com",               { category: "crm", name: "Zendesk" }],
  ["freshchat.com",              { category: "crm", name: "Freshdesk" }],
  ["wchat.freshchat.com",        { category: "crm", name: "Freshdesk" }],
  ["cdn.contentful.com",         { category: "cms", name: "Contentful" }],
  ["cdn.sanity.io",              { category: "cms", name: "Sanity" }],
  ["cdn.prismic.io",             { category: "cms", name: "Prismic" }],
];

function applyDomainMap(
  text: string,
  profile: TechProfile,
) {
  for (const [domain, { category, name }] of DOMAIN_TO_TECH) {
    if (!text.includes(domain)) continue;
    if (category === "analytics" || category === "marketing" || category === "adtech") {
      if (!(profile[category] as string[]).includes(name)) (profile[category] as string[]).push(name);
    } else if (category !== "technologies") {
      if (!profile[category]) (profile[category] as string | null) = name;
    }
  }
}

export async function detectTechStack(domain: string): Promise<TechProfile> {
  const normalizedDomain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const url = `https://${normalizedDomain}`;

  const profile: TechProfile = {
    domain: normalizedDomain,
    technologies: [],
    cms: null,
    framework: null,
    analytics: [],
    crm: null,
    marketing: [],
    hosting: null,
    adtech: [],
    ecommerce: null,
    chatSupport: null,
    raw: {},
  };

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return profile;

    // ── Collect headers ────────────────────────────────────────────────────
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
    profile.raw = headers;

    const allHeadersText = Object.entries(headers).map(([k, v]) => `${k}: ${v}`).join("\n").toLowerCase();

    // ── Server / powered-by / generator headers ────────────────────────────
    const server = headers["server"] ?? "";
    const poweredBy = headers["x-powered-by"] ?? "";
    const via = headers["via"] ?? "";
    const generator = headers["x-generator"] ?? "";

    if (server.includes("nginx")) profile.technologies.push("Nginx");
    if (server.includes("apache")) profile.technologies.push("Apache");
    if (server.includes("cloudflare")) { profile.hosting = "Cloudflare"; profile.technologies.push("Cloudflare"); }
    if (poweredBy.includes("PHP")) profile.technologies.push("PHP");
    if (poweredBy.includes("Express")) profile.technologies.push("Node.js / Express");
    if (poweredBy.includes("Next.js")) { profile.framework = "Next.js"; profile.technologies.push("Next.js"); }
    if (poweredBy.includes("ASP.NET")) profile.technologies.push("ASP.NET");
    if (generator.includes("WordPress")) profile.cms = "WordPress";
    if (headers["x-vercel-id"]) profile.hosting = "Vercel";
    if (headers["x-nf-request-id"]) profile.hosting = "Netlify";
    if (headers["cf-ray"]) { profile.hosting = "Cloudflare"; }
    if (headers["x-amz-cf-id"]) profile.hosting = "AWS CloudFront";

    // ── Apply domain map to headers (CSP, cookie, etc.) ───────────────────
    applyDomainMap(allHeadersText, profile);

    const html = await res.text();

    // ── Extract preconnect / prefetch / script src domains ────────────────
    // These are the most reliable signal sources — modern SPAs load everything
    // via external scripts, and those URLs expose the exact services used.
    const externalRefs = [
      ...html.matchAll(/(?:href|src|data-src)=["']([^"']*(?:cdn|static|js|embed|widget|analytics|tracking)[^"']+)["']/gi),
      ...html.matchAll(/(?:preconnect|dns-prefetch)[^>]+href=["']([^"']+)["']/gi),
      ...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi),
    ].map((m) => m[1]).join("\n").toLowerCase();

    applyDomainMap(externalRefs, profile);

    // ── <meta name="generator"> ────────────────────────────────────────────
    const generatorMeta = html.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? "";
    if (generatorMeta.includes("wordpress")) profile.cms = "WordPress";
    if (generatorMeta.includes("drupal")) profile.cms = "Drupal";
    if (generatorMeta.includes("joomla")) profile.cms = "Joomla";
    if (generatorMeta.includes("ghost")) profile.cms = "Ghost";
    if (generatorMeta.includes("wix")) profile.cms = "Wix";
    if (generatorMeta.includes("squarespace")) profile.cms = "Squarespace";
    if (generatorMeta.includes("webflow")) profile.cms = "Webflow";
    if (generatorMeta.includes("gatsby")) profile.framework = "Gatsby";
    if (generatorMeta.includes("next.js")) profile.framework = "Next.js";
    if (generatorMeta.includes("nuxt")) profile.framework = "Nuxt.js";

    const htmlLower = html.toLowerCase();

    // ── Run full signature scan against HTML ───────────────────────────────
    for (const sig of SIGNATURES) {
      if (sig.patterns.some((p) => htmlLower.includes(p.toLowerCase()))) {
        const cat = sig.category;
        if (cat === "technologies") {
          if (!profile.technologies.includes(sig.name)) profile.technologies.push(sig.name);
        } else if (cat === "analytics" || cat === "marketing" || cat === "adtech") {
          if (!(profile[cat] as string[]).includes(sig.name)) (profile[cat] as string[]).push(sig.name);
        } else {
          if (!profile[cat]) (profile[cat] as string | null) = sig.name;
        }
      }
    }

    // ── Consolidate top-level technologies list ────────────────────────────
    const allTech = [
      profile.cms, profile.framework, profile.hosting, profile.crm,
      profile.ecommerce, profile.chatSupport,
      ...profile.analytics, ...profile.marketing, ...profile.adtech,
      ...profile.technologies,
    ].filter(Boolean) as string[];
    profile.technologies = [...new Set(allTech)];

  } catch {
    // Return empty profile on network error
  }

  return profile;
}
