import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import json
import os

class NavManagerApp:
    def __init__(self, root):
        self.root = root
        self.root.title("我的导航管理器")
        self.root.geometry("600x500")
        
        # 数据存储
        self.nav_items = []
        self.data_file = "nav_data.json"
        
        self.setup_ui()
        self.load_data()

    def setup_ui(self):
        # === 输入区域 ===
        input_frame = ttk.LabelFrame(self.root, text="添加新导航", padding=10)
        input_frame.pack(fill="x", padx=10, pady=5)

        ttk.Label(input_frame, text="名称:").grid(row=0, column=0, sticky="w", pady=5)
        self.name_var = tk.StringVar()
        ttk.Entry(input_frame, textvariable=self.name_var, width=40).grid(row=0, column=1, padx=5, pady=5)

        ttk.Label(input_frame, text="链接地址:").grid(row=1, column=0, sticky="w", pady=5)
        self.url_var = tk.StringVar()
        ttk.Entry(input_frame, textvariable=self.url_var, width=40).grid(row=1, column=1, padx=5, pady=5)

        ttk.Label(input_frame, text="图标 (路径或Emoji):").grid(row=2, column=0, sticky="w", pady=5)
        self.icon_var = tk.StringVar(value="🔗") # 默认使用 Emoji
        icon_entry = ttk.Entry(input_frame, textvariable=self.icon_var, width=30)
        icon_entry.grid(row=2, column=1, padx=5, pady=5)
        
        ttk.Button(input_frame, text="选择图片...", command=self.select_icon).grid(row=2, column=2, padx=5, pady=5)

        ttk.Button(input_frame, text="➕ 添加", command=self.add_item).grid(row=3, column=1, pady=10)

        # === 列表显示区域 ===
        list_frame = ttk.LabelFrame(self.root, text="当前导航列表", padding=10)
        list_frame.pack(fill="both", expand=True, padx=10, pady=5)

        # 使用 Treeview 显示数据
        columns = ("name", "url", "icon")
        self.tree = ttk.Treeview(list_frame, columns=columns, show="headings", height=10)
        
        self.tree.heading("name", text="名称")
        self.tree.heading("url", text="链接地址")
        self.tree.heading("icon", text="图标")
        
        self.tree.column("name", width=150)
        self.tree.column("url", width=300)
        self.tree.column("icon", width=100)
        
        self.tree.pack(side="left", fill="both", expand=True)
        
        scrollbar = ttk.Scrollbar(list_frame, orient="vertical", command=self.tree.yview)
        scrollbar.pack(side="right", fill="y")
        self.tree.configure(yscrollcommand=scrollbar.set)

        # === 底部操作按钮 ===
        btn_frame = ttk.Frame(self.root)
        btn_frame.pack(fill="x", padx=10, pady=10)

        ttk.Button(btn_frame, text="🗑️ 删除选中", command=self.delete_item).pack(side="left", padx=5)
        ttk.Button(btn_frame, text="💾 保存数据 (JSON)", command=self.save_data).pack(side="left", padx=5)
        ttk.Button(btn_frame, text="🌐 导出为 HTML (my_nav.html)", command=self.export_html, style="Accent.TButton").pack(side="right", padx=5)

    def select_icon(self):
        file_path = filedialog.askopenfilename(filetypes=[("Image Files", "*.png *.jpg *.jpeg *.ico *.svg")])
        if file_path:
            self.icon_var.set(file_path)

    def add_item(self):
        name = self.name_var.get().strip()
        url = self.url_var.get().strip()
        icon = self.icon_var.get().strip()

        if not name or not url:
            messagebox.showwarning("输入错误", "名称和链接地址不能为空！")
            return

        # 确保 URL 有协议头
        if not url.startswith("http://") and not url.startswith("https://"):
            url = "http://" + url

        item = {"name": name, "url": url, "icon": icon}
        self.nav_items.append(item)
        
        self.tree.insert("", "end", values=(name, url, icon))
        
        # 清空输入框
        self.name_var.set("")
        self.url_var.set("")
        self.icon_var.set("🔗")

    def delete_item(self):
        selected = self.tree.selection()
        if not selected:
            messagebox.showinfo("提示", "请先选中要删除的项")
            return
        
        for item in selected:
            self.tree.delete(item)
            
        # 同步更新内存中的数据
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
            messagebox.showinfo("成功", "数据已保存至 nav_data.json")
        except Exception as e:
            messagebox.showerror("错误", f"保存失败: {e}")

    def load_data(self):
        if os.path.exists(self.data_file):
            try:
                with open(self.data_file, "r", encoding="utf-8") as f:
                    self.nav_items = json.load(f)
                    for item in self.nav_items:
                        self.tree.insert("", "end", values=(item["name"], item["url"], item["icon"]))
            except Exception as e:
                messagebox.showerror("错误", f"加载数据失败: {e}")

    def export_html(self):
        if not self.nav_items:
            messagebox.showwarning("提示", "列表为空，无法导出 HTML")
            return

        html_content = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>我的导航</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f6f9;
            margin: 0;
            padding: 20px;
        }
        h1 {
            text-align: center;
            color: #333;
            margin-bottom: 30px;
        }
        .container {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 20px;
            max-width: 1200px;
            margin: 0 auto;
        }
        .nav-card {
            background: white;
            border-radius: 10px;
            padding: 20px;
            text-align: center;
            text-decoration: none;
            color: #333;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            transition: transform 0.2s, box-shadow 0.2s;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .nav-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 15px rgba(0,0,0,0.1);
        }
        .nav-icon {
            font-size: 32px;
            margin-bottom: 10px;
            max-width: 48px;
            max-height: 48px;
            object-fit: contain;
        }
        .nav-name {
            font-weight: bold;
            font-size: 16px;
            word-break: break-all;
        }
    </style>
</head>
<body>
    <h1>我的导航</h1>
    <div class="container">
"""
        for item in self.nav_items:
            icon_display = item['icon']
            # 判断是本地图片路径还是 Emoji/文本
            if icon_display.endswith(('.png', '.jpg', '.jpeg', '.ico', '.svg')):
                # 如果是相对路径或绝对路径，在HTML中尽量使用文件名或保持原样
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
                messagebox.showinfo("成功", f"HTML 已成功导出至:\n{file_path}")
            except Exception as e:
                messagebox.showerror("错误", f"导出失败: {e}")

if __name__ == "__main__":
    root = tk.Tk()
    app = NavManagerApp(root)
    root.mainloop()