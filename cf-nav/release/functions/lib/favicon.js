// Favicon 抓取工具
// 优先级：网站自定义 API > Google Favicon > 直接抓取

/**
 * 抓取网站 favicon，返回 data URI 字符串
 * @param {string} url - 目标网站 URL
 * @param {string} apiPrefix - favicon API 前缀，默认 faviconsnap
 * @returns {Promise<string>} data URI 或空字符串
 */
export async function fetchFavicon(url, apiPrefix = 'https://faviconsnap.com/api/favicon?url=') {
  const parsed = new URL(url);
  const origin = parsed.origin;

  // 方案1：使用配置的 favicon API（返回图片）
  try {
    const apiUrl = apiPrefix + encodeURIComponent(origin);
    const res = await fetch(apiUrl, { cf: { cacheTtl: 86400 } });
    if (res.ok) {
      const ct = res.headers.get('content-type') || 'image/png';
      if (ct.startsWith('image/')) {
        const buf = await res.arrayBuffer();
        if (buf.byteLength > 100) {
          return toDataUri(buf, ct.split(';')[0]);
        }
      }
    }
  } catch {}

  // 方案2：Google favicon
  try {
    const googleUrl = `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=64`;
    const res = await fetch(googleUrl, { cf: { cacheTtl: 86400 } });
    if (res.ok) {
      const ct = res.headers.get('content-type') || 'image/png';
      if (ct.startsWith('image/')) {
        const buf = await res.arrayBuffer();
        if (buf.byteLength > 100) {
          return toDataUri(buf, ct.split(';')[0]);
        }
      }
    }
  } catch {}

  return '';
}

/**
 * 批量抓取 favicon，返回 {url: dataUri} 映射
 */
export async function fetchFavicons(urls, apiPrefix, concurrency = 5) {
  const results = {};
  const chunks = [];
  for (let i = 0; i < urls.length; i += concurrency) {
    chunks.push(urls.slice(i, i + concurrency));
  }
  for (const chunk of chunks) {
    await Promise.all(chunk.map(async url => {
      results[url] = await fetchFavicon(url, apiPrefix);
    }));
  }
  return results;
}

function toDataUri(buf, mimeType) {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const b64 = btoa(binary);
  return `data:${mimeType};base64,${b64}`;
}
