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

var playLocalVideo = LINKS.kify(_playLocalVideo);
