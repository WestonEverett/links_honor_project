var audVidConstraints;
var deviceSet = "";
const configuration = {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]};
let peerData = {};
var vidWriteLocs = {}

async function _basicInputs(){
  var deviceInfos = await navigator.mediaDevices.enumerateDevices();

  const audioSource = deviceInfos.find(function (element) {
    return element.kind == 'audioinput'
  }).value;
  const videoSource = deviceInfos.find(function (element) {
    return element.kind == 'videoinput'
  }).value;

  console.log(audioSource);
  console.log(videoSource);

  audVidConstraints = {
    audio: {deviceId: audioSource ? {exact: audioSource} : false},
    video: {deviceId: videoSource ? {exact: videoSource} : false}
  };

  audVidConstraintsLocal = {
    audio: false,
    video: {deviceId: videoSource ? {exact: videoSource} : false}
  };

  deviceSet = "set";
}

async function _showInputs(){

  var deviceInfos = await navigator.mediaDevices.enumerateDevices();

  const audioInputSelect = document.getElementById('audioSource');
  const videoSelect = document.getElementById('videoSource');
  const selectors = [audioInputSelect, videoSelect];

  const values = selectors.map(select => select.value);

  console.log(deviceInfos.length);
  for (let i = 0; i !== deviceInfos.length; ++i) {
    const deviceInfo = deviceInfos[i];
    const option = document.createElement('option');
    option.value = deviceInfo.deviceId;
    if (deviceInfo.kind === 'audioinput') {
      option.text = deviceInfo.label || `microphone ${audioInputSelect.length + 1}`;
      audioInputSelect.appendChild(option);
    } else if (deviceInfo.kind === 'videoinput') {
      option.text = deviceInfo.label || `camera ${videoSelect.length + 1}`;
      videoSelect.appendChild(option);
    } else {
      console.log('Some other kind of source/device: ', deviceInfo);
    }
  }

  selectors.forEach((select, selectorIndex) => {
    if (Array.prototype.slice.call(select.childNodes).some(n => n.value === values[selectorIndex])) {
      select.value = values[selectorIndex];
    }
  });
}

async function _setInputs(){

  const audioInputSelect = document.getElementById('audioSource');
  const videoSelect = document.getElementById('videoSource');

  const audioSource = audioInputSelect.value;
  const videoSource = videoSelect.value;

  console.log(audioSource);
  console.log(videoSource);

  audVidConstraints = {
    audio: {deviceId: audioSource ? {exact: audioSource} : false},
    video: {deviceId: videoSource ? {exact: videoSource} : false}
  };

  audVidConstraintsLocal = {
    audio: false,
    video: {deviceId: videoSource ? {exact: videoSource} : false}
  };

  deviceSet = "set";
}

function _setWriteLoc(localID, foreignID, loc){
  if (!(localID in vidWriteLocs)) {
    vidWriteLocs[localID] = {};
  }

  vidWriteLocs[localID][foreignID] = loc;
}

function _checkDeviceSet(){
  return deviceSet;
}

async function _playLocalVideo(ID) {

  var video = document.createElement('video');
  video.setAttribute('autoplay', 'true');
  video.setAttribute('object-fit', 'cover');
  video.setAttribute('width', '320px');
  video.setAttribute('height', '240px');
  video.setAttribute('id', 'VidOf' + ID);

  try {
    let localStream = await navigator.mediaDevices.getUserMedia(audVidConstraintsLocal);
    video.srcObject = localStream;
  } catch (e) {
    console.error("video error", e);
  }

  console.log(vidWriteLocs);
  console.log(ID);
  if(ID in vidWriteLocs[ID]){
    loc = vidWriteLocs[ID][ID];
  } else {
    loc = vidWriteLocs[ID]["default"];
  }

  document.getElementById(loc).appendChild(video);
}


const offerOptions = {
  offerToReceiveAudio: 1,
  offerToReceiveVideo: 1
};

async function _createOffer(localID, foreignID) {

  await preparePC(localID, foreignID);

  var offer = await peerData[localID][foreignID].pc.createOffer(offerOptions)
  await peerData[localID][foreignID].pc.setLocalDescription(offer);

  peerData[localID][foreignID].dataStr = JSON.stringify(offer);

}

async function preparePC(localID, foreignID){
  if (!(localID in peerData)) {
    peerData[localID] = {};
  }
  peerData[localID][foreignID] = {pc:"none", foreignID:foreignID, iceCandidates:[], dataStr:"wait", remoteStream: new MediaStream(), localStream: new MediaStream()}

  var newVid = document.createElement('video');
  newVid.setAttribute('autoplay', 'true');
  newVid.setAttribute('object-fit', 'cover');
  newVid.setAttribute('width', '320px');
  newVid.setAttribute('height', '240px');
  newVid.setAttribute('id', 'VidOf' + foreignID + 'For' + localID);

  newVid.srcObject = peerData[localID][foreignID].remoteStream;

  if(foreignID in vidWriteLocs[localID]){
    loc = vidWriteLocs[localID][foreignID];
  } else {
    loc = vidWriteLocs[localID]["default"];
  }

  document.getElementById(loc).appendChild(newVid);

  peerData[localID][foreignID].pc = new RTCPeerConnection(configuration);

  peerData[localID][foreignID].pc.ontrack = async (event) => {
    peerData[localID][foreignID].remoteStream.addTrack(event.track, peerData[localID][foreignID].remoteStream);
    console.log("remote track added");
  }

  peerData[localID][foreignID].pc.addEventListener('icecandidate', event => {
    if (event.candidate) {peerData[localID][foreignID].iceCandidates.push(event.candidate);}
  });

  peerData[localID][foreignID].pc.addEventListener('connectionstatechange', event => {
    console.log(peerData[localID][foreignID].pc.connectionState);
    if(peerData[localID][foreignID].pc.connectionState == "disconnected"){
      _hangup(localID, foreignID);
    }
  });

  let localStream = await navigator.mediaDevices.getUserMedia(audVidConstraintsLocal);

  peerData[localID][foreignID].localStream = await navigator.mediaDevices.getUserMedia(audVidConstraints);
  peerData[localID][foreignID].localStream.getTracks().forEach((track) => {peerData[localID][foreignID].pc.addTrack(track, localStream); console.log("track attached");});
}

function _checkAsyncDone(localID, foreignID) {
  return peerData[localID][foreignID].dataStr;
}

function _hangupAll(localID){
  for (peer in peerData[localID]) {
    _hangup(localID, peer);
  }
}

function _hangup(localID, foreignID){

  var remoteVideo = document.getElementById('VidOf' + foreignID + 'For' + localID);

  if(remoteVideo != null){
    remoteVideo.parentNode.removeChild(remoteVideo);
    peerData[localID][foreignID].pc.close();
  }
  else {
    console.log("can't find vid of " + foreignID + " in CallClient " + localID);
  }
}

async function _createAnswer(localID, foreignID, newOfferStr) {


  var offer = JSON.parse(newOfferStr);

  await preparePC(localID, foreignID);

  await peerData[localID][foreignID].pc.setRemoteDescription(new RTCSessionDescription(offer));
  var answer = await peerData[localID][foreignID].pc.createAnswer();
  await peerData[localID][foreignID].pc.setLocalDescription(answer);

  peerData[localID][foreignID].dataStr = JSON.stringify(answer);
}

async function _createAccept(localID, foreignID, newOfferStr) {

  peerData[localID][foreignID].dataStr = "wait";

  var offer = JSON.parse(newOfferStr);

  await peerData[localID][foreignID].pc.setRemoteDescription(new RTCSessionDescription(offer));

  peerData[localID][foreignID].dataStr = '';
}

function _checkForIceCandidates(localID, foreignID){
  if(peerData[localID][foreignID].iceCandidates.length == 0){
    return "None";
  }
  else{
    return JSON.stringify(peerData[localID][foreignID].iceCandidates.shift());
  }
}

async function _newRemoteCandidate(localID, foreignID, iceCandidate){
  try {
    var cand = JSON.parse(iceCandidate)
    await peerData[localID][foreignID].pc.addIceCandidate(cand);
  } catch (e) {
    console.error('Error adding received ice candidate', e);
  }
}

function _setOutgoingAudio(localID, foreignID, toBool){
  if(foreignID == localID) {
    console.log("Toggling all outgoing audio to " + toBool);
    for(id in peerData[localID]){
      peerData[localID][id].localStream.getAudioTracks().forEach(track => track.enabled = toBool);
      console.log(peerData[localID][id].localStream.getAudioTracks().length + " audio tracks toggled for " + id);
    }
  }
  else if(foreignID in peerData[localID]){
    console.log("Toggling outgoing audio " + foreignID + " to " + toBool);
    peerData[localID][foreignID].localStream.getAudioTracks().forEach(track => track.enabled = toBool);
    console.log(peerData[localID][foreignID].localStream.getAudioTracks().length + " audio tracks toggled for " + foreignID);
  }
  else {
    console.log("foreignID not found");
  }
}

function _setOutgoingVideo(localID, foreignID, toBool){
  if(foreignID == localID) {
    console.log("Toggling all outgoing video to " + toBool);
    console.log(peerData[localID]);
    for(id in peerData[localID]){
      peerData[localID][id].localStream.getVideoTracks().forEach(track => track.enabled = toBool);
      console.log(peerData[localID][id].localStream.getVideoTracks().length + " video tracks toggled for " + id);
    }
  }
  else if(foreignID in peerData[localID]){
    console.log("Toggling outgoing video " + foreignID + " to " + toBool);
    peerData[localID][foreignID].localStream.getVideoTracks().forEach(track => track.enabled = toBool);
    console.log(peerData[localID][foreignID].localStream.getVideoTracks().length + " video tracks toggled for " + foreignID);
  }
  else {
    console.log("foreignID not found");
  }
}

function _setIncomingAudio(localID, foreignID, toBool){
  if(foreignID == localID) {
    console.log("Toggling all incoming audio to " + toBool);
    for(id in peerData[localID]){
      peerData[localID][id].remoteStream.getAudioTracks().forEach(track => track.enabled = toBool);
      console.log(peerData[localID][id].remoteStream.getAudioTracks().length + " audio tracks toggled for " + id);
    }
  }
  else if(foreignID in peerData[localID]){
    console.log("Toggling incoming audio " + foreignID + " to " + toBool);
    peerData[localID][foreignID].remoteStream.getAudioTracks().forEach(track => track.enabled = toBool);
    console.log(peerData[localID][foreignID].remoteStream.getAudioTracks().length + " audio tracks toggled for " + foreignID);
  }
  else {
    console.log("foreignID not found");
  }
}

function _setIncomingVideo(localID, foreignID, toBool){
  if(foreignID == localID) {
    console.log("Toggling all incoming video to " + toBool);
    console.log(peerData[localID]);
    for(id in peerData[localID]){
      peerData[localID][id].remoteStream.getVideoTracks().forEach(track => track.enabled = toBool);
      console.log(peerData[localID][id].remoteStream.getVideoTracks().length + " video tracks toggled for " + id);
    }
  }
  else if(foreignID in peerData[localID]){
    console.log("Toggling incoming video " + foreignID + " to " + toBool);
    peerData[localID][foreignID].remoteStream.getVideoTracks().forEach(track => track.enabled = toBool);
    console.log(peerData[localID][foreignID].remoteStream.getVideoTracks().length + " video tracks toggled for " + foreignID);
  }
  else {
    console.log("foreignID not found");
  }
}

var playLocalVideo = LINKS.kify(_playLocalVideo);
var createOffer = LINKS.kify(_createOffer);
var createAnswer = LINKS.kify(_createAnswer);
var createAccept = LINKS.kify(_createAccept);
var hangup = LINKS.kify(_hangup);
var hangupAll = LINKS.kify(_hangupAll);

var showInputs = LINKS.kify(_showInputs);
var setInputs = LINKS.kify(_setInputs);
var basicInputs = LINKS.kify(_basicInputs);

var setWriteLoc = LINKS.kify(_setWriteLoc);

var checkDeviceSet = LINKS.kify(_checkDeviceSet);

var setOutgoingAudio = LINKS.kify(_setOutgoingAudio);
var setOutgoingVideo = LINKS.kify(_setOutgoingVideo);
var setIncomingAudio = LINKS.kify(_setIncomingAudio);
var setIncomingVideo = LINKS.kify(_setIncomingVideo);

var checkAsyncDone = LINKS.kify(_checkAsyncDone);

var checkForIceCandidates = LINKS.kify(_checkForIceCandidates);
var newRemoteCandidate = LINKS.kify(_newRemoteCandidate);
