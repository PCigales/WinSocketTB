# WinSocketTB
A module in Python 3 consisting of a toolbox to handle sockets under Windows for various purposes

1. Interruptible sockets: ISocketGenerator
2. Interruptible duplex sockets: IDSocketGenerator
3. Nested SSL/TLS context: NestedSSLContext
4. HTTP message parser: HTTPMessage and HTTPStreamMessage
5. HTTP request compatible with proxy: HTTPRequestConstructor
6. Self-signed RSA certificate: RSASelfSigned
7. Interruptible UDP server: UDPIServer + RequestHandler
8. Interruptible TCP server: TCPIServer + RequestHandler
9. Multi-sockets interruptible UDP server: MultiUDPIServer + RequestHandler
10. Retrieval of ip address of all interfaces: MultiUDPIServer.retrieve_ips()
11. Interruptible websocket server: WebSocketIDServer + WebSocketRequestHandler [+ WebSocketDataStore]
12. Interruptible websocket client: WebSocketIDClient [+ WebSocketDataStore]
13. Time and offset from NTP Server: NTPClient
14. Time based One Time Password: TOTPassword

Usage: from SocketTB import *  
See test.py for examples
