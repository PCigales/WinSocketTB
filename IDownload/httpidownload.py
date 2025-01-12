import sys
import subprocess
import json
import os, os.path
import time
import msvcrt

if len(sys.argv) <= 1:
  import winreg
  k = r'SOFTWARE\Mozilla\NativeMessagingHosts\httpidownload'
  winreg.SetValue(winreg.HKEY_CURRENT_USER, k, winreg.REG_SZ, os.path.join(os.path.dirname(os.path.abspath(globals().get('__file__', ' '))), 'httpidownload.json'))
  print(k, '=', winreg.QueryValue(winreg.HKEY_CURRENT_USER, k))
elif sys.argv[1] != '*':
  process = subprocess.Popen(('py', sys.argv[0], '*'), creationflags=(subprocess.CREATE_BREAKAWAY_FROM_JOB | subprocess.CREATE_NEW_CONSOLE), stdin=sys.stdin, stdout=sys.stdout, stderr=subprocess.PIPE)
  process.stderr.read(1)
else:
  try:
    if not (length := int.from_bytes(sys.stdin.buffer.read(4), sys.byteorder)):
      raise
    message = json.loads(sys.stdin.buffer.read(length))
    try:
      from SocketTB import HTTPIDownload
    except:
      import importlib.util
      spec = importlib.util.spec_from_file_location('SocketTB', os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(globals().get('__file__', ' '))), os.pardir, 'SocketTB.py')))
      spec.loader.exec_module(sys.modules.setdefault('SocketTB', importlib.util.module_from_spec(spec)))
      from SocketTB import HTTPIDownload
    url = message['url']
    file = message['file']
    dfile = file + '.idownload'
    download = HTTPIDownload(url, dfile, headers=dict(map(dict.values, message['headers'])))
    if not download:
      raise
    download.start()
    download.wait_progression()
    started = download.wait_finish(0) != 'aborted'
  except:
    started = False
    exit(1)
  finally:
    response = json.dumps(started, separators=(',', ':')).encode()
    sys.stdout.buffer.write(len(response).to_bytes(4, sys.byteorder))
    sys.stdout.buffer.write(response)
    sys.stdout.buffer.flush()
    sys.stderr.buffer.write(b' ')
  sys.stdin = open('con', 'r')
  sys.stdout = open('con', 'w')
  print('Downloading:', url)
  print('into:', dfile)
  print()
  print('progression: 0%', end='\b'*18, flush=True)
  if started:
    while download.wait_finish(0) not in ('completed', 'aborted'):
      print('progression: %d %%' % download.wait_progression(), end='\b'*18, flush=True)
    print('progression: %d %%' % download.wait_progression())
  print('status:', download.wait_finish(0))
  print()
  while True:
    try:
      os.rename(dfile, file)
      print('renamed:', file)
      break
    except:
      try:
        os.remove(file)
      except:
        time.sleep(0.5)
  while msvcrt.kbhit():
    if msvcrt.getch() == b'\xe0':
      msvcrt.getch()
  print()
  print('Press any key to exit')
  msvcrt.getch()