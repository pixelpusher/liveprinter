# LivePrinter

*Livecoding meets 3D printing: experiments in live computational sculpting*

LivePrinter is a live, immediate system for combining the design and 3D printing of objects. Livecoding is used to control manufacturing precisely and procedurally with real-time flexibility. It brings improvisation and intuition to the act of making new computational forms.

The current software toolchains of 3D printing place the artist and designer at a difficult distance from the physical process of making.  There is little space for live improvisation and experimentation, especially with key properties that directly affect printing materials, like temperature and print speeds.

This project is about developing an open, interactively programmed 3D printing system for live computational making. The system extends digital printing and CNC machining into the realm of performance and also has potential in design and science pedagogy. 

## Design Principles
LivePrinter is designed to be:

  - *Flexible in deployment:* it should run on as many platforms as possible (Raspberry PI and other Linux and RTOS systems as well as standard computers such as desktops and laptops)
  - *Easy to hack:* the system architecture itself should not have too many dependencies or be generally too elaborate and complex.  It should stick to minimal, necessary features. It should favor less code files that do more over many files that interact in complex ways.  Important code that will edited often should be foregrounded.  This goes for the livecoding mini-languages as well.
  - *Allow for as little lag as possible:* physically making things happens in realtime, and even milliseconds count when you have melted plastic cooling.
  - *Be quick and intuitive to code:* the livecoding system should be as minimally-verbose as possible so it can be typed quickly. It should also provide enough core, useful functions so that common making actions are supported.
  - *Be as honest as possible with physical states:* the code should not try and cache physical properties like temperature and print head position, for example.  These relate to _instantaneous reality_ and should be treated as such.  A query/response system is one such solution.  
  - *Be understandable and appropriate for artists, designers, and non-technical people:* This is a (fun!) tool for making intuitively, and the langauge should reflect that, even at the expense of technical accuracy (of language).
  - *Be collaborative, social, performative:* Allow for others to take part in the making process, whether that's contributing directly to the livecoding or spectating as audience. 
 

## How It Works

LivePrinter is part web client and server for livecoding and part 3D printer host application on the back end.  On the front end, a user will livecode in a web browser (or other web client).  Their code is compiled into machine-appropriate G-Code and sent via JSON-RPC over websockets to the back end, where it is sent to the printer via a serial connection.  Responses from the printer are sent back to the web client.  

More than one person might be involved - the system is designed to support collaborative livecoding and potentially many 3D printers, as complex as that is!

The back-end web server and websockets service uses a Tornado server written in Python and a very-adapted version of [Cura's 3D printing driver](https://github.com/Ultimaker/Cura/tree/master/plugins/USBPrinting) that connects to a [Marlin Firmware](https://github.com/MarlinFirmware/Marlin) based 3D printer (currently tested on an [Ultimaker 2+](https://github.com/Ultimaker/Ultimaker2Marlin)). 

The front-end uses some Tornado templating and the usual JQuery/JavaScript.  Soon it will incorporate some other libraries...

## Similar Projects
* [OpenGB](https://github.com/amorphitec/opengb) has been an inspiration
* [Fabrica](https://github.com/arthurwolf/fabrica), a front-end for [Smoothieware](https://github.com/Smoothieware/Smoothieware) looks interesting.  Smoothieware integration might be nice, someday.

## TO DO
Currently, *everything!*

* Add a proper livecoding editor
* Choose/implement a livecoding language
* Support for MIDI to G-Code so you can make music with this
* Support for loading "code scores"

## Development
If you want to get involved, please give us a shout!  The more the better.

### License and Dependencies
LivePrinter is completely open source (AGPL 3.0). To summarise, it is built on and inspired by other open source projects:
* [Python](http://python.org)
* [Tornado web server](https://github.com/tornadoweb/tornado/)
* [Cura 3D printing software](https://github.com/Ultimaker/Cura/)
* [Uranium framework](https://github.com/Ultimaker/Uranium)
* [Marlin Firmware](https://github.com/MarlinFirmware/Marlin)
* [Ultimaker 2 Marlin variant](https://github.com/Ultimaker/Ultimaker2Marlin)

## Who is behind this
This project was started by [Evan Raskob](http://pixelist.info), [a veteran livecoder](https://www.youtube.com/playlist?list=PLuA35183Y-6-kdqw70KCm4knSm4lvvicu) currently lecturing at the Royal College of Art in London, and part-time PhD student in arts and Computational Technology at Goldsmiths.  It is the main part of his ongoing PhD study.  If you'd like to get in touch, please email him at evanraskob at gmail. 


