import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import json
import os
import re
import html

class ModernNavManager:
    def __init__(self, root):
        self.root = root
        self.root.title("✨ 现代导航管理器")
        self.root.geometry("850x650")
        self.root.minsize(800, 600)
        
        # 数据存储
        self.nav_items = []
        self.data_file = "nav_data.json"
        
        self.setup_modern_style()
        self.setup_ui()
        self.load_data()

    def setup_modern_style(self):
        """配置现代化的 ttk 样式 (修复了 LabelFrame 的 Layout 错误)"""
        style = ttk.Style()
        available_themes = style.theme_names()
        if 'clam' in available_themes:
            style.theme_use('clam')
        elif 'vista' in available_themes:
            style.theme_use('vista')

        bg_color = "#F5F7FA"
        primary_color = "#4361EE" # 现代蓝
        text_color = "#2D3748"
        
        # 全局默认样式
        style.configure(".", background=bg_color, foreground=text_color, font=("Microsoft YaHei UI", 10))
        
        # 1. 卡片式 Frame 样式 (用白色背景模拟卡片，替代容易报错的 LabelFrame)
        style.configure("Card.TFrame", background="#FFFFFF", relief="flat")
        
        # 2. 文本标签样式
        style.configure("Title.TLabel", background="#FFFFFF", foreground=primary_color, font=("Microsoft YaHei UI", 12, "bold"))
        style.configure("Normal.TLabel", background="#FFFFFF", foreground=text_color, font=("Microsoft YaHei UI", 10))
        style.configure("Hint.TLabel", background="#FFFFFF", foreground="#718096", font=("Microsoft YaHei UI", 9))

        # 3. 按钮样式 (扁平化现代设计)
        style.configure("Primary.TButton", 
                        background=primary_color, foreground="white", borderwidth=0, 
                        focusthickness=0, focuscolor="none", font=("Microsoft YaHei UI", 10, "bold"), padding=(15, 8))
        style.map("Primary.TButton", background=[("active", "#3451D1"), ("pressed", "#2A41B0")])
        
        style.configure("Secondary.TButton", 
                        background="#E2E8F0", foreground=text_color, borderwidth=0, 
                        font=("Microsoft YaHei UI", 10), padding=(15, 8))
        style.map("Secondary.TButton", background=[("active", "#CBD5E1")])

        style.configure("Danger.TButton", 
                        background="#FED7D7", foreground="#C53030", borderwidth=0, 
                        font=("Microsoft YaHei UI", 10), padding=(15, 8))
        style.map("Danger.TButton", background=[("active", "#FEB2B2")])

        # 4. 输入框样式
        style.configure("Modern.TEntry", 
                        fieldbackground="#FFFFFF", borderwidth=1, relief="solid",
                        bordercolor="#CBD5E1", font=("Microsoft YaHei UI", 10), padding=8)
        style.map("Modern.TEntry", bordercolor=[("focus", primary_color)])

        # 5. Treeview (列表) 样式
        style.configure("Modern.Treeview", 
                        background="#FFFFFF", foreground=text_color, fieldbackground="#FFFFFF",
                        borderwidth=0, font=("Microsoft YaHei UI", 10), rowheight=32)
        style.configure("Modern.Treeview.Heading", 
                        background="#EDF2F7", foreground="#4A5568", borderwidth=0,
                        font=("Microsoft YaHei UI", 10, "bold"), padding=10)
        style.map("Modern.Treeview", background=[("selected", primary_color)], foreground=[("selected", "white")])

    def setup_ui(self):
        # 主背景 Frame
        main_frame = ttk.Frame(self.root)
        main_frame.pack(fill="both", expand=True, padx=20, pady=20)

        # === 1. 输入区域 (使用 Frame + Label 模拟卡片，绝对稳定) ===
        input_card = ttk.Frame(main_frame, style="Card.TFrame")
        input_card.pack(fill="x", pady=(0, 15))
        
        # 卡片标题
        ttk.Label(input_card, text="➕ 添加新导航", style="Title.TLabel").pack(anchor="w", padx=20, pady=(15, 10))
        
        # 内部表单容器
        form_frame = ttk.Frame(input_card, style="Card.TFrame")
        form_frame.pack(fill="x", padx=20, pady=(0, 20))
        form_frame.columnconfigure(1, weight=1)

        ttk.Label(form_frame, text="网站名称:", style="Normal.TLabel").grid(row=0, column=0, sticky="w", pady=8, padx=(0, 15))
        self.name_var = tk.StringVar()
        ttk.Entry(form_frame, textvariable=self.name_var, style="Modern.TEntry").grid(row=0, column=1, sticky="ew", pady=8)

        ttk.Label(form_frame, text="链接地址:", style="Normal.TLabel").grid(row=1, column=0, sticky="w", pady=8, padx=(0, 15))
        self.url_var = tk.StringVar()
        ttk.Entry(form_frame, textvariable=self.url_var, style="Modern.TEntry").grid(row=1, column=1, sticky="ew", pady=8)

        ttk.Label(form_frame, text="图标设置:", style="Normal.TLabel").grid(row=2, column=0, sticky="w", pady=8, padx=(0, 15))
        
        icon_inner_frame = ttk.Frame(form_frame, style="Card.TFrame")
        icon_inner_frame.grid(row=2, column=1, sticky="ew", pady=8)
        icon_inner_frame.columnconfigure(0, weight=1)
        
        self.icon_var = tk.StringVar(value="🔗")
        ttk.Entry(icon_inner_frame, textvariable=self.icon_var, style="Modern.TEntry").grid(row=0, column=0, sticky="ew", padx=(0, 10))
        ttk.Button(icon_inner_frame, text="📁 选择图片", style="Secondary.TButton", command=self.select_icon).grid(row=0, column=1)

        ttk.Button(form_frame, text="确 认 添 加", style="Primary.TButton", command=self.add_item).grid(row=3, column=1, sticky="e", pady=(15, 0))

        # === 2. 列表显示区域 (卡片式) ===
        list_card = ttk.Frame(main_frame, style="Card.TFrame")
        list_card.pack(fill="both", expand=True, pady=(0, 15)) # expand=True 确保它占据剩余空间
        
        ttk.Label(list_card, text="📋 导航列表", style="Title.TLabel").pack(anchor="w", padx=20, pady=(15, 10))
        
        tree_container = ttk.Frame(list_card, style="Card.TFrame")
        tree_container.pack(fill="both", expand=True, padx=20, pady=(0, 20))

        columns = ("name", "url", "icon")
        self.tree = ttk.Treeview(tree_container, columns=columns, show="headings", style="Modern.Treeview")
        
        self.tree.heading("name", text="名称")
        self.tree.heading("url", text="链接地址")
        self.tree.heading("icon", text="图标")
        
        self.tree.column("name", width=150, anchor="w")
        self.tree.column("url", width=400, anchor="w")
        self.tree.column("icon", width=100, anchor="center")
        
        self.tree.pack(side="left", fill="both", expand=True)
        
        scrollbar = ttk.Scrollbar(tree_container, orient="vertical", command=self.tree.yview)
        scrollbar.pack(side="right", fill="y")
        self.tree.configure(yscrollcommand=scrollbar.set)

        # === 3. 底部操作按钮 ===
        btn_frame = ttk.Frame(main_frame, style="Card.TFrame")
        btn_frame.pack(fill="x", side="bottom", pady=(0, 5))

        ttk.Button(btn_frame, text="🗑️ 删除选中", style="Danger.TButton", command=self.delete_item).pack(side="left", padx=5)
        ttk.Button(btn_frame, text="💾 保存为 JSON", style="Secondary.TButton", command=self.save_data).pack(side="left", padx=5)
        ttk.Button(btn_frame, text="📂 打开 HTML 编辑", style="Secondary.TButton", command=self.open_html).pack(side="left", padx=5)
        
        ttk.Button(btn_frame, text="🌐 导出为 HTML", style="Primary.TButton", command=self.export_html).pack(side="right", padx=5)

    def select_icon(self):
        file_path = filedialog.askopenfilename(
            title="选择图标文件",
            filetypes=[("Image Files", "*.png *.jpg *.jpeg *.ico *.svg *.webp")]
        )
        if file_path:
            self.icon_var.set(file_path)

    def add_item(self):
        name = self.name_var.get().strip()
        url = self.url_var.get().strip()
        icon = self.icon_var.get().strip()

        if not name or not url:
            messagebox.showwarning("输入不完整", "网站名称和链接地址不能为空！", parent=self.root)
            return

        if not url.startswith("http://") and not url.startswith("https://"):
            url = "https://" + url

        item = {"name": name, "url": url, "icon": icon}
        self.nav_items.append(item)
        self.tree.insert("", "end", values=(name, url, icon))
        
        self.name_var.set("")
        self.url_var.set("")
        self.icon_var.set("🔗")

    def delete_item(self):
        selected = self.tree.selection()
        if not selected:
            messagebox.showinfo("提示", "请先在列表中选中要删除的项。", parent=self.root)
            return
        
        if messagebox.askyesno("确认删除", f"确定要删除选中的 {len(selected)} 个导航项吗？", parent=self.root):
            for item in selected:
                self.tree.delete(item)
            
            self.nav_items = []
            for child in self.tree.get_children():
                self.nav_items.append({
                    "name": self.tree.item(child)["values"][0],
                    "url": self.tree.item(child)["values"][1],
                    "icon": self.tree.item(child)["values"][2]
                })

    def save_data(self):
        try:
            with open(self.data_file, "w", encoding="utf-8") as f:
                json.dump(self.nav_items, f, ensure_ascii=False, indent=4)
            messagebox.showinfo("保存成功", "数据已安全保存至 nav_data.json", parent=self.root)
        except Exception as e:
            messagebox.showerror("保存失败", f"发生错误: {e}", parent=self.root)

    def load_data(self):
        if os.path.exists(self.data_file):
            try:
                with open(self.data_file, "r", encoding="utf-8") as f:
                    self.nav_items = json.load(f)
                    for item in self.nav_items:
                        self.tree.insert("", "end", values=(item["name"], item["url"], item["icon"]))
            except Exception as e:
                messagebox.showerror("加载失败", f"读取 JSON 数据时出错: {e}", parent=self.root)

    def open_html(self):
        file_path = filedialog.askopenfilename(
            title="选择要编辑的 HTML 导航文件",
            filetypes=[("HTML Files", "*.html"), ("All Files", "*.*")]
        )
        if not file_path:
            return

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                html_content = f.read()
            
            parsed_items = self.parse_html_content(html_content)
            
            if not parsed_items:
                messagebox.showwarning(
                    "未找到有效链接", 
                    "文件中未找到任何有效的 <a> 链接标签。\n\n可能原因：\n1. 文件内容为空或仅为纯文本。\n2. 链接格式严重损坏。\n\n你可以选择手动在此工具中重新添加。", 
                    parent=self.root
                )
                return

            if self.nav_items:
                if not messagebox.askyesno("确认覆盖", f"成功从 HTML 中解析到 {len(parsed_items)} 个导航项。\n\n是否清空当前列表并导入新数据？", parent=self.root):
                    return

            for child in self.tree.get_children():
                self.tree.delete(child)
            self.nav_items = []
            
            for item in parsed_items:
                self.nav_items.append(item)
                self.tree.insert("", "end", values=(item["name"], item["url"], item["icon"]))
                
            messagebox.showinfo("导入成功", f"已成功导入 {len(parsed_items)} 个导航项，现在可以进行编辑！", parent=self.root)

        except Exception as e:
            messagebox.showerror("读取失败", f"读取或解析 HTML 时发生错误:\n{e}", parent=self.root)

    def parse_html_content(self, html_content):
        """智能解析 HTML 内容，支持严格模式和宽松模式"""
        items = []
        
        # 模式 1: 严格匹配 (本工具导出的标准格式)
        a_pattern_strict = re.compile(r'<a\s+(?:[^>]*?\s+)?href="([^"]+)"[^>]*?class="nav-card"[^>]*>(.*?)</a>', re.IGNORECASE | re.DOTALL)
        matches = a_pattern_strict.findall(html_content)
        
        # 模式 2: 宽松匹配 (如果严格模式失败，尝试匹配任何 <a> 标签)
        if not matches:
            a_pattern_loose = re.compile(r'<a\s+[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', re.IGNORECASE | re.DOTALL)
            matches = a_pattern_loose.findall(html_content)

        for url, inner_html in matches:
            url = url.strip()
            name = "未命名链接"
            icon = "🔗"
            
            name_match = re.search(r'<div\s+class="nav-name"[^>]*>(.*?)</div>', inner_html, re.IGNORECASE | re.DOTALL)
            if name_match:
                name = html.unescape(name_match.group(1).strip())
            else:
                clean_text = re.sub(r'<[^>]+>', '', inner_html).strip()
                if clean_text:
                    name = html.unescape(clean_text)

            img_match = re.search(r'<img\s+[^>]*?src=["\']([^"\']+)["\'][^>]*?class="nav-icon"[^>]*>', inner_html, re.IGNORECASE | re.DOTALL)
            if img_match:
                icon = img_match.group(1).strip()
            else:
                text_match = re.search(r'<div\s+class="nav-icon"[^>]*>(.*?)</div>', inner_html, re.IGNORECASE | re.DOTALL)
                if text_match:
                    icon = html.unescape(text_match.group(1).strip())
            
            if url and not url.startswith('#') and not url.startswith('javascript:'):
                items.append({"name": name, "url": url, "icon": icon})
        
        return items

    def export_html(self):
        if not self.nav_items:
            messagebox.showwarning("列表为空", "当前没有可导出的导航项，请先添加。", parent=self.root)
            return

        html_content = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>我的现代导航</title>
    <style>
        :root { --primary: #4361EE; --bg: #F5F7FA; --card-bg: #FFFFFF; --text: #2D3748; }
        body { font-family: 'Segoe UI', 'Microsoft YaHei UI', sans-serif; background-color: var(--bg); margin: 0; padding: 40px 20px; color: var(--text); }
        h1 { text-align: center; color: var(--primary); margin-bottom: 40px; font-weight: 700; letter-spacing: 1px; }
        .container { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 24px; max-width: 1200px; margin: 0 auto; }
        .nav-card { background: var(--card-bg); border-radius: 16px; padding: 24px 20px; text-align: center; text-decoration: none; color: var(--text); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: flex; flex-direction: column; align-items: center; border: 1px solid rgba(0,0,0,0.03); }
        .nav-card:hover { transform: translateY(-6px); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); border-color: var(--primary); }
        .nav-icon { font-size: 36px; margin-bottom: 16px; max-width: 48px; max-height: 48px; object-fit: contain; }
        .nav-name { font-weight: 600; font-size: 16px; word-break: break-all; line-height: 1.4; }
    </style>
</head>
<body>
    <h1>🚀 我的导航</h1>
    <div class="container">
"""
        for item in self.nav_items:
            icon_display = item['icon']
            if icon_display.lower().endswith(('.png', '.jpg', '.jpeg', '.ico', '.svg', '.webp')):
                icon_html = f'<img src="{icon_display}" class="nav-icon" alt="icon">'
            else:
                icon_html = f'<div class="nav-icon">{icon_display}</div>'
                
            html_content += f"""        <a href="{item['url']}" target="_blank" class="nav-card">
            {icon_html}
            <div class="nav-name">{item['name']}</div>
        </a>
"""
        html_content += """    </div>
</body>
</html>"""

        file_path = filedialog.asksaveasfilename(
            defaultextension=".html",
            initialfile="my_nav.html",
            filetypes=[("HTML Files", "*.html")]
        )
        
        if file_path:
            try:
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(html_content)
                messagebox.showinfo("导出成功", f"HTML 已成功生成！\n\n保存路径:\n{file_path}", parent=self.root)
            except Exception as e:
                messagebox.showerror("导出失败", f"写入文件时发生错误:\n{e}", parent=self.root)

if __name__ == "__main__":
    try:
        from ctypes import windll
        windll.shcore.SetProcessDpiAwareness(1)
    except Exception:
        pass

    root = tk.Tk()
    app = ModernNavManager(root)
    root.mainloop()