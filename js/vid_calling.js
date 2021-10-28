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
    video.srcObject = await navigator.mediaDevices.getUserMedia(constraints);
  } catch (e) {
    console.error("video error", e);
  }
}

let pc;
const offerOptions = {
  offerToReceiveAudio: 1,
  offerToReceiveVideo: 1
};

async function _createOffer() {
  pc = new RTCPeerConnection();
  offer = await pc.createOffer(offerOptions);
  await pc.setLocalDescription(offer);

  return offer;
}

async function _receiveOffer(offer) {
  pc = new RTCPeerConnection();
  await pc.setRemoteDescription(offer);
  answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  return answer;
}

var playLocalVideo = LINKS.kify(_playLocalVideo);
var createOffer = LINKS.kify(_createOffer);
var receiveOffer = LINKS.kify(_receiveOffer);