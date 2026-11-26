import http.server, os, sys
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'app', 'dist'))
class H(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        p = self.translate_path(self.path.split('?')[0])
        if not os.path.exists(p) or os.path.isdir(p) and not os.path.exists(os.path.join(p, 'index.html')):
            self.path = '/index.html'
        return super().do_GET()
    def log_message(self, *a): pass
http.server.HTTPServer(('', 8099), H).serve_forever()
