import sys
import json
import os.path
import threading
import time
import ctypes, ctypes.wintypes


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

  @property
  def progress(self):
    return lambda sdid: None if (ind := self.downloads.get(sdid)) is None else self.outgoing[ind][1]

  @progress.setter
  def progress(self, value):
    progression = json.loads(value)
    if progression['progress']['status'] in ('completed', 'aborted'):
      self.report_datastore.downloaders.pop(progression['sdid'], None)
    self.set_outgoing(self.downloads.setdefault(progression['sdid'], len(self.downloads)), value)

  def add_incoming(self, value):
    self.report_datastore.command = value


class DownloadsReportDS(WebSocketDataStore):

  def __init__(self, server):
    super().__init__()
    self.incoming_text_only = True
    self.server = server
    self.downloaders = {}
    self.monitor_datastore = DownloadsMonitorDS(self)

  @getattr(property(), 'setter')
  def command(self, value):
    self.server.broadcast('report', value)

  def add_incoming(self, value):
    self.monitor_datastore.progress = value


class DownloadsWSRequestHandler(WebSocketRequestHandler):

  def connected_callback(self):
    super().connected_callback()
    try:
      if self.request.getsockname()[0] != self.request.getpeername()[0] or (self.channel.path == 'report' and self.channel.datastore.downloaders.setdefault(self.headers['X-Request-Id'], self) != self):
        raise
    except:
      self.closed = True
      return

  def closed_callback(self):
    super().closed_callback()
    if self.channel.path == 'report' and self.channel.datastore.downloaders.pop(self.headers['X-Request-Id'], None) == self:
      progression = json.loads(self.channel.datastore.monitor_datastore.progress(self.headers['X-Request-Id']))
      progression['progress']['status'] = 'aborted'
      for sec in progression['progress'].get('sections', ()):
        sec['status'] = 'aborted'
      self.channel.datastore.monitor_datastore.progress = json.dumps(progression, separators=(',', ':'))
    self.server.close_event.set()


try:
  DownloadsWSServer = WebSocketIDAltServer(int(sys.argv[1]), DownloadsWSRequestHandler)
  DownloadsWSServer.start()
  sys.stderr.buffer.write(b'0')
  sys.stderr.buffer.flush()
except:
  sys.stderr.buffer.write(b'1')
  sys.stderr.buffer.flush()
  exit(1)
sys.stderr = open('con', 'w')
DownloadsWSServer.close_event = threading.Event()
DownloadsDSReport = DownloadsReportDS(DownloadsWSServer)
DownloadsWSServer.open('/report', DownloadsDSReport)
DownloadsWSServer.open('/monitor', DownloadsDSReport.monitor_datastore)
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