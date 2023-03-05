const peerConnections = {};
const disconnectTimes = {};

const peerConnectionConfig = {
  'iceServers': [
    { 'urls': 'stun:stun.stunprotocol.org:3478' },
    { 'urls': 'stun:stun.l.google.com:19302' },
  ]
};

let localID;
let audioTrackOnly = false;
let localVideoTrack;
let localAudioTrack;
let localVideoTrackLoaded = false;
let localAudioTrackLoaded = false;
let cameraIds = null;
let micIds = null;
let cameraLabels = null;
let micLabels = null;
let gotCameraDevices = false;
let gotMicDevices = false;
let begunIceSearch = false;

function cons(x, xs) { return {_head: x, _tail: xs}}

function _gatherMediaDeviceIds(type) {
  let mediaDeviceIds = null;
  let mediaDeviceLabels = null;
  navigator.mediaDevices.enumerateDevices().then(function(devices) {
    devices.forEach(function(device) {
      if (device.kind == type) {
        mediaDeviceIds = cons(device.deviceId, mediaDeviceIds);
        mediaDeviceLabels = cons(device.label, mediaDeviceLabels);
      }
    });
    if (type == "videoinput") {
      cameraIds = mediaDeviceIds;
      cameraLabels = mediaDeviceLabels;
      gotCameraDevices = true;
    } else {
      micIds = mediaDeviceIds;
      micLabels = mediaDeviceLabels;
      gotMicDevices = true;
    }
  })
}

function _checkDevicesGathered(type) {
  return type == "videoinput" ? gotCameraDevices : gotMicDevices;
}

function _getMediaDeviceIds(type) {
  return type == "videoinput" ? cameraIds : micIds;
}

function _getMediaDeviceLabels(type) {
  return type == "videoinput" ? cameraLabels : micLabels;
}

function _checkIfCameraLoaded() {
  return localVideoTrackLoaded;
}

function _checkIfMicLoaded() {
  return localAudioTrackLoaded;
}

function _getCameraReady(camId) {
  if (camId == "_") {
    camId = null;
  }
  const constraints = {
    video: {
      width: {max: 200},
      height: {max: 150},
      frameRate: {max: 60},
      deviceId: camId
    },
    audio: false
  };
  navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
    localVideoTrack = stream.getVideoTracks()[0];
    localVideoTrackLoaded = true;
  }).catch(error => {
    console.error('Error opening video camera.', error);
  });
}

function _getMicReady(micId) {
  if (micId == "_") {
    micId = null;
  }
  const constraints = {
    video: false,
    audio: {
      deviceId: micId
    }
  };
  navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
    localAudioTrack = stream.getAudioTracks()[0];
    localAudioTrackLoaded = true;
  }).catch(error => {
    console.error('Error opening audio device', error);
  });
}

function _createLocalStreamElement() {
  let vidElement = document.createElement('video');
  vidElement.setAttribute('id', 'localVideoTemp');
  vidElement.setAttribute('autoplay', 'true');
  vidElement.setAttribute('hidden', 'true');
  vidElement.muted = true;
  vidElement.srcObject = new MediaStream([localVideoTrack, localAudioTrack]);
  document.body.appendChild(vidElement);
}

function _setAudioOnly() {
  audioTrackOnly = true;
}

function _setUpPC(peerUuid, connectionID) {
  let connID;
  if (connectionID != "_") {
    connID = connectionID;
  } else {
    connID = getUniqueID();
  }
  peerConnections[peerUuid] = {'pc': new RTCPeerConnection(peerConnectionConfig),
                              'iceCandidates': [],
                              'localDescSet': false,
                              'remoteDescSet': false,
                              'streamAdded': false,
                              'videoTrack': null,
                              'audioTrack': null,
                              'timeConnected': Date.now() + 100000,
                              'connectionID': connID
                            };
  peerConnections[peerUuid].pc.onicecandidate = event => {
    if (peerConnections[peerUuid] && event.candidate != null) {
      peerConnections[peerUuid].iceCandidates.push(event.candidate);
    }
  }
  peerConnections[peerUuid].pc.ontrack = event => {
    gotRemoteTrack(event, peerUuid);
  }
  peerConnections[peerUuid].pc.oniceconnectionstatechange = event => {
    checkPeerStateChange(event, peerUuid);
  }
  if (audioTrackOnly == false) {
    peerConnections[peerUuid].pc.addTrack(localVideoTrack);
  }
  peerConnections[peerUuid].pc.addTrack(localAudioTrack);
}

function _updateConnectionID(peerID, connID) {
  if (peerConnections[peerID]) {
    peerConnections[peerID].connectionID = connID;
  }
}

function _connectionInitiatedWithPeer(peerUuid) {
  if (peerConnections[peerUuid]) {
    return true;
  } else {
    return false;
  }
}

function _setLocalDescForPC(peerUuid, sdpType) {
  if (!peerConnections[peerUuid] || _checkIfConnectedToPeer(peerUuid)) return;
  if (sdpType == "offer") {
    peerConnections[peerUuid].pc.createOffer().then(function(description) {
      if (!peerConnections[peerUuid]) return;
      peerConnections[peerUuid].pc.setLocalDescription(description).then(() => {
        if (!peerConnections[peerUuid]) return;
        peerConnections[peerUuid].localDescSet = true;
      });
    });
  } else {
    peerConnections[peerUuid].pc.createAnswer().then(function(description) {
      if (!peerConnections[peerUuid]) return;
      peerConnections[peerUuid].pc.setLocalDescription(description).then(() => {
        if (!peerConnections[peerUuid]) return;
        peerConnections[peerUuid].localDescSet = true;
      });
    });
  }
}

function _setRemoteDescForPC(peerUuid, desc) {
  if (!peerConnections[peerUuid]) return;
  const localDesc = peerConnections[peerUuid].pc.localDescription;
  const remoteDesc = peerConnections[peerUuid].pc.remoteDescription;
  if (!!localDesc && !!remoteDesc) return;
  let sdpObj = JSON.parse(desc);
  let rtcDesc = new RTCSessionDescription(sdpObj.sdp);
  peerConnections[peerUuid].pc.setRemoteDescription(rtcDesc).then(function() {
    if (!peerConnections[peerUuid]) return;
    peerConnections[peerUuid].remoteDescSet = true;
  });
}

function _checkIfLocalDescSetForPC(peerUuid) {
  return !!peerConnections[peerUuid] ? peerConnections[peerUuid].localDescSet : false;
}

function _checkIfRemoteDescSetForPC(peerUuid) {
  return !!peerConnections[peerUuid] ? peerConnections[peerUuid].remoteDescSet : false;
}

function _getLocalDescForPC(peerUuid) {
  if (peerConnections[peerUuid]) {
    return JSON.stringify({'sdp': peerConnections[peerUuid].pc.localDescription});
  }
  return "_";
}

function gotRemoteTrack(event, peerUuid) {
  let track = event.track;
  if (peerConnections[peerUuid] && !document.getElementById('remoteVideo_' + peerUuid + 'Temp')) {
    if (track.kind == "video") {
      peerConnections[peerUuid].videoTrack = track;
    } else {
      peerConnections[peerUuid].audioTrack = track;
    }
    const videoTrack = peerConnections[peerUuid].videoTrack;
    const audioTrack = peerConnections[peerUuid].audioTrack;
    if (videoTrack && audioTrack) {
      const vidElement = document.createElement('video');
      vidElement.setAttribute('id', 'remoteVideo_' + peerUuid + 'Temp');
      vidElement.srcObject = new MediaStream([videoTrack, audioTrack]);
      document.body.appendChild(vidElement);
    } else if (!!audioTrack && audioTrackOnly == true) {
      const audElement = document.createElement('audio');
      audElement.setAttribute('id', 'remoteAudio_' + peerUuid + 'Temp');
      audElement.srcObject = new MediaStream([audioTrack]);
      document.body.appendChild(audElement);
    }
  }
}

function checkPeerStateChange(event, peerUuid) {
  if (peerConnections[peerUuid]) {
    const state = peerConnections[peerUuid].pc.iceConnectionState;
    console.log(`connection with peer, ${peerUuid} ${state}`);
    if (state == "connected") {
      peerConnections[peerUuid].timeConnected = Date.now();
    }
    if (state == "failed" || state == "closed" || state == "disconnected") {
      delete peerConnections[peerUuid];
    }
  }
}

function _checkIfConnectedToPeer(peerUuid) {
  if (peerConnections[peerUuid]) {
    let state = peerConnections[peerUuid].pc.iceConnectionState;
    return state == "connected" ? true : false;
  }
}

function _checkIfPCObjectExists(peerUuid) {
  return !!peerConnections[peerUuid];
}

function _oneSecondElapsed(id) {
  if (!peerConnections[id]) return false;
  const timeConnected = peerConnections[id].timeConnected;
  const currentTime = Date.now();
  const timeElapsed = currentTime - timeConnected;
  return timeElapsed >= 1000;
}

function _getBegunIceSearch() {
  return begunIceSearch;
}

function _setBegunIceSearch() {
  begunIceSearch = true;
}

function _disconnectedForSecond(id) {
  if (!disconnectTimes[id]) return true;
  const timeElapsed = Date.now() - disconnectTimes[id];
  return timeElapsed >= 1000;
}

function _disconnectFromUser(peerUuid) {
  if (peerConnections[peerUuid]) {
    console.log(`disconnecting from peer, ${peerUuid}`);
    peerConnections[peerUuid].pc.close();
    delete peerConnections[peerUuid];
    disconnectTimes[peerUuid] = Date.now();
  }
}

function _collectCandidates() {
  let candidates = {};
  for (const peer in peerConnections) {
    candidates[peer] = [];
    for (let i = 0; i < peerConnections[peer].iceCandidates.length; i++) {
      candidates[peer].push(peerConnections[peer].iceCandidates[i]);
    }
    peerConnections[peer].iceCandidates = [];
  }
  for (const peer in candidates) {
    if (candidates[peer].length > 0) {
      return JSON.stringify(candidates);
    }
  }
  return "No candidates";
}

function _addCandidates(candidates, peerUuid) {
  if (!peerConnections[peerUuid]) return;
  let iceCandidates = JSON.parse(candidates);
  for (const uuid in iceCandidates) {
    if (uuid == localID) {
      let iceList = iceCandidates[uuid];
      for (let i = 0; i < iceList.length; i++) {
        let newIce = new RTCIceCandidate(iceList[i]);
        peerConnections[peerUuid].pc.addIceCandidate(newIce);
      }
    }
  }
}

function _getConnectionID(peerID) {
  if (peerConnections[peerID]) {
    return peerConnections[peerID].connectionID;
  } else {
    return "No PC object";
  }
}

function getUniqueID() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }

  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

function _setLocalID(id) {
  /*
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }

  localUuid = s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
  */
  localID = id;
}

function _getLocalID() {
  return localID
}

let gatherMediaDeviceIds = LINKS.kify(_gatherMediaDeviceIds);
let checkDevicesGathered = LINKS.kify(_checkDevicesGathered);
let getMediaDeviceIds = LINKS.kify(_getMediaDeviceIds);
let getMediaDeviceLabels = LINKS.kify(_getMediaDeviceLabels);
let checkIfCameraLoaded = LINKS.kify(_checkIfCameraLoaded);
let checkIfMicLoaded = LINKS.kify(_checkIfMicLoaded);
let getCameraReady = LINKS.kify(_getCameraReady);
let getMicReady = LINKS.kify(_getMicReady);
let createLocalStreamElement = LINKS.kify(_createLocalStreamElement);
let setAudioOnly = LINKS.kify(_setAudioOnly);
let setLocalID = LINKS.kify(_setLocalID);
let getLocalID = LINKS.kify(_getLocalID);
let setUpPC = LINKS.kify(_setUpPC);
let updateConnectionID = LINKS.kify(_updateConnectionID);
let connectionInitiatedWithPeer = LINKS.kify(_connectionInitiatedWithPeer);
let setLocalDescForPC = LINKS.kify(_setLocalDescForPC);
let checkIfLocalDescSetForPC = LINKS.kify(_checkIfLocalDescSetForPC);
let getLocalDescForPC = LINKS.kify(_getLocalDescForPC);
let setRemoteDescForPC = LINKS.kify(_setRemoteDescForPC);
let checkIfRemoteDescSetForPC = LINKS.kify(_checkIfRemoteDescSetForPC);
let checkIfConnectedToPeer = LINKS.kify(_checkIfConnectedToPeer);
let checkIfPCObjectExists= LINKS.kify(_checkIfPCObjectExists);
let oneSecondElapsed = LINKS.kify(_oneSecondElapsed);
let getBegunIceSearch = LINKS.kify(_getBegunIceSearch);
let setBegunIceSearch = LINKS.kify(_setBegunIceSearch);
let disconnectedForSecond = LINKS.kify(_disconnectedForSecond);
let disconnectFromUser = LINKS.kify(_disconnectFromUser);
let collectCandidates = LINKS.kify(_collectCandidates);
let addCandidates = LINKS.kify(_addCandidates);
let getConnectionID = LINKS.kify(_getConnectionID);