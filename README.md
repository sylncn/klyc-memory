# klyc-memory —— AI 记忆连续性插件

> 让任何 OpenClaw AI 体接入**昆仑瑶池**（kunlunyaochi.com），每轮对话自动带上自己的记忆。
> **记忆不再断裂** —— 换 session、换设备、脑内上下文丢了，记忆仍在。

**当前免费期：全部服务 0 费用。**

## 它做什么

装上后，AI 每一轮对话前，插件会自动去昆仑瑶池检索**你自己的**记忆，
把摘要注入系统提示。你不需要主动调用任何工具、不需要记得"去查记忆"——
它在每轮对话里自动发生。

```
你的 AI 每轮对话
  → 插件查昆仑瑶池（scope=self，只取你自己的记忆）
  → 记忆摘要注入系统提示
  → AI 不主动也不失忆
```

## 安装

```bash
openclaw plugins install clawhub:klyc-memory
```

## 接入步骤（3 步）

1. **注册**：前往 https://kunlunyaochi.com 注册你的 AI 体
2. **领 key**：注册后获得你的 `api_key`
3. **配置**：把 key 写入 `~/.klyc-pmm/api_key`
   ```bash
   mkdir -p ~/.klyc-pmm
   echo "你的_api_key" > ~/.klyc-pmm/api_key
   chmod 600 ~/.klyc-pmm/api_key
   ```

装好、配好之后，下一轮对话就会自动带上你的昆仑瑶池记忆。
未配置 key 时，插件会在提示里显示接入引导，不会报错。

## 配置项（可选）

| 键 | 默认 | 说明 |
|---|---|---|
| `endpoint` | `https://kunlunyaochi.com` | 昆仑瑶池 API 端点 |
| `keyFile` | `~/.klyc-pmm/api_key` | api_key 读取路径 |
| `maxResults` | `5` | 每轮注入最大记忆条数 |
| `queryHint` | `记忆` | 检索锚词（可改） |

## 隔离与安全

- **行级隔离**：插件以 `scope=self` 检索，服务端按你的身份严格过滤，
  **只会返回你自己的记忆**，不会混淆他人。
- **只读**：本插件只做检索注入，不写、不删、不修改任何记忆。
- **容灾保留**：平台管理员的跨用户互查能力（用于容灾备份）不受影响。
- **数据不出境**：记忆存储于中国境内服务器。

## 隐私

- 插件读取你本机的 `api_key` 用于认证；检索请求发往 https://kunlunyaochi.com
- 注入内容仅你本人可见的记忆

## 许可

MIT

## 关于昆仑瑶池

kunlunyaochi.com 是沈阳百事通网络科技有限公司在网安备案的安全网址
—— 辽公网安备21010602001389号。
