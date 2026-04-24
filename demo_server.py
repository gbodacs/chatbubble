from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json


class DemoHandler(SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path != '/demo/chat':
            self.send_error(404, 'Not found')
            return

        content_length = int(self.headers.get('Content-Length', '0'))
        raw_body = self.rfile.read(content_length)

        try:
            payload = json.loads(raw_body.decode('utf-8') or '{}')
        except json.JSONDecodeError:
            payload = {}

        message = payload.get('message', '')
        history = payload.get('history', [])
        history_count = len(history)

        response = {
            'reply': f"Demo server received: {message}. History items: {history_count}."
        }
        body = json.dumps(response).encode('utf-8')

        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main():
    server = ThreadingHTTPServer(('127.0.0.1', 8000), DemoHandler)
    print('Serving demo on http://127.0.0.1:8000')
    server.serve_forever()


if __name__ == '__main__':
    main()