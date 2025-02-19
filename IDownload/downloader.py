import sys
import subprocess
import json
import os, os.path
import threading
import time
import msvcrt


try:
  if not (length := int.from_bytes(sys.stdin.buffer.read(4), sys.byteorder)):
    raise
  message = json.loads(sys.stdin.buffer.read(length))
  if 'explorer' in message:
    started = True
    path = message['explorer']
    if os.path.isfile(path):
      subprocess.run('explorer /select,' + path)
    else:
      path = os.path.dirname(path)
      if not os.path.isdir(path):
        raise
      os.startfile(path, 'explore')
    exit(0)
  try:
    from SocketTB import HTTPIDownload, WebSocketDataStore, IDAltSocketGenerator, WebSocketIDClient
  except:
    import importlib.util
    spec = importlib.util.spec_from_file_location('SocketTB', os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(globals().get('__file__', ' '))), os.pardir, 'SocketTB.py')))
    spec.loader.exec_module(sys.modules.setdefault('SocketTB', importlib.util.module_from_spec(spec)))
    from SocketTB import HTTPIDownload, WebSocketDataStore, IDAltSocketGenerator, WebSocketIDClient
  url = message['url']
  file = message['file']
  dfile = file + '.idownload'
  progress = message.get('progress')
  download = HTTPIDownload(url, dfile, headers={k: v for k, v in map(dict.values, message['headers']) if k.lower() != 'range'}, max_workers=message['maxsecs'], section_min=(message['secmin'] * 1048576), file_preallocate=True, file_sparse=message['sparse'], resume=progress)
  if not download:
    raise
  download.start()
  download.wait_progression()
  started = (st := download.progress['status']) != 'aborted'
except:
  started = False
  exit(1)
finally:
  response = json.dumps(started, separators=(',', ':')).encode()
  sys.stdout.buffer.write(len(response).to_bytes(4, sys.byteorder))
  sys.stdout.buffer.write(response)
  sys.stdout.buffer.flush()
  sys.stderr.buffer.write(b' ')
  sys.stderr.buffer.flush()
sys.stdin = open('con', 'r')
sys.stdout = open('con', 'w')
sys.stderr = open('con', 'w')
download.sdid = message['sdid']
download.suspended = not started and progress is not None


class DownloadReportDS(WebSocketDataStore):

  def __init__(self, download):
    super().__init__()
    self.incoming_text_only = True
    self.download = download
    self.client = None

  @getattr(property(), 'setter')
  def progress(self, value):
    value.pop('workers', None)
    self.set_outgoing(0, json.dumps({'sdid': self.download.sdid, 'progress': value}, separators=(',', ':')))

  def add_incoming(self, value):
    if value == 'discard %s' % self.download.sdid:
      self.download.stop()
    elif value == 'suspend %s' % self.download.sdid:
      self.download.suspended = True
      self.download.stop()


def connect(port, download_ds):
  IDSockGen = IDAltSocketGenerator()
  to = 0.2
  while True:
    if (DownloadWSClient := WebSocketIDClient('ws://localhost:%d/report' % port, download_ds, headers={'X-Request-Id': download_ds.download.sdid}, connection_timeout=to, idsocket_generator=IDSockGen)) is None:
      to = 1
      process = subprocess.Popen(('py', os.path.join(os.path.dirname(os.path.abspath(globals().get('__file__', ' '))), 'websocket.py'), str(port)), creationflags=(subprocess.CREATE_BREAKAWAY_FROM_JOB | subprocess.CREATE_NO_WINDOW), stderr=subprocess.PIPE)
      if process.stderr.read(1) != b'0':
        if download_ds.before_shutdown:
          return
        time.sleep(1)
      if download_ds.before_shutdown:
        return
    else:
      download_ds.client = DownloadWSClient
      return


DownloadDS = DownloadReportDS(download)
th = threading.Thread(target=connect, args=(message['port'], DownloadDS))
th.start()

print('Downloading:', url)
print('Size:', download.progress['size'] or '?')
print('into:', dfile)
print()
DownloadDS.progress = download.progress
if started and st != 'completed':
  print('status:', st)
  print('progression: %s' % download.wait_progress_bar(100, 0), end='\b'*118, flush=True)
  while True:
    print('progression: %s' % download.wait_progress_bar(100), end='\b'*118, flush=True)
    progress = download.progress
    if (st := progress['status']) in ('completed', 'aborted'):
      break
    DownloadDS.progress = progress
  print('progression: %s' % download.wait_progress_bar(100))
suspended = download.suspended
print('status: %s%s' % (st, ((' (%s)' % e) if st == 'aborted' and isinstance((e := download.progress['error']), str) else '')))
DownloadDS.progress = download.progress if st != 'aborted' or suspended else {'status': 'aborted', 'size': download.progress['size'], 'downloaded': 0, 'percent': 0, 'error': download.progress['error']}
if st == 'completed':
  while True:
    try:
      os.rename(dfile, file)
      print('\r\nrenamed:', file)
      break
    except:
      if not os.path.isfile(dfile):
        print('\r\nmissing:', dfile)
        break
      try:
        os.remove(file)
      except:
        time.sleep(0.5)
elif not suspended:
  while True:
    try:
      os.remove(dfile)
      break
    except:
      if not os.path.isfile(dfile):
        break
      time.sleep(0.5)

while msvcrt.kbhit():
  if msvcrt.getch() == b'\xe0':
    msvcrt.getch()
print('\r\nPress any key to exit')
msvcrt.getch()

DownloadDS.before_shutdown = 'end'
th.join()
if DownloadDS.client:
  DownloadDS.client.close(once_data_sent=True, block_on_close=True)