const peerUuids = [];
const messageTimes = [];
let imgURL = "";
const adjectives = ["Excited", "Anxious", "Demonic", "Jumpy", 
                   "Misunderstood", "Squashed", "Gargantuan","Broad", "Crooked", 
                   "Curved", "Deep", "Even", "Impartial", "Certain", "Eight", 
                   "Grubby", "Wiry", "Half", "Merciful", "Uppity", 
                   "Ahead", "Rainy", "Sunny", "Boorish", "Spiffy", "Flat", "Hilly", 
                   "Jagged", "Round", "Shallow", "Square", "Steep", "Straight", 
                   "Thick", "Thin", "Cooing", "Deafening", "Faint", "Harsh", 
                   "High-pitched", "Hissing", "Hushed", "Husky", "Loud", "Melodic", 
                   "Moaning", "Mute", "Noisy", "Purring", "Quiet", "Raspy", 
                   "Screeching", "Shrill", "Silent", "Soft", "Squeaky", "Squealing", 
                   "Thundering", "Voiceless", "Whispering", "Stupid", "Dumb", 
                   "Lovely", "Horrid", "Weird", "Flabby", "Silly", "Mup", "Blab", 
                   "Green", "Blue", "Yelly", "Pure", "Maroon", "Flump", "Flob", 
                   "Red", "Poop", "Sloop", "Fyip", "Gymby", "Stapid", "Mallop",
                   "Vexing", "Aback", "Scared", "Wimp", "Weakly", "Intery", "Massive", 
                   "Party", "Teensy", "Meany", "Malder", "Coper", "Seether", "Crap",
                   "OOTW", "GOAT", "Overweight"];

function _getName(id) {
  return adjectives[id-1];
}

function average(arr) {
  return arr.reduce((a, b) => a + b) / arr.length;
}

function _createAverageTimeButton() {
  const button = document.createElement('button');
  button.setAttribute('id', 'average-times');
  button.innerHTML = 'Get average times';
  document.body.appendChild(button);
  button.addEventListener('click', function() {
    const avg = average(messageTimes);
    alert('Average processing time: ' + avg);
  })
}

function _addMessageTime(tm) {
  messageTimes.push(tm);
}

function _checkLocalVidExists() {
  const localVid = document.getElementById('localVideoDiv');
  return !!localVid ? true : false;
}

function arrangeVideoDivs(pos) {
  for (let i = pos; i < peerUuids.length; i++) {
    const divElement = document.getElementById('remoteVideo_' + peerUuids[i] + 'Div');
    const leftPosStr = window.getComputedStyle(divElement).left;
    const leftPos = parseInt(leftPosStr.substring(0, leftPosStr.length-2));
    divElement.setAttribute('style', 'position: absolute; left: ' + (leftPos-200) + 'px;');
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
    divElement.appendChild(newLocalVid);
    document.body.appendChild(divElement);
  } else {
    divElement.appendChild(newLocalVid);
    const peerCount = peerUuids.length;
    divElement.setAttribute('style', 'position: absolute; left: ' + ((peerCount-1)*200).toString() + 'px;');
    const videoContainer = document.getElementById('streamScroll'); 
    videoContainer.appendChild(divElement);
  }
  document.body.removeChild(localVid);
  //arrangeVideoDivs();
}

function _addAudio(id) {
  if (!!document.getElementById('remoteAudio_' + id + 'Temp') && !document.getElementById('remoteAudio_' + id + 'Div')) {
    _addPeerToList(id);
    const divElement = document.createElement('div');
    divElement.setAttribute('id', 'remoteAudio_' + id + 'Div');
    const localAud = document.getElementById('remoteAudio_' + id + 'Temp')
    const newLocalAud = document.createElement('audio');
    newLocalAud.setAttribute('id', id);
    newLocalAud.setAttribute('autoplay', 'true');
    newLocalAud.srcObject = localAud.srcObject;
    divElement.appendChild(newLocalAud);
    document.body.appendChild(divElement);
    document.body.removeChild(localAud);
  }
}

function _displayLiveStream(id) {
  //console.log("Displaying stream of " + id);
  if (id == 0 && !!document.getElementById('localVideoTemp') && !document.getElementById('localVideoDiv')) {
    appendVidToDiv('localVideo', true);
  } else if (id != 0 && !!document.getElementById('remoteVideo_' + id + 'Temp') && !document.getElementById('remoteVideo_' + id + 'Div')) {
    _addPeerToList(id);
    appendVidToDiv('remoteVideo_' + id, false);
    console.log("Displayed " + id);
  } else if (id != 0 && !!document.getElementById('remoteVideo_' + id + 'Temp') && !!document.getElementById('remoteVideo_' + id + 'Div')) {
    _removePeerVideoDiv(id);
    _addPeerToList(id);
    appendVidToDiv('remoteVideo_' + id, false);
  }
}

function _removeLocalVid() {
  const localVid = document.getElementById('localVideoDiv');
  document.body.removeChild(localVid);
}

function _displayedPeerStream(id) {
  const peerVidDiv = document.getElementById('remoteVideo_' + id + 'Div');
  const peerAudDiv = document.getElementById('remoteAudio_' + id + 'Div');
  if (!!peerVidDiv || !!peerAudDiv) {
    return true;
  } else {
    return false;
  }
}

function _removePeerVideoDiv(peerUuid) {
  const videoContainer = document.getElementById('streamScroll');
  let div = document.getElementById('remoteVideo_' + peerUuid + 'Div');
  let div2 = document.getElementById('remoteVideo_' + peerUuid + 'Temp');
  if (div) {
    videoContainer.removeChild(div);
    const index = peerUuids.indexOf(peerUuid);
    peerUuids.splice(index, 1);
    arrangeVideoDivs(index);
  } else if (div2) {
    document.body.removeChild(div2);
  }
}

function _removePeerAudioDiv(peerUuid) {
  let div = document.getElementById('remoteAudio_' + peerUuid + 'Div');
  let div2 = document.getElementById('remoteAudio_' + peerUuid + 'Temp');
  if (div) {
    document.body.removeChild(div);
    const index = peerUuids.indexOf(peerUuid);
    peerUuids.splice(index, 1);
  } else if (div2) {
    document.body.removeChild(div2);
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
  peerUuids.push(uuid);
}

let addMessageTime = LINKS.kify(_addMessageTime);
let createAverageTimeButton = LINKS.kify(_createAverageTimeButton);
let addAudio = LINKS.kify(_addAudio);
let displayLiveStream = LINKS.kify(_displayLiveStream);
let displayedPeerStream = LINKS.kify(_displayedPeerStream);
let removePeerVideoDiv = LINKS.kify(_removePeerVideoDiv);
let removePeerAudioDiv = LINKS.kify(_removePeerAudioDiv);
let takePicture = LINKS.kify(_takePicture);
let removeLocalVid = LINKS.kify(_removeLocalVid);
let getPictureURL = LINKS.kify(_getPictureURL);
let displayIcon = LINKS.kify(_displayIcon);
let getSelectedOptions = LINKS.kify(_getSelectedOptions);
let addPeerToList = LINKS.kify(_addPeerToList);
let getName = LINKS.kify(_getName);
let checkLocalVidExists = LINKS.kify(_checkLocalVidExists);