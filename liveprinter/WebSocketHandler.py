"""
Implements websockets server
"""

import json
import datetime
import os.path
import tornado.escape
import tornado.ioloop
import tornado.websocket
from jsonrpc import JSONRPCResponseManager, Dispatcher, dispatcher
from jsonrpc.jsonrpc2 import JSONRPC20Request
from UM.Logger import Logger


class WebSocketHandler(tornado.websocket.WebSocketHandler):

    """
    Handles all websocket communication with clients.
    Uses `json-rpc <https://pypi.python.org/pypi/json-rpc/>`_ to map messages
    to methods and generate valid JSON-RPC 2.0 responses.
    """

    clients = set()
    cache = []
    cache_size = 200
    
    def __init__(self, *args, **kwargs):       
        super().__init__(*args, **kwargs)
        
        Logger.log("d","Websockethandler initialised")


    @classmethod
    def update_cache(cls, msg):
        cls.cache.append(msg)
        if len(cls.cache) > cls.cache_size:
            cls.cache = cls.cache[-cls.cache_size:]

    @classmethod
    def send_updates(cls, msg):
        Logger.log("i","sending message to %d clients", len(cls.clients))
        for client in cls.clients:
            try:
                client.write_message(msg)
            except:
                Logger.log("e","Error sending message {}".format(msg), exc_info=True)

    def check_origin(self, origin):
        return True

    def open(self):
        Logger.log("d",'New connection from {0}'.format(self.request.remote_ip))
        WebSocketHandler.clients.add(self)

    def on_close(self):
        Logger.log("d", 'Connection closed to {0}'.format(self.request.remote_ip))
        WebSocketHandler.clients.remove(self)
    
    def on_message(self, message):
        ## Passes an incoming JSON-RPC message to the dispatcher for processing.
        
        Logger.log("d", 'Message received from {0}: {1}'.format(
            self.request.remote_ip, message[:140]))

        parsed = tornado.escape.json_decode(message)

        ## dirty type testing...

        #data = None
        #try:
        #    # data = json.loads(parsed)
        #    data = json.loads(message)
        #except:
        #    Logger.log("e", "could not load json for {}".format(parsed))
        #try:
        #    JSONRPC20Request.from_data(data)
        #except Exception as e:
        #    Logger.log("e", "could not make json 2.0 request for {} : {}".format(parsed,repr(e)))

        Logger.log("d", 'Message parsed to {0}'.format(parsed))

        # note: the dispatcher functions are mapped in the main server
        handled_response = JSONRPCResponseManager.handle(message, dispatcher)
        
        Logger.log("d",'Sending response to {0}: {1}'.format(
            self.request.remote_ip, str(handled_response.json)))

        result = ""  # message to broadcast to clients

        # test for error
        if handled_response.error:
            # TODO: remove debugging code
            # Logger.log('e', 'JSON RPC Error sent: {}'.format(handled_response.json))
            Logger.log('e', 'JSON RPC Error sent: {}'.format(handled_response.error))
            result = handled_response.error

        else:
            # successful response
            result = handled_response.result
            Logger.log('i', 'JSON RPC response sent: {}'.format(result))

            result['html'] = tornado.escape.to_basestring(
                self.render_string("message.html", message=handled_response.data)
            )

        # update all clients
        WebSocketHandler.send_updates(result)
