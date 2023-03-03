var peerConnectionConfig = {
    'iceServers': [
      {'urls': 'stun:stun.stunprotocol.org:3478'},
      {'urls': 'stun:stun.l.google.com:19302'},
      {'urls': 'stun:stun.services.mozilla.com'}
    ]
};

peerConnections = {}

var videoStream = false;

function _getLocalVideo(){
    var video = document.getElementById("localVideo")

    var constraints = {
      audio: true,
      video: true
      // video: {
      //  facingMode: "user"
      // }
    };
    console.log("before streaming")
    /* Stream it to video element */
    navigator.mediaDevices.getUserMedia(constraints).then(function success(stream) {
      localStream = new MediaStream()
      localStream.addTrack(stream.getVideoTracks()[0])
      console.log(stream.getVideoTracks())
      video.srcObject = localStream;
      console.log("should be streaming");
      videoStream = true;
    });

}

function _isLocalVideo(){
  return videoStream
}


function _setupRTCConnection(pid){
    console.log("setting up RTC Connection");
    connection = new RTCPeerConnection(peerConnectionConfig);
    connection.onicecandidate = event => newIceCandidate(event, pid);
    connection.ontrack = event => newRemoteTrack(event, pid);
    // getLocalVideo();
    var localvideo = document.getElementById("localVideo");
    console.log(localvideo.srcObject)
    connection.addStream(localvideo.srcObject);
    peerConn = {
        connection: connection,
        iceCandidates: [],
        isNewIceCandidate: false,
        remoteElement: null,
    };
    console.log("setting up rtc connection")
    console.log(pid)
    peerConnections[pid._clientPid] = peerConn;
}

function _closeRTCConnection(pid){
    console.log("CLOSING CONNECTION")
    console.log(pid._clientPid);
    console.log(Object.keys(peerConnections))
    if (pid._clientPid in peerConnections){
        peerConnections[pid._clientPid].connection.close();
        peerConnections[pid._clientPid].remoteElement.remove();
        delete peerConnections[pid._clientPid];
    }
}

function newIceCandidate(event, pid){
    console.log("new ice candidate")
    console.log(pid)
    if(event.candidate != null){
        // console.log(event.candidate)
        peerConnections[pid._clientPid].iceCandidates.push(event.candidate);
        peerConnections[pid._clientPid].isNewIceCandidate = true;
    };
}

function _getIsNewIceCandidate(pid){
    if(pid._clientPid in peerConnections){
        if (peerConnections[pid._clientPid].isNewIceCandidate){
            return "True";
        }
        else{
            return "False";
        }
    }else{
        return "End";
    }
}

function newRemoteTrack(event, pid){
    if(!event){
        return null
    }
    else{
        // console.log("event = ", event);
        remotevideo = document.getElementById("remoteVideo");
        remoteStream = new MediaStream();
        remoteStream.addTrack(event.track);
        // console.log(remoteStream)
        newVid = document.createElement("video")
        newVid.setAttribute('object-fit', 'cover');
        newVid.setAttribute('width', '320px');
        newVid.setAttribute('height', '240px');
        newVid.setAttribute("autoplay", "true")
        newVid.srcObject = event.streams[0];
        peerConnections[pid._clientPid].remoteElement = newVid;
        remoteVideo.appendChild(newVid);
        console.log(event.streams);
    }
    return
}

function _getNewIceCandidates(pid){
    console.log("getting ice candidates")
    console.log(pid)
    candidates = peerConnections[pid._clientPid].iceCandidates.pop(0);
    if (peerConnections[pid._clientPid].iceCandidates.length == 0){
        peerConnections[pid._clientPid].isNewIceCandidate = false
    }
    return candidates;
}

function _addNewIceCandidates(pid, candidate){
    console.log("adding new ice candidate")
    // console.log(pid)
    // console.log(Object.keys(peerConnections))
    // console.log(peerConnections[pid._clientPid].connection)
    iceCandidate = new RTCIceCandidate(candidate)
    peerConnections[pid._clientPid].connection.addIceCandidate(iceCandidate)
    console.log("finished adding ice candidate")
}

function _createOfferSDP(pid){
    peerConnections[pid._clientPid].connection.createOffer( 
        {'OfferToReceiveAudio': true, 'OfferToReceiveVideo': true }
        ).then( function (offer){
            peerConnections[pid._clientPid].connection.setLocalDescription(offer)}
        );
}

function _getOfferSDP(pid){
    return peerConnections[pid._clientPid].connection.localDescription;
}

function _isLocalSDP(pid){
    // console.log("++++++++++++++++++")
    // console.log(peerConnections)
    // console.log(pid._clientPid)
    return !(!peerConnections[pid._clientPid].connection.localDescription);
}
function _isRemoteSDP(pid){
    // console.log("__________________")
    // console.log(peerConnections)
    // console.log(pid._clientPid)
    return !(!peerConnections[pid._clientPid].connection.remoteDescription);
}

function _receiveOfferSDP(pid, offer){
    console.log("receiving offer")
    console.log(pid);
    // console.log(Object.keys(peerConnections))
    if (offer.type == "offer"){
        peerConnections[pid._clientPid].connection.setRemoteDescription(new RTCSessionDescription(offer));
    }
    else{
        peerConnections[pid._clientPid].connection.setRemoteDescription(new RTCSessionDescription(offer));
    }
}

function _createAnswerSDP(pid){
    peerConnections[pid._clientPid].connection.createAnswer(
        { 'OfferToReceiveAudio': true, 'OfferToReceiveVideo': true }
        ).then( function (sessionDescription) {
        peerConnections[pid._clientPid].connection.setLocalDescription(sessionDescription);  
    });
}



var setupRTCConnection = LINKS.kify(_setupRTCConnection);
var getNewIceCandidates = LINKS.kify(_getNewIceCandidates);
var createOfferSDP = LINKS.kify(_createOfferSDP);
var getOfferSDP = LINKS.kify(_getOfferSDP);
var isLocalSDP = LINKS.kify(_isLocalSDP);
var isRemoteSDP = LINKS.kify(_isRemoteSDP);
var createAnswerSDP = LINKS.kify(_createAnswerSDP);
var receiveOfferSDP = LINKS.kify(_receiveOfferSDP);
var getLocalVideo = LINKS.kify(_getLocalVideo);
var isLocalVideo = LINKS.kify(_isLocalVideo);
var getIsNewIceCandidate = LINKS.kify(_getIsNewIceCandidate);
var addNewIceCandidates = LINKS.kify(_addNewIceCandidates);
var closeRTCConnection = LINKS.kify(_closeRTCConnection);