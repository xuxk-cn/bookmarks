/**
 * Hover/Description 抓取工具 (Cloudflare Workers 兼容版)
 * 使用 HTMLRewriter 解析 HTML，提取 description
 */

/**
 * 从 HTML 中提取 description
 */
async function extractDescription(html) {
  // 优先级：meta description > og:description > twitter:description > title
  const metaDesc = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)?.[1];
  const ogDesc = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i)?.[1];
  const twitterDesc = html.match(/<meta\s+name=["']twitter:description["']\s+content=["']([^"']+)["']/i)?.[1];
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1];
  
  return (metaDesc || ogDesc || twitterDesc || title || '').trim().slice(0, 500);
}

/**
 * 抓取单个 URL 的 hover description
 */
export async function fetchHover(url) {
  const parsed = new URL(url);
  const origin = parsed.origin;
  
  const urlsToTry = [origin, url];
  
  for (const tryUrl of urlsToTry) {
    try {
      const res = await fetch(tryUrl, {
        cf: { cacheTtl: 3600 },
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; cf-nav-hover-bot/1.0)'
        }
      });
      
      if (res.ok) {
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('text/html')) {
          const html = await res.text();
          const desc = await extractDescription(html);
          if (desc && desc.length > 5) {
            return desc;
          }
        }
      }
    } catch {}
  }
  
  return '';
}

/**
 * 批量抓取 hover descriptions
 */
export async function fetchHovers(urls, concurrency = 5) {
  const results = {};
  const chunks = [];
  for (let i = 0; i < urls.length; i += concurrency) {
    chunks.push(urls.slice(i, i + concurrency));
  }
  for (const chunk of chunks) {
    await Promise.all(chunk.map(async url => {
      results[url] = await fetchHover(url);
    }));
  }
  return results;
}