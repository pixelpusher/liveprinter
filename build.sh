#!/bin/sh

npm install
npm run build
rm -rf js
rm -rf anthill
rm *.json
rm *.sln
rm -rf testing
rm -rf reference
rm -rf liveprinter/anthill
rm -rf liveprinter/avr_isp
rm -rf node_modules

cd ..
zip -9 -o -v -r liveprinter-1.0.x.zip liveprinter/