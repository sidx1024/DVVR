# VR Tracker Web Socket Server
# We have two things going on here,
# 1.) We create a web socket server, so that chrome tab can connect to it.
# 2.) We recieve the tracking data from Android Phone using UDP (port 10240)
#     When any packet is recieved, it is sent to the chrome tab via Web Socket.

import logging

logging.basicConfig(filename='log.txt', level=logging.DEBUG)
logging.debug('-------------------\n')

import sys
import json
import struct
import socket
import threading
import time
from websocket_server import WebsocketServer

subscribedClient = -1
handshakeComplete = False

def error_handler(type, value, tb):
	logging.debug("Uncaught exception: {0}".format(str(value)))
	
sys.excepthook = error_handler

def send_message(MSG_DICT):
	msg_json = json.dumps(MSG_DICT, separators=(",", ":"))
	msg_json_utf8 = msg_json.encode("utf-8")
	sys.stdout.buffer.write(struct.pack("i", len(msg_json_utf8)))
	sys.stdout.buffer.write(msg_json_utf8)
	sys.stdout.flush()

def read_message():
	text_length_bytes = sys.stdin.buffer.read(4)
	text_length = struct.unpack("i", text_length_bytes)[0]
	text_undecoded = sys.stdin.buffer.read(text_length).decode("utf-8")
	return text_undecoded

def listenToHandshake():
	logging.debug("listenToHandshake")
	global handshakeComplete
	message = read_message()
	logging.debug("message" + message)
	if message == '"HANDSHAKE_ACK"':
		send_message('HANDSHAKE_COMPLETE')
		handshakeComplete = True
		return True

def dispatchPacket(data):
	global subscribedClient, server
	if subscribedClient != -1:
		server.send_message(subscribedClient,data)

def captureUdpPackets():
	logging.debug("captureUdpPackets:started")
	while subscribedClient != -1:
		data, addr = s.recvfrom(port)
		dispatchPacket(data.decode('utf-8'))
	logging.debug("captureUdpPackets:ended")

def ws_new_client(client, server):
	global subscribedClient
	server.send_message(client, "iHello JS Client!")
	logging.info("newClient")
	subscribedClient = client

def ws_client_left():
	global subscribedClient
	subscribedClient = -1

def ws_message_received(client, server, message):
	logging.debug("message_recieved" + message)
	if message == "FEED_ME":
		threading.Thread(target=captureUdpPackets).start()
	else:
		logging.info("Unknown message from client:" + str(message))
		
		
# Create a Datagram Socket to recieve UDP packets (gyroscope data from phone)
port = 10240
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
s.bind(('', port))

# Send Handshake Request to Chrome Extension
send_message('HANDSHAKE_REQ')
threading.Thread(target=listenToHandshake).start()

# Wait for 2 seconds while the listenToHandshake thread recieves 
# a Handshake Acknowledgement from Chrome Extension
time.sleep(2)

if handshakeComplete == False:
	logging.debug("Exited, didn't recieve handshake acknowledge.")
	exit(0)

# Create WebSocket Server and set it's callback functions	
PORT = 9001
server = WebsocketServer(PORT)
server.set_fn_new_client(ws_new_client)
server.set_fn_client_left(ws_client_left)
server.set_fn_message_received(ws_message_received)
server.run_forever()