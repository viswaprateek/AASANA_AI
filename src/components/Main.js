import React, { useRef, useEffect } from 'react';
import { useGlobalContext } from '../context/globalContext';
import * as tf from '@tensorflow/tfjs';
import * as posenet from '@tensorflow-models/posenet';
import Webcam from 'react-webcam';
import { drawKeypoints, drawSkeleton } from '../utilities/utilities';
import MainText from './MainText';

const Main = () => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const videoWidth = 640,
    videoHeight = 400;
  const {
    poseNetModel,
    model,
    timer,
    currPose,
    scores,
    isDetecting,
    bestScores,
    setPoseNetModel,
    setModel,
    setTimer,
    setCurrPose,
    setScores,
    setIsDetecting,
    setBestScores,
  } = useGlobalContext();

  const timerRef = useRef(timer);
  timerRef.current = timer;

  const currPoseRef = useRef(currPose);
  currPoseRef.current = currPose;

  const scoresRef = useRef(scores);
  scoresRef.current = scores;

  const bestScoresRef = useRef(bestScores);
  bestScoresRef.current = bestScores;

  const isDetectingRef = useRef(isDetecting);
  isDetectingRef.current = isDetecting;

  const intervalRef = useRef(null);
  const timerVarRef = useRef(null);

  useEffect(() => {
    const loadModels = async () => {
      // Load the posenet model
      const loadedPoseNetModel = await posenet.load({
        inputResolution: { width: videoWidth, height: videoHeight },
        scale: 0.5,
      });
      setPoseNetModel(loadedPoseNetModel);

      // Load our trained neural network model
      const loadedModel = await tf.loadLayersModel('/model/my-model.json');
      setModel(loadedModel);
    };

    if (model === null || poseNetModel === null) {
      loadModels();
    }
    return () => resetStates();
  }, []);

  const runPosenet = () => {
    const newInterval = setInterval(() => {
      detect();
    }, 100);
    intervalRef.current = newInterval;

    // Stop detecting after 10 seconds
    setTimer(100);
    const timerVar = setInterval(() => {
      setTimer(timerRef.current - 1);
      if (timerRef.current === 0) {
        clearInterval(timerVar);
        clearInterval(timerVarRef.current);
        changeIsDetecting();
      }
    }, 1000);
    timerVarRef.current = timerVar;
  };

  const detect = async () => {
    if (
      typeof webcamRef.current !== 'undefined' &&
      webcamRef.current !== null &&
      webcamRef.current.video.readyState === 4 &&
      typeof canvasRef.current !== 'undefined' &&
      canvasRef.current !== null
    ) {
      // Get video properties
      const video = webcamRef.current.video;
      const videoWidth = webcamRef.current.video.videoWidth;
      const videoHeight = webcamRef.current.video.videoHeight;

      // Set video width (because when we are working with webcam we need to force the height and width)
      webcamRef.current.video.width = videoWidth;
      webcamRef.current.video.height = videoHeight;

      // Make detections
      const pose = await poseNetModel.estimateSinglePose(video, {
        flipHorizontal: true,
      });
      let currDataPoint = [];
      for (let i = 0; i < pose['keypoints'].length; i++) {
        currDataPoint.push(pose['keypoints'][i]['position'].x / 400);
        currDataPoint.push(pose['keypoints'][i]['position'].y / 400);
      }

      predict(currDataPoint);

      requestAnimationFrame(() => {
        drawCanvas(pose, videoWidth, videoHeight, canvasRef);
      });
    }
  };

  const predict = async (input) => {
    const inputTensor = tf.tensor2d(input, [1, input.length]);
    const prediction = model.predict(inputTensor);
    const predictedClass = prediction.argMax(-1).dataSync();
    // console.log(
    //   'Predicted: ',
    //   predictedClass[0],
    //   ' Current:  ',
    //   currPoseRef.current
    // );
    if (predictedClass[0] === currPoseRef.current) {
      // We made a correct prediction,
      // so increment the score of current pose

      setScores(
        scoresRef.current.map((currScore, idx) => {
          if (idx === currPoseRef.current) return currScore + 1;
          else return currScore;
        })
      );
      // console.log('Yes');
    } else {
      // console.log('No');
    }
  };

  const drawCanvas = (pose, videoWidth, videoHeight, canvas) => {
    if (canvas.current !== null) {
      const ctx = canvas.current.getContext('2d');
      canvas.current.width = videoWidth;
      canvas.current.height = videoHeight;
  
      // Draw keypoints and skeleton
      drawKeypoints(pose['keypoints'], 0.5, ctx);
      drawSkeleton(pose['keypoints'], 0.5, ctx);
  
      // Calculate and draw the angle for the left leg (between right hip, left hip, and left knee)
      const rightHip = pose.keypoints[12].position;
      const leftHip = pose.keypoints[11].position;
      const leftKnee = pose.keypoints[13].position;
      const leftLegAngle = calculateAngle(rightHip, leftHip, leftKnee);
  
      ctx.beginPath();
      ctx.moveTo(rightHip.x, rightHip.y);
      ctx.lineTo(leftHip.x, leftHip.y);
      ctx.lineTo(leftKnee.x, leftKnee.y);
      ctx.strokeStyle = leftLegAngle >= 120 && leftLegAngle <= 150 ? 'green' : 'red';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = '20px Arial';
      ctx.fillStyle = 'white';
      ctx.fillText(`Left Leg Angle: ${leftLegAngle}°`, leftHip.x + 10, leftHip.y - 10);
  
      // Calculate and draw the angle for the right leg (between left hip, right hip, and right knee)
      const rightKnee = pose.keypoints[14].position;
      const rightLegAngle = calculateAngle(leftHip, rightHip, rightKnee);
  
      ctx.beginPath();
      ctx.moveTo(leftHip.x, leftHip.y);
      ctx.lineTo(rightHip.x, rightHip.y);
      ctx.lineTo(rightKnee.x, rightKnee.y);
      ctx.strokeStyle = rightLegAngle >= 120 && rightLegAngle <= 150 ? 'green' : 'red';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillText(`Right Leg Angle: ${rightLegAngle}°`, rightHip.x + 10, rightHip.y - 10);
  
      // Calculate and draw the angle for the left arm (between left hip, left shoulder, and left wrist)
      const leftShoulder = pose.keypoints[5].position;
      const leftWrist = pose.keypoints[9].position;
      const leftArmAngle = calculateAngle(leftHip, leftShoulder, leftWrist);
  
      ctx.beginPath();
      ctx.moveTo(leftHip.x, leftHip.y);
      ctx.lineTo(leftShoulder.x, leftShoulder.y);
      ctx.lineTo(leftWrist.x, leftWrist.y);
      ctx.strokeStyle = leftArmAngle >= 110 && leftArmAngle <= 130 ? 'green' : 'red';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillText(`Left Arm Angle: ${leftArmAngle}°`, leftShoulder.x + 10, leftShoulder.y - 10);
  
      // Calculate and draw the angle for the right arm (between right hip, right shoulder, and right wrist)
      const rightShoulder = pose.keypoints[6].position;
      const rightWrist = pose.keypoints[10].position;
      const rightArmAngle = calculateAngle(rightHip, rightShoulder, rightWrist);
  
      ctx.beginPath();
      ctx.moveTo(rightHip.x, rightHip.y);
      ctx.lineTo(rightShoulder.x, rightShoulder.y);
      ctx.lineTo(rightWrist.x, rightWrist.y);
      ctx.strokeStyle = rightArmAngle >= 110 && rightArmAngle <= 130 ? 'green' : 'red';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillText(`Right Arm Angle: ${rightArmAngle}°`, rightShoulder.x + 10, rightShoulder.y - 10);
    }
  };
  
  // Helper function to calculate the angle between three points
  const calculateAngle = (pointA, pointB, pointC) => {
    const AB = Math.sqrt(Math.pow(pointB.x - pointA.x, 2) + Math.pow(pointB.y - pointA.y, 2));
    const BC = Math.sqrt(Math.pow(pointB.x - pointC.x, 2) + Math.pow(pointB.y - pointC.y, 2));
    const AC = Math.sqrt(Math.pow(pointC.x - pointA.x, 2) + Math.pow(pointC.y - pointA.y, 2));
  
    const angle = Math.acos((AB * AB + BC * BC - AC * AC) / (2 * AB * BC)) * (180 / Math.PI);
  
    return Math.round(angle); // Round to nearest whole number for comparison
  };
  

  const updateScores = () => {
    setBestScores(
      bestScoresRef.current.map((score, idx) => {
        if (scoresRef.current[idx] > score) return scoresRef.current[idx];
        return score;
      })
    );
    localStorage.setItem('bestScores', JSON.stringify(bestScoresRef.current));
    setScores([0, 0, 0]);
  };

  const resetStates = () => {
    // isDetectingRef.current = false;

    setIsDetecting(false);
    clearInterval(intervalRef.current);
    clearInterval(timerVarRef.current);
    setTimer(10);
  };

  const startDetecting = () => {
    setIsDetecting(true);
    // isDetectingRef.current = true;
    const timerVar = setInterval(() => {
      setTimer(timerRef.current - 1);
      if (timerRef.current === 0) {
        clearInterval(timerVar);
        runPosenet();
      }
    }, 1000);
    timerVarRef.current = timerVar;
  };

  const changeIsDetecting = () => {
    if (isDetectingRef.current) {
      resetStates();
      updateScores();
    } else startDetecting();
  };

  return (
    <main>
      <section className='video-section'>
        {isDetecting ? (
          <div className='video-container'>
            <Webcam
              ref={webcamRef}
              mirrored
              style={{
                position: 'absolute',
                marginLeft: 'auto',
                marginRight: 'auto',
                left: 0,
                right: 0,
                zindex: 9,
                width: videoWidth,
                height: videoHeight,
              }}
            />

            <canvas
              ref={canvasRef}
              style={{
                position: 'absolute',
                marginLeft: 'auto',
                marginRight: 'auto',
                left: 0,
                right: 0,
                zindex: 9,
                width: videoWidth,
                height: videoHeight,
              }}
            />
          </div>
        ) : (
          <MainText />
        )}
      </section>
      <section className='button-section'>
        <button className='btn btn-1' onClick={() => changeIsDetecting()}>
          <h4> {isDetecting ? `Stop` : `Let's Begin`} </h4>
        </button>
        <p className='main-warning'>Please visit on a larger device</p>
      </section>
    </main>
  );
};

export default Main;
