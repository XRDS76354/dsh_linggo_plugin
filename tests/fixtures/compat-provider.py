"""Local OpenAI-compatible test provider: deterministic streaming, tool call and cancellation.

No product/demo data, credentials or external model requests. Run only in isolated test profiles.
"""
import argparse
import json
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

parser = argparse.ArgumentParser()
parser.add_argument("--port", type=int, default=3260)
args = parser.parse_args()


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        tools = {t["function"]["name"] for t in body.get("tools", [])}
        messages = body.get("messages", [])
        has_result = any(m.get("role") == "tool" for m in messages)
        slow = any("LINGGO_COMPAT_CANCEL" in str(m.get("content", "")) for m in messages)
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.end_headers()

        def chunk(delta, reason=None):
            value = {"id": "compat-completion", "object": "chat.completion.chunk", "created": int(time.time()),
                     "model": "compatibility", "choices": [{"index": 0, "delta": delta, "finish_reason": reason}]}
            self.wfile.write(("data: " + json.dumps(value, ensure_ascii=False) + "\n\n").encode())
            self.wfile.flush()

        try:
            chunk({"role": "assistant"})
            if not slow and "linggo_status" in tools and not has_result:
                chunk({"tool_calls": [{"index": 0, "id": "compat-status", "type": "function",
                                       "function": {"name": "linggo_status", "arguments": "{}"}}]})
                chunk({}, "tool_calls")
            else:
                for text in (["兼容测试流式回复", "：", "已完成公交状态查询。"] if not slow else ["兼容取消测试 "] * 500):
                    chunk({"content": text})
                    time.sleep(0.15)
                chunk({}, "stop")
            self.wfile.write(b"data: [DONE]\n\n")
        except (BrokenPipeError, ConnectionResetError):
            pass


ThreadingHTTPServer(("127.0.0.1", args.port), Handler).serve_forever()
