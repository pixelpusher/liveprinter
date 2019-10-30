outlets = 2;

function gcode(cmd)
{
	var ajaxreq;

	//create a XMLHttpRequest object
	ajaxreq = new XMLHttpRequest();
	ajaxreq.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
	
	var gcodereq = { "jsonrpc": "2.0", "id": 4, "method": "send-gcode","params": [cmd]};


	// others:
	// { "jsonrpc": "2.0", "id": 6, "method": "get-serial-ports","params": []}
	// { "jsonrpc": "2.0", "id": 5, "method": "set-serial-port","params": [ "COM3", 250000]}
	// { "jsonrpc": "2.0", "id": 2, "method": "close-serial-port","params": []}

	//set the HTTP message to be sent (usually a special formatted URL)
	ajaxreq.open("POST","localhost:8888/jsonrpc");
	ajaxreq.send(JSON.stringify(gcodereq));
	//set the callback function
	ajaxreq.onreadystatechange = function () {
		if(ajaxreq.readyState === 4 && ajaxreq.status === 200) {
			outlet(0,ajaxreq.responseText);
		  }	
	};
	//send the request
	ajaxreq.send();
}