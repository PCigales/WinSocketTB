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
  headers = dict(map(dict.values, message['headers']))
  download = HTTPIDownload(url, dfile, headers=headers, resume=message.get('progress'))
  if not download:
    raise
  download.start()
  download.wait_progression()
  started = (st := download.wait_finish(0)) != 'aborted'
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
download.sid = message['sid']
download.did = message['did']
download.path = file
download.headers = headers
download.suspended = False


class DownloadReportDS(WebSocketDataStore):

  def __init__(self, download):
    super().__init__()
    self.incoming_text_only = True
    self.download = download
    self.client = None

  @getattr(property(), 'setter')
  def progress(self, value):
    value.pop('workers', None)
    self.set_outgoing(0, json.dumps({'sid': self.download.sid, 'did': self.download.did, 'progress': value}, separators=(',', ':')))

  def add_incoming(self, value):
    if value == 'discard %d' % self.download.did:
      self.download.stop()
    elif value == 'suspend %d' % self.download.did:
      self.download.suspended = True
      self.download.stop()


def connect(download_ds):
  IDSockGen = IDAltSocketGenerator()
  to = 0.2
  while True:
    if (DownloadWSClient := WebSocketIDClient('ws://localhost:9009/report', download_ds, connection_timeout=to, idsocket_generator=IDSockGen)) is None:
      to = 1
      process = subprocess.Popen(('py', os.path.join(os.path.dirname(os.path.abspath(globals().get('__file__', ' '))), 'websocket.py')), creationflags=(subprocess.CREATE_BREAKAWAY_FROM_JOB | subprocess.CREATE_NEW_CONSOLE), stderr=subprocess.PIPE)
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
th = threading.Thread(target=connect, args=(DownloadDS,))
th.start()

print('Downloading:', url)
print('Size:', download.progress['size'] or '?')
print('into:', dfile)
print()
DownloadDS.progress = download.progress
if started and st != 'completed':
  print('status:', st)
  print('progression: %s' % download.wait_progress_bar(100, 0), end='\b'*118, flush=True)
  while (st := download.wait_finish(0)) not in ('completed', 'aborted'):
    print('progression: %s' % download.wait_progress_bar(100), end='\b'*118, flush=True)
    DownloadDS.progress = download.progress
  print('progression: %s' % download.wait_progress_bar(100))
suspended = download.suspended
print('status:', st)
DownloadDS.progress = download.progress if st != 'aborted' or suspended else {'status': 'aborted', 'size': download.progress['size'], 'downloaded': 0, 'percent': 0}
if st == 'completed':
  while True:
    try:
      os.rename(dfile, file)
      print()
      print('renamed:', file)
      break
    except:
      if not os.path.isfile(dfile):
        print()
        print('missing:', dfile)
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
print()
print('Press any key to exit')
msvcrt.getch()

DownloadDS.before_shutdown = 'end'
th.join()
if DownloadDS.client:
  DownloadDS.client.close(once_data_sent=True, block_on_close=True)