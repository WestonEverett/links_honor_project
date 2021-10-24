async function _play_video() {

  const constraints = window.constraints = {
    audio: true,
    video: true
  };

  const video = document.querySelector('video');

  try {
    video.srcObject  = await navigator.mediaDevices.getUserMedia(constraints);
  } catch (e) {
    console.error("video error", e);
  }
}

var play_video = LINKS.kify(_play_video);
