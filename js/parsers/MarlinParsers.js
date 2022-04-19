import { decimalPlaces } from "liveprinter-utils";

// from https://github.com/cncjs/cncjs/blob/30c294f0ffb304441304aaa6b75a728f3a096827/src/server/controllers/Marlin/MarlinLineParserResultPosition.js

export class MarlinLineParserResultPosition {
    // X:0.00 Y:0.00 Z:0.00 E:0.00 Count X:0 Y:0 Z:0
    static parse(line) {
        const r = line.match(/^(?:(?:X|Y|Z|E):[0-9\.\-]+\s*)+/i);
        if (!r) {
            return null;
        }

        const payload = {
            pos: {}
        };
        const pattern = /((X|Y|Z|E):[0-9\.\-]+)/gi;
        const params = r[0].match(pattern);

        for (let param of params) {
            const nv = param.match(/([a-z]+):([0-9\.\-]+)/i);
            if (nv) {
                const axis = nv[1].toLowerCase();
                const pos = nv[2];
                const digits = decimalPlaces(pos);
                payload.pos[axis] = Number(pos).toFixed(digits);
            }
        }

        return {
            type: MarlinLineParserResultPosition,
            payload: payload
        };
    }
}

//  from https://github.com/cncjs/cncjs/blob/f33e6464e93de65b53aa4160676b8ee51ed4dcc6/src/server/controllers/Marlin/MarlinLineParserResultTemperature.js
export class MarlinLineParserResultTemperature {
    // ok T:0
    // ok T:293.0 /0.0 B:25.9 /0.0 @:0 B@:0
    // ok T:293.0 /0.0 B:25.9 /0.0 T0:293.0 /0.0 T1:100.0 /0.0 @:0 B@:0 @0:0 @1:0
    // ok T:293.0 /0.0 (0.0) B:25.9 /0.0 T0:293.0 /0.0 (0.0) T1:100.0 /0.0 (0.0) @:0 B@:0 @0:0 @1:0
    // ok T:293.0 /0.0 (0.0) B:25.9 /0.0 T0:293.0 /0.0 (0.0) T1:100.0 /0.0 (0.0) @:0 B@:0 @0:0 @1:0 W:?
    // ok T:293.0 /0.0 (0.0) B:25.9 /0.0 T0:293.0 /0.0 (0.0) T1:100.0 /0.0 (0.0) @:0 B@:0 @0:0 @1:0 W:0
    //  T:293.0 /0.0 B:25.9 /0.0 @:0 B@:0
    //  T:293.0 /0.0 B:25.9 /0.0 T0:293.0 /0.0 T1:100.0 /0.0 @:0 B@:0 @0:0 @1:0
    //  T:293.0 /0.0 (0.0) B:25.9 /0.0 T0:293.0 /0.0 (0.0) T1:100.0 /0.0 (0.0) @:0 B@:0 @0:0 @1:0
    static parse(line) {
        let r = line.match(/^(ok)?\s+T:[0-9\.\-]+/i);
        if (!r) {
            return null;
        }

        const payload = {
            ok: line.startsWith('ok'),
            extruder: {},
            heatedBed: {}
        };

        const re = /(?:(?:(T|B|T\d+):([0-9\.\-]+)\s+\/([0-9\.\-]+)(?:\s+\((?:[0-9\.\-]+)\))?)|(?:(@|B@|@\d+):([0-9\.\-]+))|(?:(W):(\?|[0-9]+)))/ig;

        while ((r = re.exec(line))) {
            const key = r[1] || r[4] || r[6];

            if (key === 'T') { // T:293.0 /0.0
                payload.extruder.deg = r[2];
                payload.extruder.degTarget = r[3];
                continue;
            }

            if (key === 'B') { // B:60.0 /0.0
                payload.heatedBed.deg = r[2];
                payload.heatedBed.degTarget = r[3];
                continue;
            }

            if (key === '@') { // @:127
                payload.extruder.power = r[5];
                continue;
            }

            if (key === 'B@') { // B@:127
                payload.heatedBed.power = r[5];
                continue;
            }

            // M109, M190: Print temp & remaining time every 1s while waiting
            if (key === 'W') { // W:?, W:9, ..., W:0
                payload.wait = r[7];
                continue;
            }

            // Hotends: T0, T1, ...
            // TODO
        }

        return {
            type: MarlinLineParserResultTemperature,
            payload: payload
        };
    }
};