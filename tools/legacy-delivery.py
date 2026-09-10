"""Local compatibility delivery for the currently running legacy TAP.
The feature remains an SDK-built TAP pack. No site behavior is implemented here.
Install beside legacy mutators, with the built page.js at ASSET below.
"""
from pathlib import Path
import hashlib
import re

ASSET = Path(__file__).parent / 'assets' / 'linkedin.copy-links-0.4.2.js'
EXPECTED = '346d96fdc671528545168c4e3066b14824fdd18972e247295889dc79c126c01d'
ROUTE = '/__tap/linkedin-copy-links/' + EXPECTED + '.js'
MARKER = 'tap-linkedin-copy-links'

def script_bytes():
    source = ASSET.read_bytes()
    if hashlib.sha256(source).hexdigest() != EXPECTED:
        raise ValueError('LinkedIn pack asset digest mismatch')
    return source

def request(flow):
    if flow.request.pretty_host.lower() != 'www.linkedin.com':
        return
    if flow.request.path.split('?', 1)[0] != ROUTE:
        return
    from mitmproxy import http
    try:
        source = script_bytes()
    except (OSError, ValueError):
        flow.response = http.Response.make(503, b'Pack unavailable', {'content-type':'text/plain'})
        return
    flow.response = http.Response.make(200, source, {
        'content-type':'application/javascript; charset=utf-8',
        'cache-control':'private, max-age=31536000, immutable',
        'x-content-type-options':'nosniff',
    })

def inject(html):
    if f'id="{MARKER}"' in html:
        return html
    # Restrict the first slice to the observed main-feed HTML.
    if 'data-testid="mainFeed"' not in html or 'id="rehydrate-data"' not in html:
        return html
    nonce = re.search(r'<script\b[^>]*\bnonce=[\"\']([A-Za-z0-9_+/-]+={0,2})[\"\']', html, re.I)
    attr = f' nonce="{nonce[1]}"' if nonce else ''
    tag = f'<script id="{MARKER}"{attr} src="{ROUTE}"></script>'
    end = re.search(r'</body\s*>', html, re.I)
    return html[:end.start()] + tag + html[end.start():] if end else html + tag

def response(flow):
    if flow.response is None or flow.request.pretty_host.lower() != 'www.linkedin.com':
        return
    if flow.request.headers.get('sec-fetch-dest', '') not in ('', 'document'):
        return
    if 'text/html' not in flow.response.headers.get('content-type', '').lower():
        return
    try:
        script_bytes()
    except (OSError, ValueError):
        return
    original = flow.response.get_text(strict=False)
    changed = inject(original)
    if changed != original:
        for key in ('etag', 'last-modified', 'content-length'):
            flow.response.headers.pop(key, None)
        flow.response.headers['cache-control'] = 'no-store'
        flow.response.set_text(changed)
