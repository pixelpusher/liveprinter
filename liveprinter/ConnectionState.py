#
#  The current processing state of the backend.
#

from enum import IntEnum

class ConnectionState(IntEnum):
    closed = 0
    connecting = 1
    connected = 2
    busy = 3
    error = 4
