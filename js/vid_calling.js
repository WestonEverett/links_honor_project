let localName = '';
let localID = '';

function _setName() {
  localName = prompt('name?', '')
}

function _getLocalName(){
  return localName;
}

function _toStr(object) {
  return object._value;
}

function _setID() {
  localID = Math.floor((1. + Math.random()) * 10000000).toString().substring(1,9);
}

function _getID() {
  return localID;
}

var getLocalName = LINKS.kify(_getLocalName);
var setName = LINKS.kify(_setName);
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
  peerData[foreignID] = {pc:"none", iceCandidates:[], dataStr:"wait", remoteStream: new MediaStream()}

  var newVid = document.createElement('video');
  newVid.setAttribute('autoplay', 'true');
  newVid.setAttribute('object-fit', 'cover');
  newVid.setAttribute('width', '320px');
  newVid.setAttribute('height', '240px');
  newVid.setAttribute('id', foreignID);

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
      hangup(foreignID);
    }
  });

  const localStream = await navigator.mediaDevices.getUserMedia({video: true, audio: true});
  localStream.getTracks().forEach((track) => {peerData[foreignID].pc.addTrack(track, localStream); console.log("track attached");});
}

function _checkAsyncDone(foreignID) {
  return peerData[foreignID].dataStr;
}

function hangup(foreignID){

  var remoteVideo = document.getElementById(foreignID);
  remoteVideo.parentNode.removeChild(remoteVideo);

  peerData[foreignID].pc.close();
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

var playLocalVideo = LINKS.kify(_playLocalVideo);
var createOffer = LINKS.kify(_createOffer);
var createAnswer = LINKS.kify(_createAnswer);
var createAccept = LINKS.kify(_createAccept);

var checkAsyncDone = LINKS.kify(_checkAsyncDone);

var checkForIceCandidates = LINKS.kify(_checkForIceCandidates);
var newRemoteCandidate = LINKS.kify(_newRemoteCandidate);
