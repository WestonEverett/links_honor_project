let localName = '';
let localID = '';

function _askForYesNo(requestStr){
  if(confirm(requestStr)){
    return "true";
  }
  else {
    return "false";
  }
}

function _toStr(object) {
  return object;
}

var askForYesNo = LINKS.kify(_askForYesNo);
var toString = LINKS.kify(_toStr);


var audVidConstraints;

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

var deviceSet = "";

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

function _checkDeviceSet(){
  return deviceSet;
}

let localStream;

async function _playLocalVideo(ID) {

  const video = document.querySelector('video#' + ID);

  try {
    localStream = await navigator.mediaDevices.getUserMedia(audVidConstraintsLocal);
    video.srcObject = localStream;
  } catch (e) {
    console.error("video error", e);
  }
}



const configuration = {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]};

let peerData = {};



const offerOptions = {
  offerToReceiveAudio: 1,
  offerToReceiveVideo: 1
};

async function _createOffer(foreignID) {

  await preparePC(foreignID);

  var offer = await peerData[foreignID].pc.createOffer(offerOptions)
  await peerData[foreignID].pc.setLocalDescription(offer);

  peerData[foreignID].dataStr = JSON.stringify(offer);

}

async function preparePC(foreignID){
  peerData[foreignID] = {pc:"none", foreignID:foreignID, iceCandidates:[], dataStr:"wait", remoteStream: new MediaStream(), localStream: new MediaStream()}

  var newVid = document.createElement('video');
  newVid.setAttribute('autoplay', 'true');
  newVid.setAttribute('object-fit', 'cover');
  newVid.setAttribute('width', '320px');
  newVid.setAttribute('height', '240px');
  newVid.setAttribute('id', 'VidOf' + foreignID);

  newVid.srcObject = peerData[foreignID].remoteStream;

  document.getElementById('vids').appendChild(newVid);

  peerData[foreignID].pc = new RTCPeerConnection(configuration);

  peerData[foreignID].pc.ontrack = async (event) => {
    peerData[foreignID].remoteStream.addTrack(event.track, peerData[foreignID].remoteStream);
    console.log("remote track added");
  }

  peerData[foreignID].pc.addEventListener('icecandidate', event => {
    if (event.candidate) {peerData[foreignID].iceCandidates.push(event.candidate);}
  });

  peerData[foreignID].pc.addEventListener('connectionstatechange', event => {
    console.log(peerData[foreignID].pc.connectionState);
    if(peerData[foreignID].pc.connectionState == "disconnected"){
      _hangup(foreignID);
    }
  });

  peerData[foreignID].localStream = await navigator.mediaDevices.getUserMedia(audVidConstraints);
  peerData[foreignID].localStream.getTracks().forEach((track) => {peerData[foreignID].pc.addTrack(track, localStream); console.log("track attached");});
}

function _checkAsyncDone(foreignID) {
  return peerData[foreignID].dataStr;
}

function _hangupAll(){
  for (peer in peerData) {
    _hangup(peer);
  }
}

function _hangup(foreignID){

  var remoteVideo = document.getElementById('VidOf' + foreignID);

  if(remoteVideo != null){
    remoteVideo.parentNode.removeChild(remoteVideo);
    peerData[foreignID].pc.close();
  }
  else {
    console.log("can't find vid of " + foreignID);
  }
}

async function _createAnswer(foreignID, newOfferStr) {


  var offer = JSON.parse(newOfferStr);

  await preparePC(foreignID);

  await peerData[foreignID].pc.setRemoteDescription(new RTCSessionDescription(offer));
  var answer = await peerData[foreignID].pc.createAnswer();
  await peerData[foreignID].pc.setLocalDescription(answer);

  peerData[foreignID].dataStr = JSON.stringify(answer);
}

async function _createAccept(foreignID, newOfferStr) {

  peerData[foreignID].dataStr = "wait";

  var offer = JSON.parse(newOfferStr);

  await peerData[foreignID].pc.setRemoteDescription(new RTCSessionDescription(offer));

  peerData[foreignID].dataStr = '';
}

function _checkForIceCandidates(foreignID){
  if(peerData[foreignID].iceCandidates.length == 0){
    return "None";
  }
  else{
    return JSON.stringify(peerData[foreignID].iceCandidates.shift());
  }
}

async function _newRemoteCandidate(foreignID, iceCandidate){
  try {
    var cand = JSON.parse(iceCandidate)
    await peerData[foreignID].pc.addIceCandidate(cand);
  } catch (e) {
    console.error('Error adding received ice candidate', e);
  }
}

function _setMute(foreignID, toBool){
  if(foreignID in peerData){
    peerData[foreignID].remoteStream.getAudioTracks().forEach(track => track.enabled = !toBool);
    console.log(peerData[foreignID].remoteStream.getAudioTracks().length + " tracks toggled");
  }
  else if(foreignID == localID) {
    for(id in peerData){
      peerData[id].localStream.getAudioTracks().forEach(track => track.enabled = !toBool);
    }
  }
  else {
    console.log("foreignID not found");
  }
}

function _setHide(foreignID, toBool){
  if(foreignID in peerData){
    peerData[foreignID].remoteStream.getVideoTracks().forEach(track => track.enabled = !toBool);
    console.log(peerData[foreignID].remoteStream.getVideoTracks().length + " tracks toggled");
  }
  else if(foreignID == localID) {
    for(id in peerData){
      peerData[id].localStream.getVideoTracks().forEach(track => track.enabled = !toBool);
    }
  }
  else {
    console.log("foreignID not found");
  }
}

function _setDeaf(foreignID, toBool){
  if(foreignID in peerData){
    peerData[foreignID].localStream.getAudioTracks().forEach(track => track.enabled = !toBool);
    console.log(peerData[foreignID].localStream.getAudioTracks().length + " tracks toggled");
  }
  else if(foreignID == localID) {
    for(id in peerData){
      peerData[id].remoteStream.getAudioTracks().forEach(track => track.enabled = !toBool);
    }
  }
  else {
    console.log("foreignID not found");
  }
}

function _setBlind(foreignID, toBool){
  if(foreignID in peerData){
    peerData[foreignID].localStream.getVideoTracks().forEach(track => track.enabled = !toBool);
    console.log(peerData[foreignID].remoteStream.getVideoTracks().length + " tracks toggled");
  }
  else if(foreignID == localID) {
    for(id in peerData){
      peerData[id].remoteStream.getVideoTracks().forEach(track => track.enabled = !toBool);
    }
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

var setMute = LINKS.kify(_setMute);
var setHide = LINKS.kify(_setHide);
var setDeaf = LINKS.kify(_setDeaf);
var setBlind = LINKS.kify(_setBlind);

var showInputs = LINKS.kify(_showInputs);
var setInputs = LINKS.kify(_setInputs);

var checkDeviceSet = LINKS.kify(_checkDeviceSet);

var checkAsyncDone = LINKS.kify(_checkAsyncDone);

var checkForIceCandidates = LINKS.kify(_checkForIceCandidates);
var newRemoteCandidate = LINKS.kify(_newRemoteCandidate);
