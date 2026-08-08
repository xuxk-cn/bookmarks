# html_to_css_converter.py
"""
HTML 样式文件转 CSS 工具
从 styles*.html / style*.html 文件中提取 <style> 标签内的 CSS，
保存为同名 .css 文件到 cf-nav/public/css/ 目录。
"""

import tkinter as tk
from tkinter import ttk, messagebox, filedialog
from pathlib import Path
from bs4 import BeautifulSoup
import re
import os

# ── 默认路径配置 ──────────────────────────────────────────────
DEFAULT_SOURCE_DIR = Path("cf-nav/backgrounds")
DEFAULT_OUTPUT_DIR = Path("cf-nav/public/css")

# ── CSS 提取逻辑 ──────────────────────────────────────────────
def extract_css_from_html(html_path: Path) -> str:
    """从 HTML 文件中提取所有 <style> 标签的内容"""
    text = html_path.read_text(encoding="utf-8")
    soup = BeautifulSoup(text, "html.parser")
    parts = []
    for tag in soup.find_all("style"):
        content = tag.string or tag.get_text()
        if content and content.strip():
            parts.append(content.strip())
    return "\n\n".join(parts)


def convert_files(html_paths: list[Path], output_dir: Path) -> list[tuple[str, bool, str]]:
    """
    批量转换，返回结果列表：[(文件名, 成功?, 消息), ...]
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    results = []
    for html_path in html_paths:
        css_name = html_path.stem + ".css"
        out_path = output_dir / css_name
        try:
            css = extract_css_from_html(html_path)
            if not css:
                results.append((html_path.name, False, "未找到 <style> 内容"))
                continue
            header = f"/* 提取自{html_path.name} */\n"
            out_path.write_text(header + css, encoding="utf-8")
            results.append((html_path.name, True, f"→ {out_path}"))
        except Exception as e:
            results.append((html_path.name, False, str(e)))
    return results


# ── GUI ───────────────────────────────────────────────────────
class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("HTML → CSS 样式提取工具")
        self.geometry("760x560")
        self.resizable(True, True)
        self.configure(bg="#f0f2f5")

        self.source_dir = tk.StringVar(value=str(DEFAULT_SOURCE_DIR))
        self.output_dir = tk.StringVar(value=str(DEFAULT_OUTPUT_DIR))
        self.html_files: list[Path] = []

        self._build_ui()
        self._load_file_list()

    # ── UI 构建 ────────────────────────────────────────────────
    def _build_ui(self):
        pad = {"padx": 10, "pady": 5}

        # 顶部：路径设置
        frame_path = ttk.LabelFrame(self, text="路径设置", padding=8)
        frame_path.pack(fill="x", **pad)

        ttk.Label(frame_path, text="来源目录:").grid(row=0, column=0, sticky="w")
        ttk.Entry(frame_path, textvariable=self.source_dir, width=55).grid(row=0, column=1, padx=4)
        ttk.Button(frame_path, text="浏览", command=self._pick_source).grid(row=0, column=2)
        ttk.Button(frame_path, text="刷新列表", command=self._load_file_list).grid(row=0, column=3, padx=4)

        ttk.Label(frame_path, text="输出目录:").grid(row=1, column=0, sticky="w", pady=(4, 0))
        ttk.Entry(frame_path, textvariable=self.output_dir, width=55).grid(row=1, column=1, padx=4, pady=(4, 0))
        ttk.Button(frame_path, text="浏览", command=self._pick_output).grid(row=1, column=2, pady=(4, 0))

        # 中部：文件列表
        frame_list = ttk.LabelFrame(self, text="HTML 文件列表（可多选）", padding=8)
        frame_list.pack(fill="both", expand=True, **pad)

        # 工具栏：全选 / 反选
        bar = ttk.Frame(frame_list)
        bar.pack(fill="x", pady=(0, 4))
        ttk.Button(bar, text="全选", command=self._select_all).pack(side="left", padx=2)
        ttk.Button(bar, text="全不选", command=self._select_none).pack(side="left", padx=2)
        ttk.Button(bar, text="反选", command=self._select_invert).pack(side="left", padx=2)
        self.lbl_count = ttk.Label(bar, text="")
        self.lbl_count.pack(side="right", padx=6)

        # 列表框 + 滚动条
        list_frame = ttk.Frame(frame_list)
        list_frame.pack(fill="both", expand=True)

        scrollbar = ttk.Scrollbar(list_frame, orient="vertical")
        self.listbox = tk.Listbox(
            list_frame,
            selectmode=tk.MULTIPLE,
            yscrollcommand=scrollbar.set,
            font=("Consolas", 10),
            activestyle="none",
            bg="white",
            selectbackground="#4a90d9",
            selectforeground="white",
            height=14,
        )
        scrollbar.config(command=self.listbox.yview)
        self.listbox.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        self.listbox.bind("<<ListboxSelect>>", self._on_select)

        # 底部：转换按钮 + 状态
        frame_bottom = ttk.Frame(self)
        frame_bottom.pack(fill="x", **pad)

        self.btn_convert = ttk.Button(
            frame_bottom, text="▶  转换选中文件", command=self._convert, style="Accent.TButton"
        )
        self.btn_convert.pack(side="left", ipadx=16, ipady=4)

        self.status_var = tk.StringVar(value="就绪")
        ttk.Label(frame_bottom, textvariable=self.status_var, foreground="#555").pack(side="left", padx=12)

        # 日志区
        frame_log = ttk.LabelFrame(self, text="转换日志", padding=6)
        frame_log.pack(fill="x", padx=10, pady=(0, 10))

        self.log_text = tk.Text(frame_log, height=6, font=("Consolas", 9), bg="#1e1e1e", fg="#d4d4d4",
                                insertbackground="white", state="disabled")
        self.log_text.pack(fill="x")

        # 颜色标签
        self.log_text.tag_config("ok",  foreground="#6ee06e")
        self.log_text.tag_config("err", foreground="#f47f7f")
        self.log_text.tag_config("info", foreground="#8bbcf5")

    # ── 文件列表 ───────────────────────────────────────────────
    def _load_file_list(self):
        src = Path(self.source_dir.get())
        if not src.is_dir():
            messagebox.showwarning("路径不存在", f"来源目录不存在：\n{src}")
            return

        # 匹配 style*.html 和 styles*.html
        files = sorted(
            [f for f in src.glob("style*.html")],
            key=lambda p: (re.sub(r'\d+', '', p.stem).lower(),
                           int(re.search(r'\d+', p.stem).group()) if re.search(r'\d+', p.stem) else 0)
        )
        self.html_files = files
        self.listbox.delete(0, tk.END)
        for f in files:
            self.listbox.insert(tk.END, f.name)
        self._update_count()
        self._log(f"加载了 {len(files)} 个文件，来源：{src}", "info")

    def _on_select(self, _event=None):
        self._update_count()

    def _update_count(self):
        total = self.listbox.size()
        sel = len(self.listbox.curselection())
        self.lbl_count.config(text=f"已选 {sel} / 共 {total} 个")

    def _select_all(self):
        self.listbox.select_set(0, tk.END)
        self._update_count()

    def _select_none(self):
        self.listbox.select_clear(0, tk.END)
        self._update_count()

    def _select_invert(self):
        sel = set(self.listbox.curselection())
        self.listbox.select_clear(0, tk.END)
        for i in range(self.listbox.size()):
            if i not in sel:
                self.listbox.select_set(i)
        self._update_count()

    # ── 路径选择 ───────────────────────────────────────────────
    def _pick_source(self):
        d = filedialog.askdirectory(initialdir=self.source_dir.get(), title="选择 HTML 来源目录")
        if d:
            self.source_dir.set(d)
            self._load_file_list()

    def _pick_output(self):
        d = filedialog.askdirectory(initialdir=self.output_dir.get(), title="选择 CSS 输出目录")
        if d:
            self.output_dir.set(d)

    # ── 转换 ───────────────────────────────────────────────────
    def _convert(self):
        indices = self.listbox.curselection()
        if not indices:
            messagebox.showinfo("提示", "请先选择要转换的文件")
            return

        selected = [self.html_files[i] for i in indices]
        out_dir = Path(self.output_dir.get())

        self.status_var.set(f"正在转换 {len(selected)} 个文件...")
        self.update_idletasks()

        results = convert_files(selected, out_dir)

        ok_count = sum(1 for _, ok, _ in results if ok)
        err_count = len(results) - ok_count

        for name, ok, msg in results:
            tag = "ok" if ok else "err"
            prefix = "✔" if ok else "✘"
            self._log(f"{prefix} {name}  {msg}", tag)

        self.status_var.set(f"完成：{ok_count} 成功，{err_count} 失败")
        if err_count == 0:
            messagebox.showinfo("完成", f"全部 {ok_count} 个文件转换成功！\n输出到：{out_dir}")
        else:
            messagebox.showwarning("部分失败", f"成功 {ok_count}，失败 {err_count}\n请查看日志")

    # ── 日志 ───────────────────────────────────────────────────
    def _log(self, msg: str, tag: str = "info"):
        self.log_text.config(state="normal")
        self.log_text.insert(tk.END, msg + "\n", tag)
        self.log_text.see(tk.END)
        self.log_text.config(state="disabled")


if __name__ == "__main__":
    # BeautifulSoup 检查
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        import subprocess, sys
        subprocess.check_call([sys.executable, "-m", "pip", "install", "beautifulsoup4"])
        from bs4 import BeautifulSoup

    app = App()
    app.mainloop()
