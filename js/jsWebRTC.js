let peerConnections = {};

let peerConnectionConfig = {
  'iceServers': [
    { 'urls': 'stun:stun.stunprotocol.org:3478' },
    { 'urls': 'stun:stun.l.google.com:19302' },
  ]
};

let localID = "";
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

function _setUpPC(peerUuid) {
  peerConnections[peerUuid] = {'pc': new RTCPeerConnection(peerConnectionConfig),
                              'iceCandidates': [],
                              'localDescSet': false,
                              'remoteDescSet': false,
                              'streamAdded': false,
                              'videoTrack': null,
                              'audioTrack': null
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
  peerConnections[peerUuid].pc.addTrack(localVideoTrack);
  peerConnections[peerUuid].pc.addTrack(localAudioTrack);
}

function _connectionInitiatedWithPeer(peerUuid) {
  if (peerConnections[peerUuid]) {
    return true;
  } else {
    return false;
  }
}

function _setLocalDescForPC(peerUuid, sdpType) {
  if (!peerConnections[peerUuid]) return;
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
    let videoTrack = peerConnections[peerUuid].videoTrack;
    let audioTrack = peerConnections[peerUuid].audioTrack;
    if (videoTrack && audioTrack) {
      let vidElement = document.createElement('video');
      vidElement.setAttribute('id', 'remoteVideo_' + peerUuid + 'Temp');
      vidElement.srcObject = new MediaStream([videoTrack, audioTrack]);
      document.body.appendChild(vidElement);
    }
  }
}

function checkPeerStateChange(event, peerUuid) {
  if (peerConnections[peerUuid]) {
    let state = peerConnections[peerUuid].pc.iceConnectionState;
    console.log(`connection with peer, ${peerUuid} ${state}`);
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

function _getBegunIceSearch() {
  return begunIceSearch;
}

function _setBegunIceSearch() {
  begunIceSearch = true;
}

function _disconnectFromUser(peerUuid) {
  if (peerConnections[peerUuid]) {
    console.log(`disconnecting from peer, ${peerUuid}`);
    delete peerConnections[peerUuid];
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
  return localID;
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
let setLocalID = LINKS.kify(_setLocalID);
let getLocalID = LINKS.kify(_getLocalID);
let setUpPC = LINKS.kify(_setUpPC);
let connectionInitiatedWithPeer = LINKS.kify(_connectionInitiatedWithPeer);
let setLocalDescForPC = LINKS.kify(_setLocalDescForPC);
let checkIfLocalDescSetForPC = LINKS.kify(_checkIfLocalDescSetForPC);
let getLocalDescForPC = LINKS.kify(_getLocalDescForPC);
let setRemoteDescForPC = LINKS.kify(_setRemoteDescForPC);
let checkIfRemoteDescSetForPC = LINKS.kify(_checkIfRemoteDescSetForPC);
let checkIfConnectedToPeer = LINKS.kify(_checkIfConnectedToPeer);
let checkIfPCObjectExists= LINKS.kify(_checkIfPCObjectExists);
let getBegunIceSearch = LINKS.kify(_getBegunIceSearch);
let setBegunIceSearch = LINKS.kify(_setBegunIceSearch);
let disconnectFromUser = LINKS.kify(_disconnectFromUser);
let collectCandidates = LINKS.kify(_collectCandidates);
let addCandidates = LINKS.kify(_addCandidates);
