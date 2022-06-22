## Functions

<dl>
<dt><a href="#clearError">clearError()</a></dt>
<dd><p>Clear HTML of all displayed code errors</p>
</dd>
<dt><a href="#requestRepeat">requestRepeat(jsonObject, activeElem, delay, func, priority)</a> ⇒ <code>Object</code></dt>
<dd><p>RequestRepeat:
Utility to send a JSON-RPC request repeatedly whilst a &quot;button&quot; is pressed (i.e. it has an &quot;active&quot; CSS class)</p>
</dd>
<dt><a href="#tempHandler">tempHandler(data)</a> ⇒ <code>Boolean</code></dt>
<dd><p>Parse temperature response from printer firmware (Marlin)</p>
</dd>
<dt><a href="#attachScript">attachScript(url)</a></dt>
<dd><p>Attach an external script (and remove it quickly). Useful for adding outside libraries.</p>
</dd>
<dt><a href="#init">init(_scheduler)</a></dt>
<dd></dd>
</dl>

<a name="clearError"></a>

## clearError()
Clear HTML of all displayed code errors

**Kind**: global function  
<a name="requestRepeat"></a>

## requestRepeat(jsonObject, activeElem, delay, func, priority) ⇒ <code>Object</code>
RequestRepeat:Utility to send a JSON-RPC request repeatedly whilst a "button" is pressed (i.e. it has an "active" CSS class)

**Kind**: global function  
**Returns**: <code>Object</code> - JsonRPC response object  

| Param | Type | Description |
| --- | --- | --- |
| jsonObject | <code>Object</code> | JSON-RPC to repeat |
| activeElem | <code>JQuery</code> | JQuery element to check for active class (will keep running whist is has an "active" class) |
| delay | <code>Integer</code> | Delay between repeated successful calls in millis |
| func | <code>function</code> | Callback to run on result |
| priority | <code>Integer</code> | Priority of request in queue (0-9 where 0 is highest) |

<a name="tempHandler"></a>

## tempHandler(data) ⇒ <code>Boolean</code>
Parse temperature response from printer firmware (Marlin)

**Kind**: global function  
**Returns**: <code>Boolean</code> - true or false if parsed or not  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>String</code> | serial response from printer firmware (Marlin) |

<a name="attachScript"></a>

## attachScript(url)
Attach an external script (and remove it quickly). Useful for adding outside libraries.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| url | <code>String</code> | Url of script (or name, if in the static/misc folder) |

<a name="init"></a>

## init(_scheduler)
**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| _scheduler | <code>Scheduler</code> | Scheduler object to use for tasks, repeating events, etc. If  undefined, will crearte new one. |

