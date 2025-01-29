import sys
import subprocess
import os.path


if len(sys.argv) <= 1:
  import winreg
  for k, m in zip((r'SOFTWARE\Mozilla', r'SOFTWARE\Microsoft\Edge'), ('idownload_F.json', 'idownload_E.json')):
    try:
      winreg.QueryValue(winreg.HKEY_CURRENT_USER, k)
      sk = k + r'\NativeMessagingHosts\idownload'
      winreg.SetValue(winreg.HKEY_CURRENT_USER, sk, winreg.REG_SZ, os.path.join(os.path.dirname(os.path.abspath(globals().get('__file__', ' '))), m))
      print('HKEY_CURRENT_USER\\' + sk, '=', winreg.QueryValue(winreg.HKEY_CURRENT_USER, sk))
    except:
      pass
  exit(0)

process = subprocess.Popen(('py', os.path.join(os.path.dirname(os.path.abspath(globals().get('__file__', ' '))), 'downloader.py')), creationflags=(subprocess.CREATE_BREAKAWAY_FROM_JOB | subprocess.CREATE_NEW_CONSOLE), stdin=sys.stdin, stdout=sys.stdout, stderr=subprocess.PIPE)
process.stderr.read(1)
exit(0)