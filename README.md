Spine viewer，spine 4.0-4.3动画查看器。只能打开单个spine动画，待grok完善。
安装node.js，推荐 22.x lts

在 命令提示符（CMD） 里操作（不要再双击 node.exe）
在文件资源管理器里，点击顶部的地址栏（显示 .\Boneview_grok 的地方）。
输入 cmd 然后按回车。
这样会弹出一个cmd窗口，并且路径已经自动指向这个文件夹。

在黑色窗口里依次输入：
npm install
等待它下载完所有依赖（会看到进度条，大概1~2分钟）。

接着输入：
npm run dev
不行的话
试试 npx vite dev --host 0.0.0.0 --port 8080

如果上面的命令成功了
你会看到类似这样的输出：

  VITE v8.x.x  ready in xxx ms

  ➜  Local:   http://localhost:8080/
  ➜  Network: http://192.168.xxx.xxx:8080/
  
然后你就可以保持窗口开着，在安卓手机浏览器里输入 Network 地址访问了。
