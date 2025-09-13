//Global Variables
const canvas =  document.getElementById("pose-canvas");
const ctx = canvas.getContext("2d");
const curveL = document.getElementById("curveL");
const ctx_curveL = curveL.getContext("2d");
const curveR = document.getElementById("curveR");
const ctx_curveR = curveR.getContext("2d");
const video = document.getElementById("pose-video");
dis = document.getElementById('dis');
spd = document.getElementById('Gait Speed')

const pose = new Pose({locateFile: (file) => {
    //return `assets/${file}`;
    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
}});

var flag = false, setflag = true;
var e = document.getElementById("dir");
var txt = e.value;
function change(){
    txt = e.value;
    ///console.log(txt);
}

var min = 0, sec = 0, tm1 = 0;
var flag=false;
var bezier_points = [];

var feedback_var = [];



const config ={
    ///video:{width:70, height:auto}
    video:{ width: 960, height: 540, fps: 30}
    //video:{ width: 480, height: 640, fps: 30}
    //video:{ width: 280, height: 440, fps: 30}
};



/////////////// Standing vs Walking /////////////////
// Add global vars at top
let standingWalkingWindow = [];
const WINDOW_SIZE = 7; // last 15 frames (~0.5s)
const STILLNESS_THRESHOLD = 0.035;
const SMOOTHING_FRAMES = 2;
let stateHistory = [];
const poseStatusEl = document.getElementById("pose-status");

// Utility: Euclidean distance
function euclidean(p1, p2) {
    const dx = p1.x - p2.x, dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

// Calculate stillness score
function getStillnessScore(windowFrames) {
    if (windowFrames.length < 2) return 0;

    const L_ANKLE = 27, R_ANKLE = 28, L_HIP = 23, R_HIP = 24, NOSE = 0;

    // Estimate height for normalization
    const nose = windowFrames[0][NOSE];
    const avgAnkle = {
        x: (windowFrames[0][L_ANKLE].x + windowFrames[0][R_ANKLE].x) / 2,
        y: (windowFrames[0][L_ANKLE].y + windowFrames[0][R_ANKLE].y) / 2
    };
    const height = Math.abs(nose.y - avgAnkle.y) * video.videoHeight;

    // 1. Horizontal ankle displacement difference (better gait signal)
    const anklePhaseDiff = [];
    for (let i = 1; i < windowFrames.length; i++) {
        const leftX = windowFrames[i][L_ANKLE].x * video.videoWidth;
        const rightX = windowFrames[i][R_ANKLE].x * video.videoWidth;
        const prevLeftX = windowFrames[i - 1][L_ANKLE].x * video.videoWidth;
        const prevRightX = windowFrames[i - 1][R_ANKLE].x * video.videoWidth;

        // Total horizontal motion
        const delta = (Math.abs(leftX - prevLeftX) + Math.abs(rightX - prevRightX)) / 2;
        anklePhaseDiff.push(delta);
    }
    const meanAnkleMotion = anklePhaseDiff.reduce((a, b) => a + b, 0) / anklePhaseDiff.length;

    // 2. Hip vertical bobbing
    const midHipYs = windowFrames.map(
        f => ((f[L_HIP].y + f[R_HIP].y) / 2) * video.videoHeight
    );
    const meanHip = midHipYs.reduce((a, b) => a + b, 0) / midHipYs.length;
    const varSum = midHipYs.reduce((s, v) => s + Math.pow(v - meanHip, 2), 0) / midHipYs.length;
    const hipStd = Math.sqrt(varSum);

    // Weighted score: more weight to ankle movement
    const w1 = 0.75, w2 = 0.25;
    return w1 * (meanAnkleMotion / height) + w2 * (hipStd / height);
}



/////////////// Standing vs Walking End /////////////////



function resetParam(button)
{
     
    //window.location.reload();
    min = 0;
    sec = 0;
    document.getElementById('time').innerHTML=min+":"+sec;
    document.getElementById("dir").value = "No";
    flag = false;
    txt = "No";
    bezier_points = [];
    console.log(bezier_points);
    button.innerHTML= "Start"; 
}

function setParam(button)
{
    // To set the parameters.

    ///console.log(txt)

    if (flag)
    {
        flag = false;
        button.innerHTML= "Start"; 
    } 
    else 
    {
        if(txt === "No")
        {
            ///console.log("'select' check")
            alert("Please select a direction of walking");
            button.innerHTML= "Start"; 
        }
        else
        {
            flag = true;
            timer()
            button.innerHTML= "Stop"; 
        }
           
    }
}

function timer()
{
     // Timer Function, Starts when video starts playing-> This fn has changed.

     var time = setInterval(function(){

        if(!flag){
            clearInterval(time)
        }
        
    	document.getElementById('time').innerHTML=min+":"+sec;
        sec++;

        if(sec == 60)
        {
            sec=0;
            min++;
        }
        
    }, 1000);
}


function distance(x1,y1,x2,y2){

    // calculate eucliedean distance between point(x1,y1) and (x2,y2)

    let a = x2-x1;
    let b = y2-y1;
    let result = Math.sqrt( a*a + b*b);

    return result;
}

function download_csv(){
    //define the heading for each row of the data
    var csv = 'time(ms), stepL, hsL, hsR, hipL.x, hipL.y, kneeL.x, kneeL.y, ankleL.x, ankleL.y, hipR.x, hipR.y, kneeR.x, kneeR.y, ankleR.x, ankleR.y, rk_ang, lk_ang, ra_ang, la_ang, hipR_ang, hipL_ang, shoulderL.x, shoulderL.y, shoulderR.x, shoulderR.y, 3shoulderL.x, 3shoulderL.y, 3shoulderL.z, 3shoulderR.x, 3shoulderR.y, 3shoulderR.z, 3hipL.x, 3hipL.y, 3hipL.z, 3hipR.x, 3hipR.y, 3hipR.z, 3kneeL.x, 3kneeL.y, 3kneeL.z, 3kneeR.x, 3kneeR.y, 3kneeR.z, 3ankleL.x, 3ankleL.y, 3ankleL.z, 3ankleR.x, 3ankleR.y, 3ankleR.z, 3heelL.x, 3heelL.y, 3heelL.z, 3heelR.x, 3heelR.y, 3heelR.z, 3footIndexL.x, 3footIndexL.y, 3footIndexL.z, 3footIndexR.x, 3footIndexR.y, 3footIndexR.z\n';
    
    //merge the data with CSV
    bezier_points.forEach(function(row) {
            csv += row.join(',');
            csv += "\n";
    });
 

   
    var hiddenElement = document.createElement('a');
    hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
    hiddenElement.target = '_blank';
    
    //provide the name for the CSV file to be downloaded
    hiddenElement.download = 'gaitData.csv';
    hiddenElement.click();
}



async function main()
{
    // Main function
    // Initialize required variables, load model, etc.
    const download = document.getElementById("dow");
    const setBttn = document.getElementById("bttn3");
    const resetBttn = document.getElementById("bttn4");

    setBttn.onclick = function(){
        setParam(setBttn)
    }

    resetBttn.onclick = function(){
        resetParam(setBttn)
    }

    download.onclick = function(){
        download_csv()
    }

    pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: true,
        smoothSegmentation: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

    pose.onResults(onResults);
    
    //video.src ="http://192.168.43.82:4747/"       //  IP web cam

    //video.playbackRate = 0.2;                // video File
    video.width = config.video.width;
    video.height= config.video.height;

    canvas.width = config.video.width;
    canvas.height = config.video.height;

    //for graph
    curveL.width = config.video.width;
    curveL.height = config.video.height;

    curveR.width = config.video.width;
    curveR.height = config.video.height;

    video.onloadedmetadata = function(e) {
        video.play();
    };


    //Text in canvas
    ctx_curveL.font = "50px Comic Sans MS";
    ctx_curveL.fillStyle = "red";
    ctx_curveL.fillText("Left Leg", 400, 50);

    
    ctx_curveR.font = "50px Comic Sans MS";
    ctx_curveR.fillStyle = "red";
    ctx_curveR.fillText("Right Leg", 400, 50);

    video.addEventListener("play",computeFrame);
}


function calculateAngle(x1,y1,x2,y2,x3,y3){  //Previously calculateHipAngle()
    //  Formula:   a^2 + b^2 - 2abCos(C) = c^2

    let a_sq = ((x2-x1)*(x2-x1)) + ((y2-y1)*(y2-y1));
    let b_sq = ((x3-x2)*(x3-x2)) + ((y3-y2)*(y3-y2));
    let c_sq = ((x3-x1)*(x3-x1)) + ((y3-y1)*(y3-y1));

    let value= (a_sq + b_sq - c_sq)/(2* Math.sqrt(a_sq)* Math.sqrt(b_sq) )
    let angle_rad = Math.acos(value)
    let angle = angle_rad *(180.0 / Math.PI)

    return angle // May be changed to (180 - angle)
}

function convTime(tim)
{
    tim /= 1000
    if(tim<0)
    {
        tim += 1
    }

    return tim
}


function onResults(results)
{
    // draw image frame,skeleton points
    // calculate right & left joint angles and display it

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    //console.log(results)


    if(results.poseLandmarks && results.poseWorldLandmarks)
    {

        results_cpy=results;
        ////console.log(results.poseLandmarks)
        let eyeL = results.poseLandmarks[2]
        let eyeR = results.poseLandmarks[5]
        let shoulderL = results.poseLandmarks[11]
        let shoulderR = results.poseLandmarks[12]
        let hipL = results.poseLandmarks[23]
        let hipR = results.poseLandmarks[24]
        let kneeL = results.poseLandmarks[25]
        let kneeR = results.poseLandmarks[26]
        let ankleL = results.poseLandmarks[27]
        let ankleR = results.poseLandmarks[28]
        let heelL = results.poseLandmarks[29]
        let heelR = results.poseLandmarks[30]
        let foot_indexR = results.poseLandmarks[32];
        let foot_indexL = results.poseLandmarks[31];
        
		//Spatial data
		let shoulderL3 = results.poseWorldLandmarks[11]
        let shoulderR3 = results.poseWorldLandmarks[12]
        let hipL3 = results.poseWorldLandmarks[23]
        let hipR3 = results.poseWorldLandmarks[24]
        let kneeL3 = results.poseWorldLandmarks[25]
        let kneeR3 = results.poseWorldLandmarks[26]
        let ankleL3 = results.poseWorldLandmarks[27]
        let ankleR3 = results.poseWorldLandmarks[28]
        let heelL3 = results.poseWorldLandmarks[29]
        let heelR3 = results.poseWorldLandmarks[30]
        let foot_indexR3 = results.poseWorldLandmarks[32];
        let foot_indexL3 = results.poseWorldLandmarks[31];



        /////////////// Standing vs Walking /////////////////

        if(flag){
        // ---------------- Standing vs Walking Detection ----------------

            const frameLandmarks = results.poseLandmarks.map(k => ({ x: k.x, y: k.y }));
            standingWalkingWindow.push(frameLandmarks);
            if (standingWalkingWindow.length > WINDOW_SIZE) standingWalkingWindow.shift();

            if (standingWalkingWindow.length >= 3) {
                const score = getStillnessScore(standingWalkingWindow);
                const currentState = (score < STILLNESS_THRESHOLD) ? "Standing" : "Walking";

                // If state changes, reset smoothing history
                if (stateHistory.length > 0 && stateHistory[stateHistory.length - 1] !== currentState) {
                    stateHistory = [];
                }

                // Smoothing: majority vote
                stateHistory.push(currentState);
                if (stateHistory.length > SMOOTHING_FRAMES) stateHistory.shift();
                const counts = stateHistory.reduce((m, s) => {
                    m[s] = (m[s] || 0) + 1;
                    return m;
                }, {});
                const smoothState = Object.keys(counts).reduce((a, b) =>
                    counts[a] > counts[b] ? a : b
                );

                // Update <h3> label
                poseStatusEl.innerHTML = `Status: <b>${smoothState}</b> (score: ${score.toFixed(3)})`;
                poseStatusEl.style.color = smoothState === "Walking" ? "green" : "orange";
            }

        }


        /////////////// Standing vs Walking End /////////////////


        if(txt === "LR"){
            hsL = heelL.x - hipL.x;
            hsR = heelR.x - hipR.x;  //Left to Right walk
        }
        if( txt === "RL"){
            hsL = hipL.x - heelL.x;
            hsR = hipR.x - heelR.x;
        }

        
            if(flag)
            {
                    //Storing values in csv for Bezier curves
                    var tm = new Date();
                        

                    var data = [];
                    data.push(tm.getMilliseconds());
                    data.push(ankleL3.x - ankleR3.x)
                    //data.push(tm.getMilliseconds() - tm1);
                    //data.push(tm.getSeconds());
                    data.push(hsL*video.width);  
                    data.push(hsR*video.width);
	

                    //Storing values in csv for Bezier curves
                    data.push(hipL.x*video.width)
                    data.push(hipL.y*video.height)
                    data.push(kneeL.x*video.width)
                    data.push(kneeL.y*video.height)
                    data.push(ankleL.x*video.width)
                    data.push(ankleL.y*video.height)

                    data.push(hipR.x*video.width)
                    data.push(hipR.y*video.height)
                    data.push(kneeR.x*video.width)
                    data.push(kneeR.y*video.height)
                    data.push(ankleR.x*video.width)
                    data.push(ankleR.y*video.height)
        

                    
                    //Left leg bezier curves
                    ctx_curveL.beginPath();
                    ctx_curveL.moveTo(hipL.x*video.width, hipL.y*video.height );
                    ctx_curveL.quadraticCurveTo(kneeL.x*video.width, kneeL.y*video.height, ankleL.x*video.width, ankleL.y*video.height);
                    ctx_curveL.stroke();

                
                    //Right leg Bezier curves
                    ctx_curveR.beginPath();
                    ctx_curveR.moveTo(hipR.x*video.width, hipR.y*video.height );
                    ctx_curveR.quadraticCurveTo(kneeR.x*video.width, kneeR.y*video.height, ankleR.x*video.width, ankleR.y*video.height);
                    ctx_curveR.stroke();


                    //Right Knee Angle  & Left Knee Angle 
                    let rk_val = (180 -  calculateAngle(hipR.x, hipR.y, kneeR.x, kneeR.y, ankleR.x, ankleR.y)).toFixed(2)
                    let lk_val = (180 -  calculateAngle(hipL.x, hipL.y, kneeL.x, kneeL.y, ankleL.x, ankleL.y)).toFixed(2)
                    document.getElementById("k-angle-R").innerHTML = rk_val;
                    document.getElementById("k-angle-L").innerHTML = lk_val;

                    // Right Ankle Angle &  Left Ankle Angle  //ra_val - 90 should be there
                    let ra_val = (calculateAngle(kneeR.x, kneeR.y, ankleR.x, ankleR.y,foot_indexR.x, foot_indexR.y) - 90).toFixed(2);
                    let la_val = (calculateAngle(kneeL.x, kneeL.y, ankleL.x, ankleL.y,foot_indexL.x, foot_indexL.y) - 90).toFixed(2);
                    document.getElementById("ank-angle-R").innerHTML = ra_val;
                    document.getElementById("ank-angle-L").innerHTML = la_val;

                    // Hip Angle
                    let hipR_val = (180 - calculateAngle(shoulderR.x, shoulderR.y, hipR.x, hipR.y, kneeR.x, kneeR.y)).toFixed(2)
                    let hipL_val = (180 - calculateAngle(shoulderL.x, shoulderL.y, hipL.x, hipL.y, kneeL.x, kneeL.y)).toFixed(2)
                    document.getElementById("hip-angle-R").innerHTML = (180 - calculateAngle(shoulderR.x, shoulderR.y, hipR.x, hipR.y, kneeR.x, kneeR.y)).toFixed(2)
                    document.getElementById("hip-angle-L").innerHTML = (180 - calculateAngle(shoulderL.x, shoulderL.y, hipL.x, hipL.y, kneeL.x, kneeL.y)).toFixed(2)
                    
                    //Storing joint angles in csv file
                    data.push(rk_val);
                    data.push(lk_val);
                    data.push(ra_val);
                    data.push(la_val);
                    data.push(hipR_val);
                    data.push(hipL_val);	

                    feedback_var.push(data)
                    console.log(feedback_var);
                    
                    // data.push(shoulderL.x*video.width)
					// data.push(shoulderL.y*video.height)
					// data.push(shoulderR.x*video.width)
					// data.push(shoulderR.y*video.height)
					
					
					//Spatial Data Store
					var dis = Math.abs(ankleL3.x - ankleR3.x)
					var tim = convTime(tm.getMilliseconds() - tm1)
					document.getElementById("dur").innerHTML = tim.toFixed(3)
					var velo = (dis/tim)/4
					document.getElementById("Gait Speed").innerHTML = velo.toFixed(2)
					//console.log(dis, velo)


					
					//data.push(Math.abs(ankleL.x - ankleR.x))
					//console.log(Math.abs(ankleL.x - ankleR.x))
					document.getElementById("dis").innerHTML = (dis*100).toFixed(1)
					//document.getElementById("Gait Speed").innerHTML = velo
					// data.push(shoulderL3.x)
					// data.push(shoulderL3.y)
					// data.push(shoulderL3.z)
					// data.push(shoulderR3.x)
					// data.push(shoulderR3.y)
					// data.push(shoulderR3.z)
					// data.push(hipL3.x)
					// data.push(hipL3.y)
					// data.push(hipL3.z)
					// data.push(hipR3.x)
					// data.push(hipR3.y)
					// data.push(hipR3.z)
					// data.push(kneeL3.x)
					// data.push(kneeL3.y)
					// data.push(kneeL3.z)
					// data.push(kneeR3.x)
					// data.push(kneeR3.y)
					// data.push(kneeR3.z)
					// data.push(ankleL3.x)
					// data.push(ankleL3.y)
					// data.push(ankleL3.z)
					// data.push(ankleR3.x)
					// data.push(ankleR3.y)
					// data.push(ankleR3.z)
					// data.push(heelL3.x)
					// data.push(heelL3.y)
					// data.push(heelL3.z)
					// data.push(heelR3.x)
					// data.push(heelR3.y)
					// data.push(heelR3.z)
					// data.push(foot_indexL3.x)
					// data.push(foot_indexL3.y)
					// data.push(foot_indexL3.z)
					// data.push(foot_indexR3.x)
					// data.push(foot_indexR3.y)
					// data.push(foot_indexR3.z)
				
					
                    //bezier_points.push(data);
                    //console.log(bezier_points);
					tm1 = tm.getMilliseconds();
                }

        }

    drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS,{color: '#00FF00', lineWidth: 4});
    drawLandmarks(ctx, results.poseLandmarks,{color: '#FF0000', lineWidth: 1});


}


async function computeFrame()
{
    
    await pose.send({image: video});
    //requestAnimationFrame(computeFrame);
    setTimeout(computeFrame, 1000 / 10);
}


async function init_camera_canvas()
{
    const constraints ={
        audio: false,
        video:{
        width: config.video.width,           
        height: config.video.height,
        facingMode: 'environment',
        frameRate: { max: config.video.fps }
        }
    };
    
    video.width = config.video.width;     
    video.height= config.video.height;

    canvas.width = config.video.width;
    canvas.height = config.video.height;
    console.log("Canvas initialized");

    navigator.mediaDevices.getUserMedia(constraints).then(stream => {
        video.srcObject = stream;
        main();
    });

}

document.addEventListener("DOMContentLoaded",function(){
    init_camera_canvas();
});
