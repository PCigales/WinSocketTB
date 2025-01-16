import sys
import json
import os.path
import threading
import time


try:
  from SocketTB import WebSocketDataStore, WebSocketRequestHandler, WebSocketIDAltServer
except:
  try:
    import importlib.util
    spec = importlib.util.spec_from_file_location('SocketTB', os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(globals().get('__file__', ' '))), os.pardir, 'SocketTB.py')))
    spec.loader.exec_module(sys.modules.setdefault('SocketTB', importlib.util.module_from_spec(spec)))
    from SocketTB import WebSocketDataStore, WebSocketRequestHandler, WebSocketIDAltServer
  except:
    exit(1)


class DownloadsMonitorDS(WebSocketDataStore):

  def __init__(self, report_datastore):
    super().__init__()
    self.incoming_text_only = True
    self.downloads = {}
    self.report_datastore = report_datastore

  @getattr(property(), 'setter')
  def progress(self, value):
    self.set_outgoing(self.downloads.setdefault(json.loads(value)['did'], len(self.downloads)), value)

  def add_incoming(self, value):
    self.report_datastore.command = value


class DownloadsReportDS(WebSocketDataStore):

  def __init__(self):
    super().__init__()
    self.incoming_text_only = True
    self.monitor_datastore = DownloadsMonitorDS(self)

  @getattr(property(), 'setter')
  def command(self, value):
    self.server.broadcast('report', value)

  def add_incoming(self, value):
    self.monitor_datastore.progress = value


class DownloadsWSRequestHandler(WebSocketRequestHandler):

  def connected_callback(self):
    print(self.connection)

  def closed_callback(self):
    super().closed_callback()
    self.server.close_event.set()


sys.stdin = open('con', 'r')
sys.stdout = open('con', 'w')
try:
  DownloadsWSServer = WebSocketIDAltServer(('localhost', 9009), DownloadsWSRequestHandler)
  DownloadsWSServer.start()
  sys.stderr.buffer.write(b'0')
  sys.stderr.buffer.flush()
  sys.stderr = open('con', 'w')
except:
  sys.stderr.buffer.write(b'1')
  sys.stderr.buffer.flush()
  exit(1)
DownloadsWSServer.close_event = threading.Event()
DownloadsDSReport = DownloadsReportDS()
DownloadsDSReport.server = DownloadsWSServer
DownloadsDSMonitor = DownloadsDSReport.monitor_datastore
DownloadsWSServer.open('/report', DownloadsDSReport)
DownloadsWSServer.open('/monitor', DownloadsDSMonitor)
DownloadsWSServer.close_event.set()
while True:
  DownloadsWSServer.close_event.wait()
  DownloadsWSServer.close_event.clear()
  with DownloadsWSServer.lock:
    if any(not h.closed for c in DownloadsWSServer.channels.values() for h in c.handlers):
      continue
  if DownloadsWSServer.close_event.wait(10):
    continue
  with DownloadsWSServer.lock:
    if any(not h.closed for c in DownloadsWSServer.channels.values() for h in c.handlers):
      continue
    DownloadsWSServer.close('/report', timeout=1, block_on_close=True)
    DownloadsWSServer.close('/monitor', timeout=1, block_on_close=True)
  break
DownloadsWSServer.shutdown(timeout=1, block_on_close=True)