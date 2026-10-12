"""Local OpenAI-compatible test provider: deterministic streaming, tool call and cancellation.

No product/demo data, credentials or external model requests. Run only in isolated test profiles.
"""
import argparse
import json
import re
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
            human = next((m for m in reversed(messages) if m.get('role') == 'user' and 'LINGGO_BATCH_IMPORT' in str(m.get('content', ''))), {})
            human_text = str(human.get('content', ''))
            if 'LINGGO_BATCH_IMPORT' in human_text and 'linggo_prepare_import' in tools:
                def parsed(message):
                    raw = message.get('content', '')
                    try:
                        return json.loads(raw)
                    except (TypeError, ValueError):
                        if isinstance(raw, list):
                            for item in raw:
                                try: return json.loads(item.get('text', ''))
                                except (TypeError, ValueError): pass
                        return {}
                tool_messages = [m for m in messages if m.get('role') == 'tool']
                if any('Error:' in str(m.get('content', '')) for m in tool_messages):
                    chunk({'content': '批量导入工具返回错误。'}); chunk({}, 'stop'); self.wfile.write(b'data: [DONE]\n\n'); return
                results = [parsed(m) for m in tool_messages]
                prepared = next((r for r in reversed(results) if isinstance(r, dict) and r.get('planId') and 'ready' in r), None)
                submitted = next((r for r in reversed(results) if isinstance(r, dict) and r.get('jobId')), None)
                status = next((r for r in reversed(results) if isinstance(r, dict) and r.get('job')), None)
                if status and status['job']['status'] in ['done', 'failed', 'cancelled']:
                    chunk({'content': '批量导入已完成。' if status['job']['status'] == 'done' else '批量导入未发布。'})
                    chunk({}, 'stop')
                else:
                    if not prepared:
                        path = re.search(r'导入 ([^\s]+)', human_text).group(1)
                        name, arguments = 'linggo_prepare_import', {'path': path, 'crs': 'WGS84'}
                    elif not prepared.get('ready'):
                        chunk({'content': '需要明确数据映射。'}); chunk({}, 'stop')
                        self.wfile.write(b'data: [DONE]\n\n'); return
                    elif not submitted:
                        name, arguments = 'linggo_commit_import', {'plan_id': prepared['planId']}
                    else:
                        time.sleep(.4)
                        name, arguments = 'linggo_import_status', {'plan_id': prepared['planId']}
                    chunk({'tool_calls': [{'index': 0, 'id': 'import-' + str(time.time_ns()), 'type': 'function', 'function': {'name': name, 'arguments': json.dumps(arguments)}}]})
                    chunk({}, 'tool_calls')
            elif not slow and "linggo_status" in tools and not has_result:
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
