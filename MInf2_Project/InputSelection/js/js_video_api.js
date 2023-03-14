var audVidConstraints;
var deviceSet = "";
const configuration = {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]};
let peerData = {};
var vidWriteLocs = {};

var clientSources = {};
var availableSources = {};
var sourcesFound = false;

function cons(x, xs) { return {_head: x, _tail: xs}}

function toLinksArray(xs) {
  let ys = null;
  xs.reverse().forEach(function (x) {
    ys = cons(x,ys);
  });
  return ys;
}

async function _collectSources(){
  sourcesFound = false;
  var deviceInfos = await navigator.mediaDevices.enumerateDevices();
  availableSources["audio"] = deviceInfos.filter(function (element) {return element.kind == 'audioinput'});
  availableSources["video"] = deviceInfos.filter(function (element) {return element.kind == 'videoinput'});
  sourcesFound = true;
}

function _checkSourcesCollected(){
  return sourcesFound;
}

function _getAudioSources(){
  return toLinksArray(availableSources["audio"].map(function (element) {return element.label}));
}

function _getVideoSources(){
  return toLinksArray(availableSources["video"].map(function (element) {return element.label}));
}

function _anyAudioSource(localID){
  deviceSet = "";
  prepareID(localID);
  clientSources[localID]["audio"] = "any";
  _setSources(localID, "", "")
}

function _noAudioSource(localID){
  deviceSet = "";
  prepareID(localID);
  clientSources[localID]["audio"] = "";
  _setSources(localID, "", "")
}

function _anyVideoSource(localID){
  deviceSet = "";
  prepareID(localID);
  clientSources[localID]["video"] = "any";
  _setSources(localID, "", "")
}

function _noVideoSource(localID){
  deviceSet = "";
  prepareID(localID);
  clientSources[localID]["video"] = "";
  _setSources(localID, "", "")
}

function _setSources(localID, audioLabel, videoLabel){
  deviceSet = "";

  prepareID(localID);

  if(audioLabel != ""){
    clientSources[localID]["audio"] = availableSources["audio"].find(function (element) {
      return element.label == audioLabel
    });
  }

  if(videoLabel != ""){
    clientSources[localID]["video"] = availableSources["video"].find(function (element) {
      return element.label == videoLabel
    });
  }

  clientSources[localID]["constraints"] = {
    audio: false,
    video: false
  };
  clientSources[localID]["local constraints"] = {
    audio: false,
    video: false
  };

  if(clientSources[localID]["audio"] == "any"){
    clientSources[localID]["constraints"]["audio"] = true;
  }
  else if(clientSources[localID]["audio"] != "") {
    clientSources[localID]["constraints"]["audio"] = {deviceId: {exact: clientSources[localID]["audio"].deviceId}};
  } else {
    console.log(localID + " Currently no audio selected");
  }

  if(clientSources[localID]["video"] == "any"){
    clientSources[localID]["constraints"]["video"] = true;
    clientSources[localID]["local constraints"]["video"] = true;
  }
  else if(clientSources[localID]["video"] != "") {
    clientSources[localID]["constraints"]["video"] = {deviceId: {exact: clientSources[localID]["video"].deviceId}};
    clientSources[localID]["local constraints"]["video"] = {deviceId: {exact: clientSources[localID]["video"].deviceId}};
  } else {
    console.log(localID + " Currently no video selected");
  }

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

  prepareID(ID);

  var video = document.createElement('video');
  video.setAttribute('autoplay', 'true');
  video.setAttribute('object-fit', 'cover');
  video.setAttribute('width', '320px');
  video.setAttribute('height', '240px');
  video.setAttribute('id', 'VidOf' + ID);

  try {
    let localStream = await navigator.mediaDevices.getUserMedia(clientSources[ID]["local constraints"]);
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

async function _createOffer(localID, foreignID) {

  if((localID in peerData && foreignID in peerData[localID]) &&
    (peerData[localID][foreignID].pc.connectionState == "connected" ||
    peerData[localID][foreignID].pc.connectionState == "connecting"))
  {
    peerData[localID][foreignID].dataStr = "call in progress";
    console.log("call already in progress");
  } else {
    await preparePC(localID, foreignID);

    var offerOptions = {
      offerToReceiveAudio: 1,
      offerToReceiveVideo: 1
    };

    console.log(offerOptions);

    var offer = await peerData[localID][foreignID].pc.createOffer(offerOptions)
    await peerData[localID][foreignID].pc.setLocalDescription(offer);

    peerData[localID][foreignID].dataStr = JSON.stringify(offer);
  }
}

function prepareID(localID){
  if (!(localID in peerData)) {
    peerData[localID] = {};
  }

  if(!(localID in clientSources)){
    clientSources[localID] = {};
    clientSources[localID]["audio"] = "";
    clientSources[localID]["video"] = "";
  }
}

async function preparePC(localID, foreignID){
  prepareID(localID);

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

  //let localStream = await navigator.mediaDevices.getUserMedia(clientSources[localID]["local constraints"]);

  if(clientSources[localID]["audio"] != "" || clientSources[localID]["video"] != ""){
    peerData[localID][foreignID].localStream = await navigator.mediaDevices.getUserMedia(clientSources[localID]["constraints"]);
    peerData[localID][foreignID].localStream.getTracks().forEach((track) => {peerData[localID][foreignID].pc.addTrack(track); console.log("track attached");});
  }  else {
    console.log(localID + " has no constraints?");
  }
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

function _getConnectedIDs(localID){
  if (!(localID in peerData)) {
    return toLinksArray([]);
  }

  var arr = [];
  for (foreignID in peerData[localID]){
    if(peerData[localID][foreignID].pc.connectionState == "connected"){
      arr.push(foreignID);
    }
  }

  return toLinksArray(arr);
}

function _checkIfConnected(localID, foreignID){
  if (!(localID in peerData)) {
    return false;
  }

  if (!(foreignID in peerData[localID])) {
    return false;
  }

  return peerData[localID][foreignID].pc.connectionState == "connected";
}

var getConnectedIDs = LINKS.kify(_getConnectedIDs);
var checkIfConnected = LINKS.kify(_checkIfConnected);

var playLocalVideo = LINKS.kify(_playLocalVideo);
var createOffer = LINKS.kify(_createOffer);
var createAnswer = LINKS.kify(_createAnswer);
var createAccept = LINKS.kify(_createAccept);
var hangup = LINKS.kify(_hangup);
var hangupAll = LINKS.kify(_hangupAll);

var collectSources = LINKS.kify(_collectSources);
var checkSourcesCollected = LINKS.kify(_checkSourcesCollected);

var getAudioSources =  LINKS.kify(_getAudioSources);
var getVideoSources = LINKS.kify(_getVideoSources);
var setSources = LINKS.kify(_setSources);
var noAudioSource = LINKS.kify(_noAudioSource);
var anyAudioSource = LINKS.kify(_anyAudioSource);
var noVideoSource = LINKS.kify(_noVideoSource);
var anyVideoSource = LINKS.kify(_anyVideoSource);

var setWriteLoc = LINKS.kify(_setWriteLoc);

var checkDeviceSet = LINKS.kify(_checkDeviceSet);

var setOutgoingAudio = LINKS.kify(_setOutgoingAudio);
var setOutgoingVideo = LINKS.kify(_setOutgoingVideo);
var setIncomingAudio = LINKS.kify(_setIncomingAudio);
var setIncomingVideo = LINKS.kify(_setIncomingVideo);

var checkAsyncDone = LINKS.kify(_checkAsyncDone);

var checkForIceCandidates = LINKS.kify(_checkForIceCandidates);
var newRemoteCandidate = LINKS.kify(_newRemoteCandidate);
