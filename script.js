const startButton = document.getElementById("startButton");
const completedCyclesElement = document.getElementById("completedCycles");

const longBeep = new Howl({
  src: ['beep-long.mp3']
});
const shortBeep = new Howl({
  src: ['beep-short.mp3']
});

const cyclesText = "Your all time completed cycles: ";


function playAudio(audio) {
  try {
    audio.stop()
    audio.play();
  } catch (error) {
    console.error("Error playing audio:", error);
  }
}

function updateTimeMessage(newMessage, newTime) {
  const timeDiv = document.getElementById('time');
  timeDiv.innerHTML = `${newMessage}: <span class="highlight" id="timeLeft">${newTime}s</span>`;
}

function updateRoundsMessage(newMessage, newRounds) {
  const timeDiv = document.getElementById('rounds');
  timeDiv.innerHTML = `${newMessage}: <span class="highlight" id="roundsLeft">${newRounds}</span>`;
}

let roundsLeft = 8;
let isRest = false;
let interval;
let wakeLock = null;

// Load completed cycles from local storage
let completedCycles = localStorage.getItem("completedCycles")
  ? parseInt(localStorage.getItem("completedCycles"))
  : 0;
completedCyclesElement.textContent = `${cyclesText}${completedCycles}`;

function startTabata() {
  requestWakeLock();
  startButton.disabled = true;
  clearInterval(interval); // Clear any existing interval to avoid overlaps
  let timeLeft = isRest ? 20 : 10; // Set time for work or rest period
  let timeText = isRest ? "Work" : "Rest";
  updateTimeMessage(timeText, timeLeft)
  document.getElementById('bottomContainer').style.display = 'none';

  // Change background color based on the period
  document.body.className = isRest ? "restPeriod" : "workPeriod";
  changeThemeColor(isRest ? "--rest-period-bg" : "--work-period-bg")

  interval = setInterval(() => {
    // Play short beep for the last 3 seconds
    if (timeLeft <= 4 && timeLeft > 1) {
      playAudio(shortBeep);
    }

    if (timeLeft > 0) {
      timeLeft--;
      updateTimeMessage(timeText, timeLeft);
    }

    if (timeLeft === 0) {
      // Play long beep at the start of a new lap
      playAudio(longBeep);
      clearInterval(interval); // Stop the current interval
      if (isRest) {
        roundsLeft--;
        updateRoundsMessage("Rounds Left", roundsLeft)
        if (roundsLeft === 0) {
          completedCycles++;
          localStorage.setItem("completedCycles", completedCycles.toString());
          completedCyclesElement.textContent = `${cyclesText}${completedCycles}`;
          startButton.disabled = false;
          roundsLeft = 8; // Reset for next cycle
          updateRoundsMessage("Rounds Left", roundsLeft)
          updateTimeMessage("Start from rest", 10)
          document.body.className = ""; // Reset background color
          changeThemeColor("--default-bg")
          releaseWakeLock();
          document.getElementById('bottomContainer').style.display = 'flex';
          return; // Exit the function to prevent restarting the interval
        }
        isRest = false; // Switch to work period
      } else {
        isRest = true; // Switch to rest period
      }
      startTabata(); // Start next lap
    }
  }, 1000);

  stopButton.addEventListener("click", () => {
    clearInterval(interval); // Stop the current interval
    startButton.disabled = false; // Enable the start button
    roundsLeft = 8; // Reset rounds
    isRest = false; // Reset to start with work period
    updateRoundsMessage("Rounds Left", roundsLeft)
    // Reset time element text
    updateTimeMessage("Start from rest", 10)
    document.body.className = ""; // Reset background colo
    changeThemeColor("--default-bg")
    releaseWakeLock();
    document.getElementById('bottomContainer').style.display = 'flex';
  });
}

startButton.addEventListener("click", () => {
  isRest = false; // Start with work period
  playAudio(longBeep);
  startTabata();
});

const stopButton = document.getElementById("stopButton");

async function requestWakeLock() {
  if ("wakeLock" in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request("screen");
      console.log("Wake Lock is active");
      wakeLock.addEventListener("release", () => {
        console.log("Wake Lock was released");
      });
    } catch (err) {
      console.error(`${err.name}, ${err.message}`);
    }
  }
}

function releaseWakeLock() {
  if (wakeLock != null) {
    wakeLock.release().then(() => {
      wakeLock = null;
      console.log("Wake Lock was released");
    });
  }
}

function changeThemeColor(variableName) {
  // Get the value of the CSS variable
  const color = getComputedStyle(document.documentElement).getPropertyValue(variableName);
  
  // Find the <meta name="theme-color"> tag
  const themeColorMetaTag = document.querySelector('meta[name="theme-color"]');
  
  // Change the content attribute to the new color
  themeColorMetaTag.setAttribute("content", color.trim()); // trim() is used to remove any potential whitespace
}

let deferredPrompt;

const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
const isiPhone = /iPhone/i.test(navigator.userAgent);
function isSafari() {
  const userAgent = window.navigator.userAgent;
  const isChrome = userAgent.indexOf('Chrome') > -1;
  const isEdge = userAgent.indexOf('Edg') > -1; // Edge's user agent contains 'Edg'
  const isSafari = userAgent.indexOf('Safari') > -1 && !isChrome && !isEdge;
  return isSafari;
}

if (isStandalone || isiPhone || isSafari()) {
  document.getElementById('addToHomeScreenContainer').style.display = 'none';
} else {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    // Show the button when the criteria for A2HS are met
    document.getElementById('addToHomeScreenContainer').style.display = 'flex';
  });
}

document.getElementById('addToHomeScreen').addEventListener('click', async () => {
  if (deferredPrompt) {
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the A2HS prompt');
    } else {
      console.log('User dismissed the A2HS prompt');
    }
    // After the prompt is resolved, reset deferredPrompt
    deferredPrompt = null;
    // Hide the button after the prompt is resolved
    document.getElementById('addToHomeScreenContainer').style.display = 'none';
  }
});

window.addEventListener('appinstalled', () => {
  // Hide the app-provided install promotion
  document.getElementById('addToHomeScreenContainer').style.display = 'none';
  // Clear the deferredPrompt so it can be garbage collected
  deferredPrompt = null;
  console.log('PWA was installed');
});

document.addEventListener('DOMContentLoaded', function() {
  var elem = document.documentElement; // Full screen element
  var fullscreenButton = document.getElementById('fullscreen-toggle');
  var fullscreenIcon = document.getElementById('fullscreen-icon');
  var exitFullscreenIcon = document.getElementById('exit-fullscreen-icon');
  fullscreenIcon.style.display = 'block';
  exitFullscreenIcon.style.display = 'none';

  if (isiPhone) {
    fullscreenButton.style.display = 'none';
  }

  fullscreenButton.addEventListener('click', function() {
    if (!document.fullscreenElement && !window.navigator.standalone) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.mozRequestFullScreen) { /* Firefox */
        elem.mozRequestFullScreen();
      } else if (elem.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
        elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) { /* IE/Edge */
        elem.msRequestFullscreen();
      }
      fullscreenIcon.style.display = 'none';
      exitFullscreenIcon.style.display = 'block';
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.mozCancelFullScreen) { /* Firefox */
        document.mozCancelFullScreen();
      } else if (document.webkitExitFullscreen) { /* Chrome, Safari and Opera */
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) { /* IE/Edge */
        document.msExitFullscreen();
      }
      fullscreenIcon.style.display = 'block';
      exitFullscreenIcon.style.display = 'none';
    }
  });
});