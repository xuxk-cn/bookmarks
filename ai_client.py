import json
import re
from urllib.request import Request, urlopen

def clean_html_to_text(html_content: str, max_len: int = 4000) -> str:
    """过滤掉无用的样式和脚本，只留下核心文本，防止爆大模型上下文"""
    if not html_content:
        return ""
    # 过滤 script 和 style
    text = re.sub(r'<(script|style)\b[^>]*>.*?</\1>', '', html_content, flags=re.IGNORECASE | re.DOTALL)
    # 过滤普通 HTML 标签
    text = re.sub(r'<.*?>', ' ', text, flags=re.DOTALL)
    # 压缩空白字符
    text = re.sub(r'\s+', ' ', text).strip()
    return text[:max_len]

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
        {"role": "system", "content": "你是一个专业的网页摘要助手。你的任务是根据提供的网页内容或信息，直接输出一句 15-30 字的中文摘要。禁止包含任何思考过程、分析步骤、引言、换行或解释。直接给出最终结果。"},
        {"role": "user", "content": "网站标题：百度，网址：https://www.baidu.com/\n网页内容：百度一下，你就知道。全球最大的中文搜索引擎。"},
        {"role": "assistant", "content": "全球领先的中文搜索引擎，提供精准的信息检索、新闻资讯及各类生活服务。"},
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
