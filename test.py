from SocketTB import *
import ssl
import base64
import os
import threading
import io
import time
import locale

with ISocketGenerator() as IGen:
  ISock0 = IGen(family=socket.AF_INET, type=socket.SOCK_STREAM)
  sock2 = socket.socket(family=socket.AF_INET, type=socket.SOCK_STREAM)
  ISock2 = IGen(sock2)
  ISock0.bind(('127.0.0.1', 9000))
  ISock0.listen()
  ISock2.connect(('127.0.0.1', 9000))
  ISock1 = ISock0.accept()[0]
  print(ISock0, ISock1, ISock2)
  ISock2.sendall(b'test')
  print(ISock1.recv(10))
  try:
    ISock1.recv(10, timeout=2)
  except TimeoutError:
    print('timeout')
  def r(n):
    try:
      ISock1.recv(n)
    except OSError as err:
      if err.winerror == 10038:
        print('interrupted')
      else:
        raise
  t = threading.Thread(target=r, args=(10, ))
  t.start()
  time.sleep(2)
  ISock1.shutclose()
  def a():
    try:
      ISock1 = ISock0.accept()[0]
    except OSError as err:
      if err.winerror == 10038:
        print('interrupted')
      else:
        raise
  t = threading.Thread(target=a)
  t.start()
  time.sleep(2)

with IDSocketGenerator() as IDGen:
  IDSock0 = IDGen(family=socket.AF_INET, type=socket.SOCK_STREAM)
  sock2 = socket.socket(family=socket.AF_INET, type=socket.SOCK_STREAM)
  IDSock2 = IDGen(sock2)
  IDSock0.bind(('127.0.0.1', 9000))
  IDSock0.listen()
  IDSock2.connect(('127.0.0.1', 9000))
  IDSock1 = IDSock0.accept()[0]
  print(IDSock0, IDSock1, IDSock2)
  IDSock2.sendall(b'test2')
  IDSock1.sendall(b'test1')
  print(IDSock1.recv(10))
  print(IDSock2.recv(10))
  def r1(n):
    try:
      IDSock1.recv(n)
    except OSError as err:
      if err.winerror == 10038:
        print('interrupted1')
      else:
        raise
  def r2(n):
    try:
      IDSock2.recv(n)
    except OSError as err:
      if err.winerror == 10038:
        print('interrupted2')
      else:
        raise
  t1 = threading.Thread(target=r1, args=(10, ))
  t2 = threading.Thread(target=r2, args=(10, ))
  t1.start()
  t2.start()
  time.sleep(2)

ctxs = NestedSSLContext(ssl.PROTOCOL_TLS_SERVER)
ctxs.load_autogenerated_cert_chain()
ctxc = NestedSSLContext(ssl.PROTOCOL_TLS_CLIENT)
ctxc.check_hostname = False
ctxc.verify_mode = ssl.CERT_NONE
with IDSocketGenerator() as IDGen:
  IDSock0 = IDGen(family=socket.AF_INET, type=socket.SOCK_STREAM)
  IDSock2 = IDGen(family=socket.AF_INET, type=socket.SOCK_STREAM)
  IDSock0S = ctxs.wrap_socket(IDSock0, server_side=True)
  IDSock0SS = ctxs.wrap_socket(IDSock0S, server_side=True)
  IDSock2S = ctxc.wrap_socket(IDSock2, server_side=False, server_hostname='127.0.0.1')
  IDSock2SS = ctxc.wrap_socket(IDSock2S, server_side=False, server_hostname='127.0.0.1')
  IDSock0SS.bind(('127.0.0.1', 9000))
  IDSock0SS.listen()
  def c():
    IDSock2SS.connect(('127.0.0.1', 9000))
  t = threading.Thread(target=c)
  t.start()
  IDSock1SS = IDSock0SS.accept()[0]
  print(IDSock0SS, IDSock1SS, IDSock2SS)
  IDSock2SS.sendall(b'test')
  print(IDSock1SS.recv(10))
  IDSock0SS.shutclose()
  IDSock1SS.shutclose()
  IDSock2SS.shutclose()
print(IDSock0SS, IDSock1SS, IDSock2SS)

UDPServer = MultiUDPIServer(1900, RequestHandler, True, ('239.255.255.250', 'ff02::c'))
UDPServer.start()
with ISocketGenerator() as IGen:
  ISock0 = IGen(family=socket.AF_INET, type=socket.SOCK_DGRAM)
  ISock0.sendto(b'test ipv4', ('239.255.255.250', 1900))
  ISock0.close()
  ISock0 = IGen(family=socket.AF_INET6, type=socket.SOCK_DGRAM)
  ISock0.sendto(b'test ipv6', ('ff02::c', 1900))
  ISock0.close()
  ISock0 = IGen(family=socket.AF_INET6, type=socket.SOCK_DGRAM)
  ISock0.bind(('::1',0))
  ISock0.sendto(b'test ipv6 lb', ('ff02::c', 1900))
time.sleep(2)
UDPServer.shutdown()

DS = WebSocketDataStore()
ctxs = NestedSSLContext(ssl.PROTOCOL_TLS_SERVER)
cid = base64.b32encode(os.urandom(10)).decode('utf-8')
with RSASelfSigned('TCPIServer' + cid, 1) as cert:
  cert.pipe_PEM('cert' + cid, 'key' + cid, 2)
  ctxs.load_cert_chain(r'\\.\pipe\cert%s.pem' % cid, r'\\.\pipe\key%s.pem' % cid)
WSSServer = WebSocketIDServer(('127.0.0.1', 9000), nssl_context=ctxs)
WSSServer.start()
WSSServer.open('/test')
WSSClient = WebSocketIDClient('wss://127.0.0.1:9000/test', DS)
WSSServer.broadcast('/test', 'welcome')
time.sleep(0.5)
print(DS.incoming)
WSSClient.close()
WSSServer.close('/test')
WSSServer.stop()

with IDSocketGenerator() as IDGen:
  HTTPRequest = HTTPRequestConstructor(IDGen)
  rep = HTTPRequest('https://www.python.org')
  print(rep)
  pcon = []
  rep = HTTPRequest('https://www.python.org', max_length=-1, pconnection=pcon)
  print(pcon)
  print(rep.body(20))
  print(rep.body(20))
  pcon[0].shutclose()
  rep = HTTPRequest('http://www.google.fr/search', max_length=-1, pconnection=pcon, process_cookies=True)
  print(pcon)
  print(rep.body(20))
  pcon[0].shutclose()

with HTTPIServer(9000, '', threaded=True, max_upload_size=10, dual_stack=True), IDAltSocketGenerator() as IDGen:
  IDSock0 = IDGen(family=socket.AF_INET)
  IDSock0.connect(('127.0.0.1', 9000))
  IDSock0.send(b'OPTIONS * HTTP/1.1\r\nHost: 127.0.0.1:9000\r\n\r\n')
  print(IDSock0.recv(1024))
  IDSock0.close()
  IDSock0 = IDGen(family=socket.AF_INET6)
  IDSock0.connect(('[::1]', 9000))
  IDSock0.send(b'OPTIONS * HTTP/1.1\r\nHost: [::1]:9000\r\n\r\n')
  print(IDSock0.recv(1024))
  IDSock0.close()
  HTTPRequest = HTTPRequestConstructor(IDGen)
  pcon = []
  print(HTTPRequest('*', method='OPTIONS', pconnection=pcon))
  print(HTTPRequest('http://localhost:9000/', pconnection=pcon))
  print(pcon)
  print(HTTPRequest('http://localhost:9000/nul', method='PUT', data=b'0' * 11, pconnection=pcon))
  print(pcon)
  b = io.BytesIO()
  with HTTPIDownload('http://localhost:9000/test.py', b, max_workers=3, timeout=5, block_size=4) as d:
    while d.wait_finish(0) not in ('completed', 'aborted'):
      print(d.wait_sections())
    print(d)
  print(len(b.getvalue()))
  b.close()

locale.setlocale(locale.LC_TIME, '')
with NTPClient('time.google.com') as ntpc:
  print(ntpc.get_time(to_local=True))
  print(ntpc.get_offset())

with TOTPassword('AAAAAAAAAAAAAAAA') as totp:
  for i in range(10):
    p, r = totp.get(clipboard=True)
    print('', p, str(r).rjust(4), end ='\b'*12, flush=True)
    time.sleep(1)
  print('')