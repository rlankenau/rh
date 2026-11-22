#!/usr/bin/env python3
"""Local review mode for the companion site.

Serves docs/ on http://127.0.0.1:8770/ and adds two actions the public site cannot offer:
  POST /__review/comment   files the comment as a GitHub issue with `gh` (no browser login involved)
  POST /__review/reviewed  adds or removes a page in site/reviewed.json and rebuilds the site
Both require the X-Review header, which a page on another site cannot send, and the server listens on
127.0.0.1 unless --host says otherwise. Commit and push after marking pages reviewed.
"""
import argparse, functools, http.server, json, pathlib, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
REPO = "rlankenau/rh"
SITE = "https://rlankenau.github.io/rh/"


def file_comment(d):
    slug = d["slug"]
    quote = " ".join(d.get("quote", "").split())
    comment = d["comment"].strip()
    head = quote or comment
    title = f"[{slug}] " + (head[:70] + ("…" if len(head) > 70 else ""))
    body = f"**Page:** {SITE}{'' if slug == 'home' else slug + '/'}\n"
    if d.get("section"):
        body += f"**Section:** {d['section']}\n"
    if quote:
        body += f"\n> {quote}\n"
    body += f"\n{comment}\n"
    out = subprocess.run(["gh", "issue", "create", "-R", REPO, "--title", title, "--body", body, "--label", "site-comment"],
                         capture_output=True, text=True)
    if out.returncode:
        raise RuntimeError(out.stderr.strip() or "gh issue create failed")
    url = out.stdout.strip().splitlines()[-1]
    return {"url": url, "number": int(url.rsplit("/", 1)[1])}


def set_reviewed(d):
    path = ROOT / "site" / "reviewed.json"
    done = set(json.loads(path.read_text()))
    (done.add if d["reviewed"] else done.discard)(d["slug"])
    path.write_text(json.dumps(sorted(done)) + "\n")
    out = subprocess.run([sys.executable, str(ROOT / "build.py")], capture_output=True, text=True)
    if out.returncode:
        raise RuntimeError(out.stderr.strip()[-400:])
    return {"reviewed": sorted(done)}


class Handler(http.server.SimpleHTTPRequestHandler):
    def reply(self, code, obj):
        data = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        if self.path == "/__review/ping":
            return self.reply(200, {"ok": True, "reviewed": json.loads((ROOT / "site" / "reviewed.json").read_text())})
        super().do_GET()

    def do_POST(self):
        action = {"/__review/comment": file_comment, "/__review/reviewed": set_reviewed}.get(self.path)
        if action is None or self.headers.get("X-Review") != "1":
            return self.reply(403, {"error": "not allowed"})
        try:
            d = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))))
            self.reply(200, action(d))
        except Exception as e:  # report the failure to the page instead of dropping the connection
            self.reply(500, {"error": str(e)})

    def log_message(self, fmt, *args):
        if "/__review/" in (args[0] if args else ""):
            super().log_message(fmt, *args)


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8770)
    a = ap.parse_args()
    handler = functools.partial(Handler, directory=str(ROOT / "docs"))
    print(f"Review mode: http://{a.host}:{a.port}/  (Ctrl-C to stop)")
    http.server.ThreadingHTTPServer((a.host, a.port), handler).serve_forever()
