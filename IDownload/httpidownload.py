import sys
import subprocess
import os.path


if len(sys.argv) <= 1:
  import winreg
  k = r'SOFTWARE\Mozilla\NativeMessagingHosts\httpidownload'
  winreg.SetValue(winreg.HKEY_CURRENT_USER, k, winreg.REG_SZ, os.path.join(os.path.dirname(os.path.abspath(globals().get('__file__', ' '))), 'httpidownload.json'))
  print(k, '=', winreg.QueryValue(winreg.HKEY_CURRENT_USER, k))
  exit(0)

process = subprocess.Popen(('py', os.path.join(os.path.dirname(os.path.abspath(globals().get('__file__', ' '))), 'httpidownload_dl.py')), creationflags=(subprocess.CREATE_BREAKAWAY_FROM_JOB | subprocess.CREATE_NEW_CONSOLE), stdin=sys.stdin, stdout=sys.stdout, stderr=subprocess.PIPE)
process.stderr.read(1)
exit(0)