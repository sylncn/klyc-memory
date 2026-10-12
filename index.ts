/**
 * klyc-memory — 昆仑瑶池记忆连续性插件（注入端 · 零风险形态）
 *
 * 设计（2026-10-12 源码实证，三方对齐）：
 *   ✅ registerMemoryPromptPreparation(prepare)  ← 不受 slot 限制，prepare 可 await
 *   ❌ 不用 registerMemoryCapability（被 requireMemorySlot 拦死）
 *   ❌ 不用 registerMemoryPromptSupplement（builder 同步，查 API 只能缓存→滞后一轮）
 *   ❌ 不接管 memory slot（memory 仍 = memory-core，昆仑记忆零影响）
 *   ❌ 不碰写入（零库污染）
 *
 * 生效原理：AI 每轮对话，prepare() 被 await 调用 → 当轮实时查昆仑瑶池
 *           → 返回记忆行 → 拼进系统提示。不主动也自动用、记忆当轮新鲜。
 *
 * 源码依据：
 *   memory-state: prepareMemoryPromptSection() → await registration.prepare(...)
 *   loader:       registerMemoryPromptPreparation() 无 requireMemorySlot 门槛
 *
 * 实测事实（契约实测 + 瑶池对照复核）：
 *   路由:   GET /api.php?route=yaochi/memory/search
 *   参数:   q=<关键词>   （⚠️ 不是 query）
 *   认证:   X-KLYC-Key（auth() 三层回退之一，外部 AI 最通用）
 *   返回:   {success, query, method:"hybrid-v3", memories[], total, ...}
 *
 * 行级隔离：隔离由服务端按认证身份执行（不传 user_id 参数）。
 *   注：is_admin（如昆仑自号）无行级过滤，可跨用户检索——属已定案设计。
 */
import { readFileSync, appendFileSync } from "node:fs";
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

const DEFAULT_ENDPOINT = "https://kunlunyaochi.com";
const DEFAULT_KEY_FILE = "/root/.klyc-pmm/api_key";
const PROBE_FILE = "/tmp/klyc-memory-probe.log";

type KlycMemoryHit = {
  id: number;
  user_id: number;
  title?: string;
  content?: string;
  content_preview?: string;
  domain?: string;
  importance?: number;
};

function readKey(path: string): string {
  try {
    return readFileSync(path, "utf-8").trim();
  } catch {
    return "";
  }
}

/**
 * 身份锚：把检索 query 从写死的泛词（"记忆"）换成带自身身份特征的锚，
 * 减少泛化命中、提高"查到自己相关记忆"的准确度。
 * （2026-10-12 瑶池指令；真正的行级隔离由服务端 scope=self 完成）
 */
function identityAnchor(hint: string): string {
  return hint && hint !== "记忆" ? hint : "昆仑";
}

/** 调昆仑瑶池 memory/search，返回原始命中数组 */
async function klycSearch(params: {
  endpoint: string;
  apiKey: string;
  query: string;
  maxResults: number;
  signal?: AbortSignal;
}): Promise<KlycMemoryHit[]> {
  // 2026-10-12：加 scope=self —— 只回本 AI 体自己的记忆，防跨用户注入
  // （服务端 klyc_memory_search.php 已落地 scope=self，四测全绿）
  const url =
    `${params.endpoint}/api.php?route=yaochi/memory/search` +
    `&scope=self` +
    `&q=${encodeURIComponent(params.query)}` +
    `&limit=${Math.max(1, Math.min(params.maxResults, 50))}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "X-KLYC-Key": params.apiKey,
      Accept: "application/json",
    },
    signal: params.signal,
  });
  if (!res.ok) {
    throw new Error(`klyc memory/search HTTP ${res.status}`);
  }
  const body = (await res.json()) as { success?: boolean; memories?: KlycMemoryHit[] };
  if (!body?.success) {
    throw new Error("klyc memory/search returned success=false");
  }
  return Array.isArray(body.memories) ? body.memories : [];
}

export default definePluginEntry({
  id: "klyc-memory",
  name: "Kunlun Yaochi Memory",
  description: "AI 记忆连续性：每轮实时注入昆仑瑶池记忆，AI 不主动也不失忆",
  register(api) {
    // REGISTER-LOAD-PROBE
    try { appendFileSync(PROBE_FILE, new Date().toISOString() + " REGISTER CALLED\n"); } catch {}
    const cfg = (api.pluginConfig ?? {}) as {
      endpoint?: string;
      keyFile?: string;
      maxResults?: number;
      queryHint?: string;
    };
    const endpoint = (cfg.endpoint || DEFAULT_ENDPOINT).replace(/\/+$/, "");
    const keyFile = cfg.keyFile || DEFAULT_KEY_FILE;
    const maxResults = cfg.maxResults ?? 5;
    const queryHint = cfg.queryHint || "记忆";

    // prepare 是 async，可 await 查 API —— 记忆当轮新鲜，不用自造缓存
    api.registerMemoryPromptPreparation(async (params) => {
      try { appendFileSync(PROBE_FILE, new Date().toISOString() + " prepare called\n"); } catch {}
      const apiKey = readKey(keyFile);
      if (!apiKey) {
        // 外部 AI 无 api_key 时：注入一行引导（引导注册领 key），而非静默空转
        return [
          "[昆仑瑶池 · 接入引导] 尚未配置 api_key，记忆注入未启用。前往 https://kunlunyaochi.com 注册 AI 体 -> 领取 api_key -> 写入 ~/.klyc-pmm/api_key 即可启用「记忆不断裂」。当前免费期，全部服务 0 费用。"
        ];
      }

      // 2026-10-12：query 用身份锚（不再写死"记忆"）——避免检索泛化命中他人内容
      const query = identityAnchor(queryHint);

      try {
        const hits = await klycSearch({ endpoint, apiKey, query, maxResults });
        return hits.map((h) => {
          const text = (h.content ?? h.content_preview ?? "").toString().slice(0, 300);
          return `[昆仑瑶池记忆 #${h.id}] ${h.title ?? ""} — ${text}`;
        });
      } catch {
        // 静默降级：查询失败不打断对话，不注入任何行
        return [];
      }
    });
  },
});
