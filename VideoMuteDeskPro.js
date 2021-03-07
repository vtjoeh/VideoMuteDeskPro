/*
VideoMuteDeskPro.js v 0.1 

Mutes video for the Desk Pro or DX-series.  
- Video Mute, Video Unmute and Lid Closed is indicated on the screen and touch panel button. 
- At end of call video is automatically unmuted.   
- Muting video right before a call allows you to connect with video muted. 
- This feature is not needed for the Room or Board series as their is already a video mute option in configuration. 
- Sample code only. There is no warranty.  
- Author: Joe Hughes joehughe AT cisco.com 

*/

import xapi from 'xapi';

const panelIdVideoMute = 'panel_video_mute';
let selfViewOffTimer; 
let stateMainVideoMute; 
let stateCameraLid; 
let stateActiveCalls; 


function selfViewOff(){
  xapi.Command.Video.Selfview.Set({Mode: 'Off'}); 
}

function flashSelfViewOn() {
  clearTimeout(selfViewOffTimer); 
  xapi.Command.Video.Selfview.Set({Mode: 'On'}); 
  selfViewOffTimer = setTimeout(selfViewOff, 5000);
}

function videoUnmute() {
  xapi.Command.Video.Input.MainVideo.Unmute().catch(
  (error)=>{
    console.error("Privacy Cover Closed?", error); // most likely the Privacy Cover is closed
    if(stateActiveCalls === 0){
      setTimeout(()=>{screenMessage("*Video Cover Closed*", 1, 1000, 5)}, 300);
    } 
    else {
      setTimeout(()=>{screenMessage("Lid Closed")}, 300);
    }
  })
  .then(() => {
    if(stateActiveCalls === 0){
      setTimeout(()=>{screenMessage("Video Unmuted", 1, 1000, 5)}, 100);
    }
  });
  flashSelfViewOn(); 
}

function screenMessage(message, x = 1, y = 1000, duration = 0) {
  xapi.command('UserInterface Message Textline Display', {
    Text: message,
    X: x,
    Y: y,
    Duration: duration,
  });
}

function buttonClicked(button) {
  if (button.PanelId === panelIdVideoMute) {
      if (stateMainVideoMute === 'Off') {
        xapi.Command.Video.Input.MainVideo.Mute().catch((error)=>{console.error(error);});
      }
      else {
        videoUnmute();
      }
  }
}

function determineActiveCalls(calls) {
  stateActiveCalls = parseInt(calls, 10);
  if (stateMainVideoMute === 'On' && stateActiveCalls === 0) {
    videoUnmute(); 
  } else {
    updateGui(stateMainVideoMute, stateCameraLid); 
  }
}


function updateGui(mainVideoMute, cameraLid){
    if(cameraLid === 'Closed' && stateActiveCalls > 0){
       udpateMuteButton(cameraLid); 
       screenMessage("Lid Closed");
     } 
     else if (cameraLid === 'Closed' && stateActiveCalls === 0){
       udpateMuteButton(cameraLid); 
       screenMessage("Lid Closed",1,1000,3);
     }
     else if (mainVideoMute === 'On' && stateActiveCalls > 0)
     {
       udpateMuteButton(mainVideoMute); 
       screenMessage("Video Muted");
     } 
     else if (mainVideoMute === 'On' && stateActiveCalls === 0){
       udpateMuteButton(mainVideoMute); 
       screenMessage("Video Muted",1,1000,3);
     }
}

function lidChange(lidState){
  stateCameraLid = lidState; 
  updateGui(stateMainVideoMute, stateCameraLid)
}

function determineLidClosed(mainVideoMute){
  stateMainVideoMute = mainVideoMute; 
  xapi.Status.SystemUnit.State.CameraLid.get().then((cameraLid)=>{
    updateGui(mainVideoMute, cameraLid); 
  })
}

function determineMute(mainVideoMute) {
  stateMainVideoMute = mainVideoMute; 
  if (mainVideoMute === 'On') {
    determineLidClosed(mainVideoMute); 
  }
  else if (mainVideoMute === 'Off') {
    screenMessage("Video Unmuted", 1, 1000, 5);
    udpateMuteButton(mainVideoMute); 
  } 
}

function udpateMuteButton(videoMute){
  let buttonColor; 
  let buttonName; 
  if(videoMute === 'On')
  {
    buttonName = 'Unmute Video'; 
    buttonColor = '#52214A';
  }
  else if (videoMute === 'Off'){
    buttonName = 'Mute Video'; 
    buttonColor = '#FA00BB';
  }
  else if (videoMute = 'Closed'){
    buttonName = 'Lid Closed'; 
    buttonColor = '#52214A';
  }
  xapi.Command.UserInterface.Extensions.Panel.Update({
    PanelId: panelIdVideoMute, 
    Color: buttonColor,
    Name: buttonName, 
  })
}

xapi.Event.UserInterface.Extensions.Panel.Clicked.on(buttonClicked);

xapi.Status.Video.Input.MainVideoMute.get().then(determineMute); 

xapi.Status.Video.Input.MainVideoMute.on(determineMute);

xapi.Status.SystemUnit.State.NumberOfActiveCalls.get().then(determineActiveCalls);

xapi.Status.SystemUnit.State.NumberOfActiveCalls.on(determineActiveCalls);

xapi.Status.SystemUnit.State.CameraLid.on(lidChange); 
