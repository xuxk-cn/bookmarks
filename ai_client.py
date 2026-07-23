import json
import re
from urllib.request import Request, urlopen

def extract_site_info(html_content: str, url: str = "", title: str = "") -> str:
    """从 HTML 中提取最有价值的内容片段，优先级：meta description > og:description > title + h1/h2 > 正文"""
    if not html_content:
        return ""

    parts = []

    # 1. meta description / og:description — 网站自己写的，最权威
    for pattern in (
        r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']{10,})["\']',
        r'<meta[^>]+content=["\']([^"\']{10,})["\'][^>]+name=["\']description["\']',
        r'<meta[^>]+property=["\']og:description["\'][^>]+content=["\']([^"\']{10,})["\']',
        r'<meta[^>]+content=["\']([^"\']{10,})["\'][^>]+property=["\']og:description["\']',
    ):
        m = re.search(pattern, html_content, flags=re.IGNORECASE | re.DOTALL)
        if m:
            desc = m.group(1).strip()
            if desc:
                parts.append(f"网站描述：{desc}")
                break

    # 2. og:title 或 <title>
    og_title = re.search(r'<meta[^>]+property=["\']og:title["\'][^>]+content=["\']([^"\']+)["\']', html_content, flags=re.IGNORECASE)
    page_title = og_title.group(1).strip() if og_title else ""
    if not page_title:
        t = re.search(r'<title[^>]*>(.*?)</title>', html_content, flags=re.IGNORECASE | re.DOTALL)
        page_title = re.sub(r'\s+', ' ', t.group(1)).strip() if t else ""
    if page_title:
        parts.append(f"页面标题：{page_title}")

    # 3. h1 / h2 标题
    headings = re.findall(r'<h[12][^>]*>(.*?)</h[12]>', html_content, flags=re.IGNORECASE | re.DOTALL)
    clean_headings = []
    for h in headings[:4]:
        h = re.sub(r'<.*?>', '', h)
        h = re.sub(r'\s+', ' ', h).strip()
        if h and len(h) < 80:
            clean_headings.append(h)
    if clean_headings:
        parts.append("主要标题：" + " / ".join(clean_headings))

    # 4. 如果以上都没拿到有效内容，退化为正文前 300 字
    if len(parts) <= 1:
        body = re.sub(r'<(script|style|nav|footer|header)\b[^>]*>.*?</\1>', '', html_content, flags=re.IGNORECASE | re.DOTALL)
        body = re.sub(r'<.*?>', ' ', body, flags=re.DOTALL)
        body = re.sub(r'\s+', ' ', body).strip()
        if body:
            parts.append(f"页面内容：{body[:300]}")

    return "\n".join(parts)


def clean_html_to_text(html_content: str, max_len: int = 4000) -> str:
    """兼容旧调用，内部走 extract_site_info"""
    return extract_site_info(html_content)

def request_gemma_summary(content: str, config: dict, is_full_prompt: bool = False) -> str:
    """请求本地运行的 Gemma 服务器。content 可以是 HTML 源码，也可以是已经构造好的完整提示词。"""
    if is_full_prompt:
        full_prompt = content
    else:
        cleaned_text = clean_html_to_text(content, config["max_text_length"])
        if not cleaned_text:
            return ""
        full_prompt = config["prompt_template"].format(text=cleaned_text)

    # 构造消息列表，增加 one-shot 示例以强制模型遵循格式
    messages = [
        {"role": "system", "content": "你是一个网站介绍助手。我会给你提供网站的标题、meta描述、页面标题等关键信息，你只需根据这些真实内容，输出一句15-30字的中文介绍，直接描述该网站的核心用途。禁止编造、禁止废话、禁止任何前缀，直接给结果。"},
        {"role": "user", "content": "网站描述：Search the world's information, including webpages, images, videos and more.\n页面标题：Google"},
        {"role": "assistant", "content": "全球最大搜索引擎，可搜索网页、图片、视频等各类信息。"},
        {"role": "user", "content": full_prompt}
    ]

    payload = {
        "model": "gemma-4",
        "messages": messages,
        "temperature": 0.1,
        "max_tokens": 300
    }

    try:
        req_data = json.dumps(payload).encode("utf-8")
        req = Request(
            config["api_url"],
            data=req_data,
            headers={"Content-Type": "application/json", "Connection": "close"},
            method="POST"
        )
        
        api_timeout = max(120, config["timeout_seconds"] * 10)
        
        for attempt in range(2):
            try:
                with urlopen(req, timeout=api_timeout) as resp:
                    if getattr(resp, "status", 200) >= 400:
                        continue
                    res_json = json.loads(resp.read().decode("utf-8", errors="ignore"))
                    message = res_json["choices"][0]["message"]
                    
                    summary = message.get("content", "").strip()
                    if not summary and "reasoning_content" in message:
                        summary = message["reasoning_content"].strip()
                    
                    if not summary:
                        continue

                    # 强力清洗逻辑
                    # 1. 移除常见的思考块
                    summary = re.sub(r"<thought>.*?</thought>", "", summary, flags=re.DOTALL)
                    summary = re.sub(r"Thinking Process:.*?\n\n", "", summary, flags=re.IGNORECASE | re.DOTALL)
                    summary = re.sub(r"Analyze the (input|text|request).*?\n", "", summary, flags=re.IGNORECASE)
                    summary = re.sub(r"Draft \d+.*?\n", "", summary, flags=re.IGNORECASE)
                    
                    # 2. 如果包含多个段落，取第一段或最后一段
                    if "\n\n" in summary:
                        parts = [p.strip() for p in summary.split("\n\n") if p.strip()]
                        for p in reversed(parts):
                            if 10 < len(p) < 60 and "analyze" not in p.lower():
                                summary = p
                                break
                    
                    # 3. 移除前缀废话
                    summary = re.sub(r"^(总结|摘要|描述|结果|我的回答|描述如下|最终结果|摘要内容|一句话说明)[:：]\s*", "", summary)
                    
                    # 4. 只取第一行
                    summary = summary.split("\n")[0].strip()
                    
                    # 5. 长度过滤：如果结果包含大量英文（可能是分析过程），则判定失败
                    if len(re.findall(r"[a-zA-Z]{5,}", summary)) > 3:
                        continue

                    return summary.strip('"').strip("'").strip()
            except Exception:
                if attempt == 1:
                    return ""
                continue
    except Exception:
        return ""
    return ""
