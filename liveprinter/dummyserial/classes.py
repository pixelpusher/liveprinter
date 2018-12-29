#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""Dummy Serial Class Definitions"""

import logging
import logging.handlers
import sys
import time
import re

from serial.serialutil import SerialException, portNotOpenError

import dummyserial.constants

__author__ = 'Greg Albrecht <gba@orionlabs.io> then Evan Raskob <http://pixelist.info>'
__license__ = 'Apache License, Version 2.0'
__copyright__ = 'Copyright 2016 Orion Labs, Inc. and 2018 Evan Raskob'


class Serial(object):
    """
    Dummy (mock) serial port for testing purposes.

    Mimics the behavior of a serial port as defined by the
    `pySerial <http://pyserial.sourceforge.net/>`_ module.

    Args:
        * port:
        * timeout:

    Note:
    As the portname argument not is used properly, only one port on
    :mod:`dummyserial` can be used simultaneously.
    """

    _logger = logging.getLogger(__name__)
    if not _logger.handlers:
        _logger.setLevel(dummyserial.constants.LOG_LEVEL)
        _console_handler = logging.StreamHandler()
        _console_handler.setLevel(dummyserial.constants.LOG_LEVEL)
        _console_handler.setFormatter(dummyserial.constants.LOG_FORMAT)
        _logger.addHandler(_console_handler)
        _logger.propagate = False

    def __init__(self, *args, **kwargs):
        self._logger.debug('args=%s', args)
        self._logger.debug('kwargs=%s', kwargs)

        self._isOpen = True  # pylint: disable=C0103
        self._waiting_data = dummyserial.constants.NO_DATA_PRESENT

        self.port = kwargs['port']  # Serial port name.
        self.initial_port_name = self.port  # Initial name given to the port

        self.ds_responses = kwargs.get('ds_responses', {})
        self.timeout = kwargs.get(
            'timeout', dummyserial.constants.DEFAULT_TIMEOUT)
        self.baudrate = kwargs.get(
            'baudrate', dummyserial.constants.DEFAULT_BAUDRATE)

    def __repr__(self):
        """String representation of the DummySerial object."""
        return (
            "{0}.{1}<id=0x{2:x}, open={3}>(port={4!r}, timeout={5!r}, "
            "waiting_data={6!r})".format(
                self.__module__,
                self.__class__.__name__,
                id(self),
                self._isOpen,
                self.port,
                self.timeout,
                self._waiting_data,
            )
        )

    def open(self):
        """Open a (previously initialized) port."""
        self._logger.debug('Opening port')

        if self._isOpen:
            raise SerialException('Port is already open.')

        self._isOpen = True
        self.port = self.initial_port_name

    def close(self):
        """Close a port on dummy_serial."""
        self._logger.debug('Closing port')
        if self._isOpen:
            self._isOpen = False
        self.port = None

    def write(self, data):
        """
        Write to a port on dummy_serial.

        Args:
            data (string/bytes): data for sending to the port on
            dummy_serial. Will affect the response for subsequent read
            operations.

        Note that for Python2, the inputdata should be a **string**. For
        Python3 it should be of type **bytes**.
        """
        self._logger.debug('Writing (%s): "%s"', len(data), data)

        if not self._isOpen:
            raise portNotOpenError

        if sys.version_info[0] > 2:
            if not isinstance(data, bytes):
                raise dummyserial.exceptions.DSTypeError(
                    'The input must be type bytes. Given:' + repr(data))
            input_str = str(data, encoding='latin1')
        else:
            input_str = data

        # Look up which data that should be waiting for subsequent read
        # commands.

        # modified by Evan to use dict as a regex
        self._waiting_data = dummyserial.constants.NO_DATA_PRESENT

        for key, val in self.ds_responses.items():
            pattern = re.compile(key)
            if pattern.match(input_str):
                # self._logger.debug("response type {} is: {}".format(val, type(val)))
                # test if this is a function or a variable to return
                if callable(val):
                    try:
                        self._waiting_data = val()
                    except Exception as e:
                        Logger.log("d", "exception:{}".format(e))
                        return
                else:
                    self._waiting_data = val
                break

    def read(self, size=1):
        """
        Read size bytes from the Dummy Serial Responses.

        The response is dependent on what was written last to the port on
        dummyserial, and what is defined in the :data:`RESPONSES` dictionary.

        Args:
            size (int): For compability with the real function.

        Returns a **string** for Python2 and **bytes** for Python3.

        If the response is shorter than size, it will sleep for timeout.

        If the response is longer than size, it will return only size bytes.
        """
        self._logger.debug('Reading %s bytes.', size)

        if not self._isOpen:
            raise portNotOpenError

        if size < 0:
            raise dummyserial.exceptions.DSIOError(
                'The size to read must not be negative. ' +
                'Given: {!r}'.format(size))

        # Do the actual reading from the waiting data, and simulate the
        # influence of size.
        if self._waiting_data == dummyserial.constants.DEFAULT_RESPONSE:
            return_str = self._waiting_data
        elif size == len(self._waiting_data):
            return_str = self._waiting_data
            self._waiting_data = dummyserial.constants.NO_DATA_PRESENT
        elif size < len(self._waiting_data):
            self._logger.debug(
                'The size (%s) to read is smaller than the available data. ' +
                'Some bytes will be kept for later. ' +
                'Available (%s): "%s"',
                size, len(self._waiting_data), self._waiting_data
            )

            return_str = self._waiting_data[:size]
            self._waiting_data = self._waiting_data[size:]
        else:  # Wait for timeout - we asked for more data than available!
            self._logger.debug(
                'The size (%s) to read is larger than the available data. ' +
                'Will sleep until timeout. ' +
                'Available (%s): "%s"',
                size, len(self._waiting_data), self._waiting_data
            )

            time.sleep(self.timeout)
            return_str = self._waiting_data
            self._waiting_data = dummyserial.constants.NO_DATA_PRESENT

        self._logger.debug(
            'Read (%s): "%s"',
            len(return_str), return_str
        )

        if sys.version_info[0] > 2:  # Convert types to make it python3 compat.
            return bytes(return_str, encoding='latin1')
        else:
            return return_str

    ## FIXME
    def readline(self):
        """
        Read line of bytes from the Dummy Serial Responses.

        """
        # self._logger.debug('Reading line')

        if not self._isOpen:
            raise portNotOpenError

        # Do the actual reading from the waiting data, and simulate the
        # influence of size.
        if len(self._waiting_data) < 1:
            return_str = dummyserial.constants.NO_DATA_PRESENT
        else:
            return_str = self._waiting_data # keep in original format, might be bytes!
            self._waiting_data = dummyserial.constants.NO_DATA_PRESENT

        if return_str:
            self._logger.debug(
                'Read ({}): "{}"'.format(len(return_str), return_str)
            )
        return return_str


    def out_waiting(self):  # pylint: disable=C0103
        """Returns length of waiting output data."""
        return len(self._waiting_data)

    outWaiting = out_waiting  # pyserial 2.7 / 3.0 compat.
