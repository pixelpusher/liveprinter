<a name="module_Editor"></a>

## Editor
Code editing functionality for LivePrinter.


* [Editor](#module_Editor)
    * [~$](#module_Editor..$)
    * [~recordCode(gcode)](#module_Editor..recordCode)
    * [~recordGCode(editor, gcode)](#module_Editor..recordGCode)
    * [~runCode(editor, callback)](#module_Editor..runCode) ⇒ <code>Boolean</code>
    * [~storageAvailable(type)](#module_Editor..storageAvailable) ⇒ <code>Boolean</code>
    * [~init()](#module_Editor..init) ⇒ <code>PromiseFulfilledResult</code>

<a name="module_Editor..$"></a>

### Editor~$
JQuery reference

**Kind**: inner constant of [<code>Editor</code>](#module_Editor)  
<a name="module_Editor..recordCode"></a>

### Editor~recordCode(gcode)
Log code log to history editor window of choice

**Kind**: inner method of [<code>Editor</code>](#module_Editor)  

| Param | Type |
| --- | --- |
| gcode | <code>String</code> | 

<a name="module_Editor..recordGCode"></a>

### Editor~recordGCode(editor, gcode)
Log GCode log to history window of choice

**Kind**: inner method of [<code>Editor</code>](#module_Editor)  

| Param | Type |
| --- | --- |
| editor | <code>Editor</code> | 
| gcode | <code>Array</code> \| <code>String</code> | 

<a name="module_Editor..runCode"></a>

### Editor~runCode(editor, callback) ⇒ <code>Boolean</code>
This function takes the highlighted "local" code from the editor and runs the compiling and error-checking functions.

**Kind**: inner method of [<code>Editor</code>](#module_Editor)  
**Returns**: <code>Boolean</code> - success  

| Param | Type |
| --- | --- |
| editor | <code>Editor</code> | 
| callback | <code>function</code> | 

<a name="module_Editor..storageAvailable"></a>

### Editor~storageAvailable(type) ⇒ <code>Boolean</code>
Local Storage for saving/loading documents.
Default behaviour is loading the last edited session.

**Kind**: inner method of [<code>Editor</code>](#module_Editor)  
**Returns**: <code>Boolean</code> - true or false, if storage is available  
**See**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>String</code> | type (global key in window object) for storage object |

<a name="module_Editor..init"></a>

### Editor~init() ⇒ <code>PromiseFulfilledResult</code>
Initialise editors and events, etc.

**Kind**: inner method of [<code>Editor</code>](#module_Editor)  
