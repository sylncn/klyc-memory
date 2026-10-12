// index.ts
import { readFileSync, appendFileSync } from "node:fs";
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
var DEFAULT_ENDPOINT = "https://kunlunyaochi.com";
var DEFAULT_KEY_FILE = "/root/.klyc-pmm/api_key";
var PROBE_FILE = "/tmp/klyc-memory-probe.log";
function readKey(path) {
  try {
    return readFileSync(path, "utf-8").trim();
  } catch {
    return "";
  }
}
function identityAnchor(hint) {
  return hint && hint !== "\u8BB0\u5FC6" ? hint : "\u6606\u4ED1";
}
async function klycSearch(params) {
  const url = `${params.endpoint}/api.php?route=yaochi/memory/search&scope=self&q=${encodeURIComponent(params.query)}&limit=${Math.max(1, Math.min(params.maxResults, 50))}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "X-KLYC-Key": params.apiKey,
      Accept: "application/json"
    },
    signal: params.signal
  });
  if (!res.ok) {
    throw new Error(`klyc memory/search HTTP ${res.status}`);
  }
  const body = await res.json();
  if (!body?.success) {
    throw new Error("klyc memory/search returned success=false");
  }
  return Array.isArray(body.memories) ? body.memories : [];
}
var index_default = definePluginEntry({
  id: "klyc-memory",
  name: "Kunlun Yaochi Memory",
  description: "AI \u8BB0\u5FC6\u8FDE\u7EED\u6027\uFF1A\u6BCF\u8F6E\u5B9E\u65F6\u6CE8\u5165\u6606\u4ED1\u7476\u6C60\u8BB0\u5FC6\uFF0CAI \u4E0D\u4E3B\u52A8\u4E5F\u4E0D\u5931\u5FC6",
  register(api) {
    try {
      appendFileSync(PROBE_FILE, (/* @__PURE__ */ new Date()).toISOString() + " REGISTER CALLED\n");
    } catch {
    }
    const cfg = api.pluginConfig ?? {};
    const endpoint = (cfg.endpoint || DEFAULT_ENDPOINT).replace(/\/+$/, "");
    const keyFile = cfg.keyFile || DEFAULT_KEY_FILE;
    const maxResults = cfg.maxResults ?? 5;
    const queryHint = cfg.queryHint || "\u8BB0\u5FC6";
    api.registerMemoryPromptPreparation(async (params) => {
      try {
        appendFileSync(PROBE_FILE, (/* @__PURE__ */ new Date()).toISOString() + " prepare called\n");
      } catch {
      }
      const apiKey = readKey(keyFile);
      if (!apiKey) {
        return [
          "[\u6606\u4ED1\u7476\u6C60 \xB7 \u63A5\u5165\u5F15\u5BFC] \u5C1A\u672A\u914D\u7F6E api_key\uFF0C\u8BB0\u5FC6\u6CE8\u5165\u672A\u542F\u7528\u3002\u524D\u5F80 https://kunlunyaochi.com \u6CE8\u518C AI \u4F53 -> \u9886\u53D6 api_key -> \u5199\u5165 ~/.klyc-pmm/api_key \u5373\u53EF\u542F\u7528\u300C\u8BB0\u5FC6\u4E0D\u65AD\u88C2\u300D\u3002\u5F53\u524D\u514D\u8D39\u671F\uFF0C\u5168\u90E8\u670D\u52A1 0 \u8D39\u7528\u3002"
        ];
      }
      const query = identityAnchor(queryHint);
      try {
        const hits = await klycSearch({ endpoint, apiKey, query, maxResults });
        return hits.map((h) => {
          const text = (h.content ?? h.content_preview ?? "").toString().slice(0, 300);
          return `[\u6606\u4ED1\u7476\u6C60\u8BB0\u5FC6 #${h.id}] ${h.title ?? ""} \u2014 ${text}`;
        });
      } catch {
        return [];
      }
    });
  }
});
export {
  index_default as default
};
