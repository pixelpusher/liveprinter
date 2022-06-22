## Modules

<dl>
<dt><a href="#module_Comms">Comms</a></dt>
<dd><p>Communications between server, GUI, and events functionality for LivePrinter.</p>
</dd>
</dl>

## Members

<dl>
<dt><a href="#comms_vars">comms:vars</a></dt>
<dd><p>Global variables object collection.</p>
</dd>
<dt><a href="#comms_getPrinterState">comms:getPrinterState</a> ⇒ <code>Object</code></dt>
<dd><p>Get the connection state of the printer and display in the GUI (the listener will take care of that)</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#comms_getLimiter">comms:getLimiter()</a> ⇒ <code>Object</code></dt>
<dd><p>HACK -- needs fixing! Gives access to limiter queue. Dangerous.</p>
</dd>
<dt><a href="#comms_scheduleFunction">comms:scheduleFunction(...args)</a> ⇒ <code>PromiseFulfilledResult</code></dt>
<dd><p>Schedules code to run in the async queue (e.g. limiter)</p>
</dd>
<dt><a href="#comms_schedule">comms:schedule(...args)</a> ⇒ <code>PromiseFulfilledResult</code></dt>
<dd><p>Quickly schedules code to run in the async queue (e.g. limiter) with default args</p>
</dd>
<dt><a href="#comms_globalEval">comms:globalEval(code, line, globally)</a></dt>
<dd><p>Evaluate the code in local (within closure) or global space according to the current editor mode (javascript/python).</p>
</dd>
<dt><a href="#comms_getQueued">comms:getQueued()</a> ⇒ <code>Number</code></dt>
<dd><p>Get number of queued functions in limiter</p>
</dd>
<dt><a href="#comms_restartLimiter">comms:restartLimiter()</a></dt>
<dd><p>Effectively cleares the current queue of events and restarts it. Should cancel all non-running actions.</p>
</dd>
<dt><a href="#comms_sendJSONRPC">comms:sendJSONRPC(request)</a> ⇒ <code>Object</code></dt>
<dd><p>Send a JSON-RPC request to the backend, get a response back. See below implementations for details.</p>
</dd>
<dt><a href="#comms_setline">comms:setline(int)</a> ⇒ <code>Object</code></dt>
<dd><p>Set the current commands line number on the printer (in case of resend). Probably doesn&#39;t work?</p>
</dd>
<dt><a href="#comms_sendGCodeRPC">comms:sendGCodeRPC(gcode)</a> ⇒ <code>Object</code></dt>
<dd><p>Send GCode to the server via json-rpc over ajax.</p>
</dd>
<dt><a href="#comms_scheduleGCode">comms:scheduleGCode(gcode, priority)</a> ⇒ <code>Object</code></dt>
<dd><p>Schedule GCode to be sent to the server, in order, using the limiter via json-rpc over ajax.</p>
</dd>
<dt><a href="#comms_onPosition">comms:onPosition(listener)</a></dt>
<dd><p>Add listener function to run when &#39;position&#39; events are received from the printer server (these are scheduled to be run by the limiter)</p>
</dd>
<dt><a href="#comms_offPosition">comms:offPosition(listener)</a></dt>
<dd><p>Remove a listener function from &#39;position&#39; events queue</p>
</dd>
<dt><a href="#comms_onCodeDone">comms:onCodeDone(listener)</a></dt>
<dd><p>Add listener function to run when &#39;codeDone&#39; events are received from the limiter (not scheduled to be run by the limiter!)</p>
</dd>
<dt><a href="#comms_offCodeQueued">comms:offCodeQueued(listener)</a></dt>
<dd><p>Remove a listener from &#39;codeDone&#39; events queue</p>
</dd>
<dt><a href="#comms_onCodeQueued">comms:onCodeQueued(listener)</a></dt>
<dd><p>Add listener function to run when &#39;codeQueued&#39; events are received from the limiter (not scheduled to be run by the limiter!)</p>
</dd>
<dt><a href="#comms_offCodeQueued">comms:offCodeQueued(listener)</a></dt>
<dd><p>Remove a listener from &#39;codeQueued&#39; events queue</p>
</dd>
<dt><a href="#comms_onOk">comms:onOk(listener)</a></dt>
<dd><p>Add listener function to run when &#39;position&#39; events are received from the printer server (these are scheduled to be run by the limiter)</p>
</dd>
<dt><a href="#comms_offOk">comms:offOk(listener)</a></dt>
<dd><p>Remove listener function from ok events queue</p>
</dd>
<dt><a href="#comms_okEvent">comms:okEvent(data)</a> ⇒ <code>Boolean</code></dt>
<dd><p>Trigger the ok event for all ok listeners</p>
</dd>
<dt><a href="#comms_onOther">comms:onOther(listener)</a></dt>
<dd><p>Add listener function to run when &#39;other&#39; (unmatched) events are received from the printer server (these are not scheduled to be run by the limiter)</p>
</dd>
<dt><a href="#comms_offOther">comms:offOther(listener)</a></dt>
<dd><p>Remove listener function from &#39;other&#39; (unmatched) events queue</p>
</dd>
<dt><a href="#comms_clearEvent">comms:clearEvent(eventType)</a></dt>
<dd><p>Clear all listeners for a specific event type: codeDone, ok, other, codeQueued, position.</p>
</dd>
<dt><a href="#comms_handleGCodeResponse">comms:handleGCodeResponse(res)</a> ⇒ <code>Boolean</code></dt>
<dd><p>Handles logging of a GCode response from the server</p>
</dd>
</dl>

<a name="module_Comms"></a>

## Comms
Communications between server, GUI, and events functionality for LivePrinter.

**Version**: 1.0  
**Author**: Evan Raskob <evanraskob+nosp4m@gmail.com>  
**License**: Copyright (c) 2022 Evan Raskob and others
Licensed under the GNU Affero 3.0 License (the &quot;License&quot;); you may
not use this file except in compliance with the License. You may obtain
a copy of the License at

    [https://www.gnu.org/licenses/gpl-3.0.en.html](https://www.gnu.org/licenses/gpl-3.0.en.html)

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an &quot;AS IS&quot; BASIS, WITHOUT
WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
License for the specific language governing permissions and limitations
under the License.  

* [Comms](#module_Comms)
    * [~limiter](#module_Comms..limiter)
    * [~initLimiter()](#module_Comms..initLimiter) ⇒ <code>Bottleneck</code>
    * [~stopLimiter()](#module_Comms..stopLimiter)

<a name="module_Comms..limiter"></a>

### Comms~limiter
Private async queue (limiter) instance.

**Kind**: inner property of [<code>Comms</code>](#module_Comms)  
<a name="module_Comms..initLimiter"></a>

### Comms~initLimiter() ⇒ <code>Bottleneck</code>
Creates a new limiter instance and returns it.

**Kind**: inner method of [<code>Comms</code>](#module_Comms)  
**Returns**: <code>Bottleneck</code> - Limiter queue instance  
<a name="module_Comms..stopLimiter"></a>

### Comms~stopLimiter()
Stops and clears the current queue of events. Should cancel all non-running actions. No new events can be added after this.

**Kind**: inner method of [<code>Comms</code>](#module_Comms)  
<a name="comms_vars"></a>

## comms:vars
Global variables object collection.

**Kind**: global variable  
<a name="comms_getPrinterState"></a>

## comms:getPrinterState ⇒ <code>Object</code>
Get the connection state of the printer and display in the GUI (the listener will take care of that)

**Kind**: global variable  
**Returns**: <code>Object</code> - result Returns json object containing result  
<a name="comms_getLimiter"></a>

## comms:getLimiter() ⇒ <code>Object</code>
HACK -- needs fixing! Gives access to limiter queue. Dangerous.

**Kind**: global function  
**Returns**: <code>Object</code> - BottleneckJS limiter object. Dangerous.  
<a name="comms_scheduleFunction"></a>

## comms:scheduleFunction(...args) ⇒ <code>PromiseFulfilledResult</code>
Schedules code to run in the async queue (e.g. limiter)

**Kind**: global function  
**Returns**: <code>PromiseFulfilledResult</code> - From the docs: schedule() returns a promise that will be executed according to the rate limits.  

| Param | Type | Description |
| --- | --- | --- |
| ...args | <code>any</code> | Limiter options object (see Bottleneckjs) and list of other function arguments |

<a name="comms_schedule"></a>

## comms:schedule(...args) ⇒ <code>PromiseFulfilledResult</code>
Quickly schedules code to run in the async queue (e.g. limiter) with default args

**Kind**: global function  
**Returns**: <code>PromiseFulfilledResult</code> - From the docs: schedule() returns a promise that will be executed according to the rate limits.  

| Param | Type | Description |
| --- | --- | --- |
| ...args | <code>any</code> | Limiter options object (see Bottleneckjs) and list of other function arguments |

<a name="comms_globalEval"></a>

## comms:globalEval(code, line, globally)
Evaluate the code in local (within closure) or global space according to the current editor mode (javascript/python).

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| code | <code>string</code> | to evaluate |
| line | <code>integer</code> | line number for error displaying |
| globally | <code>Boolean</code> | true if executing in global space, false (normal) if executing within closure to minimise side-effects |

<a name="comms_getQueued"></a>

## comms:getQueued() ⇒ <code>Number</code>
Get number of queued functions in limiter

**Kind**: global function  
**Returns**: <code>Number</code> - number of queued functions to run  
<a name="comms_restartLimiter"></a>

## comms:restartLimiter()
Effectively cleares the current queue of events and restarts it. Should cancel all non-running actions.

**Kind**: global function  
<a name="comms_sendJSONRPC"></a>

## comms:sendJSONRPC(request) ⇒ <code>Object</code>
Send a JSON-RPC request to the backend, get a response back. See below implementations for details.

**Kind**: global function  
**Returns**: <code>Object</code> - response JSON-RPC response object  

| Param | Type | Description |
| --- | --- | --- |
| request | <code>Object</code> | JSON-RPC formatted request object |

<a name="comms_setline"></a>

## comms:setline(int) ⇒ <code>Object</code>
Set the current commands line number on the printer (in case of resend). Probably doesn't work?

**Kind**: global function  
**Returns**: <code>Object</code> - result Returns json object containing result  

| Param | Type | Description |
| --- | --- | --- |
| int | <code>int</code> | new line number |

<a name="comms_sendGCodeRPC"></a>

## comms:sendGCodeRPC(gcode) ⇒ <code>Object</code>
Send GCode to the server via json-rpc over ajax.

**Kind**: global function  
**Returns**: <code>Object</code> - result Returns json object containing result  

| Param | Type | Description |
| --- | --- | --- |
| gcode | <code>string</code> | gcode to send |

<a name="comms_scheduleGCode"></a>

## comms:scheduleGCode(gcode, priority) ⇒ <code>Object</code>
Schedule GCode to be sent to the server, in order, using the limiter via json-rpc over ajax.

**Kind**: global function  
**Returns**: <code>Object</code> - result Returns json promise object containing printer response  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| gcode | <code>string</code> |  | gcode to send |
| priority | <code>Integer</code> | <code>4</code> | Priority in queue (0-9 where 0 is highest) |

<a name="comms_onPosition"></a>

## comms:onPosition(listener)
Add listener function to run when 'position' events are received from the printer server (these are scheduled to be run by the limiter)

**Kind**: global function  

| Param | Type |
| --- | --- |
| listener | <code>function</code> | 

<a name="comms_offPosition"></a>

## comms:offPosition(listener)
Remove a listener function from 'position' events queue

**Kind**: global function  

| Param | Type |
| --- | --- |
| listener | <code>function</code> | 

<a name="comms_onCodeDone"></a>

## comms:onCodeDone(listener)
Add listener function to run when 'codeDone' events are received from the limiter (not scheduled to be run by the limiter!)

**Kind**: global function  

| Param | Type |
| --- | --- |
| listener | <code>function</code> | 

<a name="comms_offCodeQueued"></a>

## comms:offCodeQueued(listener)
Remove a listener from 'codeDone' events queue

**Kind**: global function  

| Param | Type |
| --- | --- |
| listener | <code>function</code> | 

<a name="comms_onCodeQueued"></a>

## comms:onCodeQueued(listener)
Add listener function to run when 'codeQueued' events are received from the limiter (not scheduled to be run by the limiter!)

**Kind**: global function  

| Param | Type |
| --- | --- |
| listener | <code>function</code> | 

<a name="comms_offCodeQueued"></a>

## comms:offCodeQueued(listener)
Remove a listener from 'codeQueued' events queue

**Kind**: global function  

| Param | Type |
| --- | --- |
| listener | <code>function</code> | 

<a name="comms_onOk"></a>

## comms:onOk(listener)
Add listener function to run when 'position' events are received from the printer server (these are scheduled to be run by the limiter)

**Kind**: global function  

| Param | Type |
| --- | --- |
| listener | <code>function</code> | 

<a name="comms_offOk"></a>

## comms:offOk(listener)
Remove listener function from ok events queue

**Kind**: global function  

| Param | Type |
| --- | --- |
| listener | <code>function</code> | 

<a name="comms_okEvent"></a>

## comms:okEvent(data) ⇒ <code>Boolean</code>
Trigger the ok event for all ok listeners

**Kind**: global function  
**Returns**: <code>Boolean</code> - success  

| Param | Type |
| --- | --- |
| data | <code>Anything</code> | 

<a name="comms_onOther"></a>

## comms:onOther(listener)
Add listener function to run when 'other' (unmatched) events are received from the printer server (these are not scheduled to be run by the limiter)

**Kind**: global function  

| Param | Type |
| --- | --- |
| listener | <code>function</code> | 

<a name="comms_offOther"></a>

## comms:offOther(listener)
Remove listener function from 'other' (unmatched) events queue

**Kind**: global function  

| Param | Type |
| --- | --- |
| listener | <code>function</code> | 

<a name="comms_clearEvent"></a>

## comms:clearEvent(eventType)
Clear all listeners for a specific event type: codeDone, ok, other, codeQueued, position.

**Kind**: global function  

| Param | Type |
| --- | --- |
| eventType | <code>\*</code> | 

<a name="comms_handleGCodeResponse"></a>

## comms:handleGCodeResponse(res) ⇒ <code>Boolean</code>
Handles logging of a GCode response from the server

**Kind**: global function  
**Returns**: <code>Boolean</code> - whether handled or not  

| Param | Type |
| --- | --- |
| res | <code>Object</code> | 

