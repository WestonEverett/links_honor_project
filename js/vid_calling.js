let localName = '';
let localID = '';

function _setName() {
  localName = prompt('name?', '')
}

function _getLocalName(){
  return localName;
}

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

function _setID() {
  localID = Math.floor((1. + Math.random()) * 10000000).toString().substring(1,9);
}

function _getID() {
  return localID;
}

var getLocalName = LINKS.kify(_getLocalName);
var setName = LINKS.kify(_setName);
var askForYesNo = LINKS.kify(_askForYesNo);
var toString = LINKS.kify(_toStr);
var setID = LINKS.kify(_setID);
var getID = LINKS.kify(_getID);

async function _playLocalVideo(ID) {

  const constraints = window.constraints = {
    audio: false,
    video: true
  };

  const video = document.querySelector('video#' + ID);

  try {
    localStream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = localStream;
  } catch (e) {
    console.error("video error", e);
  }
}

let localStream;

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

  peerData[foreignID].localStream = await navigator.mediaDevices.getUserMedia({video: true, audio: true});
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

function _togMute(foreignID){
  if(foreignID in peerData){
    peerData[foreignID].remoteStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
    console.log(peerData[foreignID].remoteStream.getAudioTracks().length + " tracks toggled");
  }
  else {
    console.log("foreignID not found");
  }
}

function _togHide(foreignID){
  if(foreignID in peerData){
    peerData[foreignID].remoteStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
    console.log(peerData[foreignID].remoteStream.getVideoTracks().length + " tracks toggled");
  }
  else {
    console.log("foreignID not found");
  }
}

function _togDeaf(foreignID){
  if(foreignID in peerData){
    peerData[foreignID].localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
    console.log(peerData[foreignID].localStream.getAudioTracks().length + " tracks toggled");
  }
  else {
    console.log("foreignID not found");
  }
}

function _togBlind(foreignID){
  if(foreignID in peerData){
    peerData[foreignID].localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
    console.log(peerData[foreignID].remoteStream.getVideoTracks().length + " tracks toggled");
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
var togMute = LINKS.kify(_togMute);
var togHide = LINKS.kify(_togHide);
var togDeaf = LINKS.kify(_togDeaf);
var togBlind = LINKS.kify(_togBlind);

var checkAsyncDone = LINKS.kify(_checkAsyncDone);

var checkForIceCandidates = LINKS.kify(_checkForIceCandidates);
var newRemoteCandidate = LINKS.kify(_newRemoteCandidate);
