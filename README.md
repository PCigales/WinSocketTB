# WinSocketTB
A module in Python 3 consisting of a toolbox to handle sockets under Windows for various purposes

1. Interruptible thread-safe sockets: ISocketGenerator
2. Interruptible thread-safe duplex sockets: IDSocketGenerator or IDAltSocketGenerator
3. Nested SSL/TLS context (sequential or duplex): NestedSSLContext
4. HTTP message parser (brotli support if module available): HTTPMessage and HTTPStreamMessage
5. HTTP request compatible with proxy: HTTPRequestConstructor
6. Self-signed RSA certificate: RSASelfSigned
7. Interruptible UDP server: (UDPIServer or UDPIDServer / UDPIDAltServer) + RequestHandler
8. Interruptible TCP server: (TCPIServer or TCPIDServer / TCPIDAltServer) + RequestHandler
9. Multi-sockets interruptible UDP server: (MultiUDPIServer or MultiUDPIDServer / MultiUDPIDAltServer) + RequestHandler
10. Retrieval of ip address of all interfaces: MultiUDPIServer.retrieve_ipv4s() or MultiUDPIServer.retrieve_ips()
11. Interruptible HTTP Server: HTTPIServer
12. Interruptible websocket server: WebSocketIDServer / WebSocketIDAltServer + WebSocketRequestHandler [+ WebSocketDataStore]
13. Interruptible websocket client: WebSocketIDClient [+ WebSocketDataStore]
14. Interruptible downloader compatible with proxy: HTTPIDownload, HTTPIListDownload
15. Interruptible uploader compatible with proxy: HTTPIUpload
16. Time and offset from NTP Server: NTPClient
17. Time based One Time Password: TOTPassword

Usage: from SocketTB import *  
See test.py for examples and also the IDownload Firefox / Edge extension
