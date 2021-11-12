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

let offerStr = "wait";
let answerStr = "wait";
let acceptStr = "wait";
let localStream;
let remoteStream = new MediaStream();
const configuration = {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]};
let pc;

let iceCandidates = [];



const offerOptions = {
  offerToReceiveAudio: 1,
  offerToReceiveVideo: 1
};

async function _createOffer() {

  offerStr = "wait";

  pc = new RTCPeerConnection(configuration);
  var offer = await pc.createOffer(offerOptions)
  await pc.setLocalDescription(offer);

  pc.addEventListener('track', async (event) => {receivedStream(event);});
  pc.addEventListener('icecandidate', event => {if (event.candidate) {iceCandidates.push(event.candidate);}});
  pc.addEventListener('connectionstatechange', event => { console.log(pc.connectionState);});

  offerStr = JSON.stringify(offer);

}

function _checkOffer() {
  return offerStr;
}

async function _createAnswer(newOfferStr) {

  answerStr = "wait";

  var offer = JSON.parse(newOfferStr);

  pc = new RTCPeerConnection(configuration);
  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  var answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  pc.addEventListener('track', async (event) => {receivedStream(event);});
  pc.addEventListener('icecandidate', event => {if (event.candidate) {iceCandidates.push(event.candidate);}});
  pc.addEventListener('connectionstatechange', event => { console.log(pc.connectionState);});

  await attachLocalStreams();

  answerStr = JSON.stringify(answer);
}

function _checkAnswer() {
  return answerStr;
}

async function _createAccept(newOfferStr) {

  acceptStr = "wait";

  var offer = JSON.parse(newOfferStr);

  await pc.setRemoteDescription(new RTCSessionDescription(offer));

  await attachLocalStreams();

  acceptStr = '';
}

function _checkAccept() {
  return acceptStr;
}

function receivedStream(event) {
  console.log("received Stream")

  var newVid = document.createElement('video');
  newVid.setAttribute('autoplay', 'true');
  newVid.setAttribute('object-fit', 'cover');
  newVid.setAttribute('width', '320px');
  newVid.setAttribute('height', '240px');

  newVid.srcObject = event.streams[0];

  document.getElementById('vids').appendChild(newVid);
}

async function attachLocalStreams(){
  localStream = await navigator.mediaDevices.getUserMedia({video: true, audio: true});
  localStream.getTracks().forEach(track => {pc.addTrack(track, localStream)});
}

function _checkForIceCandidates(){
  if(iceCandidates.length == 0){
    return "None";
  }
  else{
    return JSON.stringify(iceCandidates.shift());
  }
}

async function _newRemoteCandidate(iceCandidate){
  try {
    var cand = JSON.parse(iceCandidate)
    await pc.addIceCandidate(cand);
  } catch (e) {
    console.error('Error adding received ice candidate', e);
  }
}

var playLocalVideo = LINKS.kify(_playLocalVideo);
var createOffer = LINKS.kify(_createOffer);
var checkOffer = LINKS.kify(_checkOffer);
var createAnswer = LINKS.kify(_createAnswer);
var checkAnswer = LINKS.kify(_checkAnswer);
var createAccept = LINKS.kify(_createAccept);
var checkAccept = LINKS.kify(_checkAccept);

var checkForIceCandidates = LINKS.kify(_checkForIceCandidates);
var newRemoteCandidate = LINKS.kify(_newRemoteCandidate);
