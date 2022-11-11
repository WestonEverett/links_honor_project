let peerUuids = {};
let imgURL = "";

function arrangeVideoDivs() {
  let multiplier = 0;
  for (uuid in peerUuids) {
    let divElement = document.getElementById('remoteVideo_' + uuid + 'Div');
    divElement.setAttribute('style', 'position: absolute; top: 20%; transform: translate(-50%, -50%); left: ' + (20 + (12*multiplier)).toString() + '%;');
    multiplier += 1;
  }
}

function appendVidToDiv(id, local) {
  let divElement = document.createElement('div');
  divElement.setAttribute('id', id + 'Div');
  let localVid = document.getElementById(id + 'Temp');
  let newLocalVid = document.createElement('video');
  newLocalVid.setAttribute('id', id);
  newLocalVid.setAttribute('class', 'webcam');
  newLocalVid.setAttribute('autoplay', 'true');
  newLocalVid.srcObject = localVid.srcObject;
  if (local) {
    divElement.setAttribute('class', 'cameraMode');
    newLocalVid.muted = true;
  }
  divElement.appendChild(newLocalVid);
  document.body.appendChild(divElement);
  arrangeVideoDivs();
}

function _displayLiveStream(id) {
  if (id == "local" && !document.getElementById('localVideoDiv')) {
    appendVidToDiv('localVideo', true);
  } else if (id != "local" && !document.getElementById('remoteVideo_' + id + 'Div')){
    if (document.getElementById('remoteVideo_' + id + 'Temp')) {
      appendVidToDiv('remoteVideo_' + id, false);
    }
  }
}

function _displayedPeerStream(id) {
  if (document.getElementById('remoteVideo_' + id + 'Div')) {
    return true;
  } else {
    return false;
  }
}

function _removePeerVideoDiv(peerUuid) {
  let div = document.getElementById('remoteVideo_' + peerUuid + 'Div');
  if (div) {
    document.body.removeChild(div);
    delete peerUuids[peerUuid];
    arrangeVideoDivs();
  }
}

function _takePicture() {
  let video = document.getElementById('localVideo');
  let canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
  imgURL = canvas.toDataURL();
}

function _getPictureURL() {
  return imgURL;
}

function _displayIcon(uuid, imageURL, x, y) {
  if (!document.getElementById('iconDiv' + uuid)) {
    let icon = document.createElement('img');
    icon.setAttribute('id', 'iconImg' + uuid);
    let iconDiv = document.createElement('div');
    iconDiv.setAttribute('id', 'iconDiv' + uuid);
    iconDiv.setAttribute('class', 'crop');
    iconDiv.setAttribute('style', 'left: ' + x + 'px;top: ' + y + 'px;position: absolute;width: 150px; height: 150px; border-radius: 50%;');
    icon.src = imageURL;
    iconDiv.appendChild(icon);
    document.body.appendChild(iconDiv);
  } else {
    let iconDiv = document.getElementById('iconDiv' + uuid);
    iconDiv.setAttribute('style', 'left: ' + x + 'px;top: ' + y + 'px;position: absolute;width: 150px; height: 150px; border-radius: 50%;');
  }
}

function _getSelectedOptions() {
  let selectElementCam = document.getElementById("selectCamera");
  let selectElementMic = document.getElementById("selectMic");
  let indexCam = selectElementCam.selectedIndex;
  let indexMic = selectElementMic.selectedIndex;
  let camId = selectElementCam.options[indexCam].value;
  let micId = selectElementMic.options[indexMic].value;
  let deviceIds = null;
  deviceIds = cons(camId, deviceIds);
  deviceIds = cons(micId, deviceIds);
  return deviceIds;
}

function _addPeerToList(uuid) {
  peerUuids[uuid] = uuid;
}

let displayLiveStream = LINKS.kify(_displayLiveStream);
let displayedPeerStream = LINKS.kify(_displayedPeerStream);
let removePeerVideoDiv = LINKS.kify(_removePeerVideoDiv);
let takePicture = LINKS.kify(_takePicture);
let getPictureURL = LINKS.kify(_getPictureURL);
let displayIcon = LINKS.kify(_displayIcon);
let getSelectedOptions = LINKS.kify(_getSelectedOptions);
let addPeerToList = LINKS.kify(_addPeerToList);
