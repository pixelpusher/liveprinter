
//await repeat(notes.length, async (i) => {

# mov2 x:lp.maxx*0.55 y:lp.maxy*0.65 | speed "C6" | unretract | turnto 0

await repeat(steps, async (i) => {
	await drawSeg();
  //let n = notes[i];
} );
             
# retract | tsp 80 | up 0.2
//03/26/2023, 19:44:22

const smallL = lp.parseAsTime("1/24b");
const bigL = lp.parseAsTime("1/2b");
const steps = 12;  // 64 steps to 2PI or a full rotation
const PI = Math.PI;
const TAU = 2*PI;
const sin = Math.sin;
const cos = Math.cos;
const abs = Math.abs;

loginfo(bigL);

let baseAngle = TAU/steps;

let prevTheta = 0,
    blendAmt = 0.25;

async function drawSeg() {
	let theta = PI/8*cos(lp.time/130+PI/15) +
      PI/6*cos(lp.time/120+PI/4.3) +
      PI/8*cos(lp.time/3.2) - 
      PI/4*sin(lp.time*cos(lp.time*PI/3)/12.2);

	theta = (1-blendAmt)*theta + blendAmt*prevTheta;
	prevTheta = theta;
  
   theta = PI/4;

	if (theta > PI/8) {
     
      lp.turn(theta,true);

      await lp.drawtime(bigL);

      lp.turn(-theta,true);

      await lp.drawtime(smallL);

      lp.turn(theta+PI,true);
      await lp.drawtime(2*bigL);

      lp.turn(-theta - PI,true);
      await lp.drawtime(smallL);

      lp.turn(theta,true);
      await lp.drawtime(bigL);

      lp.turn(-theta,true);
	}
	else {
  		await lp.drawtime(2*smallL);
	}
    lp.turn(baseAngle,true);
  //let m = 6;
  
  //lp.turn(baseAngle+(PI/64)*cos(m*PI*(timeCount/60))*sin(m*PI*(lp.time/60)));
  //if (dir > 2*PI) {
  //  dir %= 2*PI;
    //baseAngle -= (PI/steps)/12;
  //}

	await lp.drawtime(8*smallL);
}



//await repeat(notes.length, async (i) => {

# mov2 x:lp.maxx*0.55 y:lp.maxy*0.65 | speed "C6" | unretract | turnto 0

await repeat(steps, async (i) => {
	await drawSeg();
  //let n = notes[i];
} );
             
# retract | tsp 80 | up 0.2
//03/26/2023, 19:44:45
const smallL = lp.parseAsTime("1/24b");
const bigL = lp.parseAsTime("1/2b");
const steps = 12;  // 64 steps to 2PI or a full rotation
const PI = Math.PI;
const TAU = 2*PI;
const sin = Math.sin;
const cos = Math.cos;
const abs = Math.abs;

loginfo(bigL);

let baseAngle = TAU/steps;

let prevTheta = 0,
    blendAmt = 0.25;

async function drawSeg() {
	let theta = PI/8*cos(lp.time/130+PI/15) +
      PI/6*cos(lp.time/120+PI/4.3) +
      PI/8*cos(lp.time/3.2) - 
      PI/4*sin(lp.time*cos(lp.time*PI/3)/12.2);

	theta = (1-blendAmt)*theta + blendAmt*prevTheta;
	prevTheta = theta;
  
   theta = PI/4;

	if (theta > PI/8) {
     
      lp.turn(theta,true);

      await lp.drawtime(bigL);

      lp.turn(-theta,true);

      await lp.drawtime(smallL);

      lp.turn(theta+PI,true);
      await lp.drawtime(2*bigL);

      lp.turn(-theta - PI,true);
      await lp.drawtime(smallL);

      lp.turn(theta,true);
      await lp.drawtime(bigL);

      lp.turn(-theta,true);
	}
	else {
  		await lp.drawtime(2*smallL);
	}
    lp.turn(baseAngle,true);
  //let m = 6;
  
  //lp.turn(baseAngle+(PI/64)*cos(m*PI*(timeCount/60))*sin(m*PI*(lp.time/60)));
  //if (dir > 2*PI) {
  //  dir %= 2*PI;
    //baseAngle -= (PI/steps)/12;
  //}

	await lp.drawtime(8*smallL);
}


