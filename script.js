/*--------------------------------------------------------------
>>> TABLE OF CONTENTS:
----------------------------------------------------------------
# Sound Class (WebAudio chime for completion)
  ## playSound()
# DOM Elements
# State
# Utilities
  ## zeroPad()
  ## clamp()
  ## saveSettings()
  ## loadSettings()
  ## updateMinuteValueUI()
  ## updateTimeReadout()
  ## updateProgressUI()
  ## updateAriaProgress()
  ## setTimerValue()
  ## requestNotifyPermissionCompat()
  ## updateNotificationUI()
  ## notify()
  ## playCompletionSound()
# Timer Engine
  ## startTimer()
  ## pauseTimer()
  ## resumeTimer()
  ## resetTimer()
  ## tick()
# Event Wiring
  ## plus/sub clicks
  ## start button (start/pause/resume)
  ## reset button
  ## presets
  ## custom minutes input
  ## mute toggle
  ## theme toggle
  ## notification button (toggle)
  ## keyboard shortcuts
# Init
--------------------------------------------------------------*/


/*--------------------------------------------------------------
 # Sound Class (WebAudio chime for completion)
--------------------------------------------------------------*/
var Sound = (function () {
  function Sound(context) {
    this.context = context;
  }

  Sound.prototype.setup = function setup() {
    this.oscillator = this.context.createOscillator();
    this.gainNode = this.context.createGain();
    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(this.context.destination);
    this.oscillator.type = "sine";
  };

  Sound.prototype.play = function play(value) {
    this.setup();
    this.oscillator.frequency.value = value;
    this.gainNode.gain.setValueAtTime(0, this.context.currentTime);
    this.gainNode.gain.linearRampToValueAtTime(1, this.context.currentTime + 0.01);
    this.oscillator.start(this.context.currentTime);
    this.stop(this.context.currentTime);
  };

  Sound.prototype.stop = function stop(time) {
    if (time === void 0) time = 1;
    this.gainNode.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + time);
    this.oscillator.stop(this.context.currentTime + time);
  };

  return Sound;
})();

var context = new (window.AudioContext || window.webkitAudioContext || false)();

if (!context) {
  // Basic alert for legacy browsers
  alert(
    "Sorry, but the Web Audio API is not supported by your browser." +
      " Please, consider downloading the latest version of " +
      "Google Chrome or Mozilla Firefox"
  );
}

/*--------------------------------------------------------------
   ## playSound()
--------------------------------------------------------------*/
function playSound(note, time) {
  if (time === void 0) time = 1000;
  if (!context) return;
  if (typeof context.resume === "function") {
    context.resume().catch(function () {});
  }
  var sound = new Sound(context);
  sound.play(note);
  sound.stop(time / 1000);
}

/*--------------------------------------------------------------
 ## DOM Elements
--------------------------------------------------------------*/
var secondsCircle = document.getElementById("seconds_circle");
var minutesCircle = document.getElementById("minutes_circle");
var minuteText = document.getElementById("minute_text");
var secondText = document.getElementById("second_text");
var sub = document.getElementById("sub");
var plus = document.getElementById("plus");

// Robustly select the <i> inside #minuteCount (avoid childNodes[0] whitespace bug)
var minuteCountContainer = document.getElementById("minuteCount");
var timerDisplay = minuteCountContainer ? minuteCountContainer.querySelector("i") : null;
if (!timerDisplay && minuteCountContainer) {
  timerDisplay = minuteCountContainer.firstElementChild;
}

var startBtn = document.getElementById("start");
var resetBtn = document.getElementById("reset");

// New UI elements from the enhanced HTML
var timeRemainingEl = document.getElementById("time-remaining");
var progressPctEl = document.getElementById("progress-percentage");
var presets = Array.prototype.slice.call(document.querySelectorAll(".preset"));
var minutesInput = document.getElementById("minutes-input");
var setMinutesBtn = document.getElementById("set-minutes");
var muteToggle = document.getElementById("mute-toggle");
var notifyBtn = document.getElementById("notify-permission");
var themeToggle = document.getElementById("theme-toggle");
var alarmAudio = document.getElementById("alarm-sound");

// Init stroke offsets (guard for null)
if (secondsCircle) secondsCircle.style.strokeDashoffset = 0;
if (minutesCircle) minutesCircle.style.strokeDashoffset = 500;

/*--------------------------------------------------------------
 # State
--------------------------------------------------------------*/
var DEFAULT_MIN = 1;
var DEFAULT_MAX = 180;

var timerValue = 25; // minutes
var activeTimer = null; // setTimeout handle
var timerIsActive = false; // currently counting down
var pausedRemainingMs = null; // remaining time when paused
var endTimeMs = null; // epoch ms goal
var baseDurationMs = null; // total duration in ms

// Settings persisted
var settings = {
  muted: false,
  theme: "auto", // "auto" | "light" | "dark"
  lastMinutes: 25,
  notificationsEnabled: true // app-level toggle when permission is granted
};

/*--------------------------------------------------------------
 # Utilities
--------------------------------------------------------------*/
function zeroPad(n) {
  n = n + "";
  return n.length >= 2 ? n : new Array(2 - n.length + 1).join(0) + n;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function saveSettings() {
  try {
    localStorage.setItem("timer.settings", JSON.stringify(settings));
  } catch (e) {}
}

function loadSettings() {
  try {
    var raw = localStorage.getItem("timer.settings");
    if (raw) {
      var parsed = JSON.parse(raw);
      if (typeof parsed.muted === "boolean") settings.muted = parsed.muted;
      if (parsed.theme === "auto" || parsed.theme === "light" || parsed.theme === "dark") {
        settings.theme = parsed.theme;
      }
      if (typeof parsed.lastMinutes === "number") {
        settings.lastMinutes = clamp(Math.round(parsed.lastMinutes), DEFAULT_MIN, DEFAULT_MAX);
      }
      if (typeof parsed.notificationsEnabled === "boolean") {
        settings.notificationsEnabled = parsed.notificationsEnabled;
      }
    }
  } catch (e) {}
}

function updateMinuteValueUI() {
  if (timerDisplay) timerDisplay.textContent = String(timerValue);

  if (!timerIsActive && pausedRemainingMs == null) {
    if (minuteText) minuteText.textContent = zeroPad(timerValue);
    if (secondText) secondText.textContent = ":00";
  }
  if (minutesCircle) minutesCircle.setAttribute("aria-valuemax", String(timerValue));
  if (timeRemainingEl && !timerIsActive && pausedRemainingMs == null) {
    timeRemainingEl.textContent = zeroPad(timerValue) + ":00";
  }
}

function updateTimeReadout(minutes, seconds) {
  if (timeRemainingEl) {
    timeRemainingEl.textContent = zeroPad(minutes) + ":" + zeroPad(seconds);
  }
  if (secondText) secondText.textContent = ":" + zeroPad(seconds);
  if (minuteText) minuteText.textContent = zeroPad(minutes);
}

function updateProgressUI(timeLeft, total) {
  if (!progressPctEl) return;
  var pct = total > 0 ? Math.min(100, Math.max(0, Math.round(((total - timeLeft) / total) * 100))) : 0;
  progressPctEl.textContent = pct + "%";
}

function updateAriaProgress(seconds, minutes, timeLeft, total) {
  if (secondsCircle) secondsCircle.setAttribute("aria-valuenow", String(clamp(seconds, 0, 60)));
  var minsRemaining = Math.max(0, Math.ceil(timeLeft / 60000));
  if (minutesCircle) minutesCircle.setAttribute("aria-valuenow", String(clamp(minsRemaining, 0, timerValue)));
}

/* Cross-browser permission request: Promise or callback form */
function requestNotifyPermissionCompat() {
  if (!("Notification" in window)) return Promise.resolve("denied");
  try {
    // Safari supports callback-style requestPermission(res => ...)
    if (Notification.requestPermission.length === 1) {
      return new Promise(function (resolve) {
        Notification.requestPermission(function (perm) {
          resolve(perm);
        });
      });
    }
    // Modern browsers return a Promise
    return Notification.requestPermission();
  } catch (e) {
    return Promise.resolve("denied");
  }
}

/* Update toggle button label/state based on support and permission */
function updateNotificationUI() {
  if (!notifyBtn) return;

  if (!("Notification" in window)) {
    notifyBtn.textContent = "Notifications Unsupported";
    notifyBtn.disabled = true;
    notifyBtn.setAttribute("aria-disabled", "true");
    notifyBtn.removeAttribute("aria-pressed");
    notifyBtn.title = "Your browser does not support Notifications API";
    return;
  }

  var perm = Notification.permission;
  if (perm === "granted") {
    notifyBtn.disabled = false;
    notifyBtn.removeAttribute("aria-disabled");
    notifyBtn.title = "Toggle in-app notifications";
    notifyBtn.setAttribute("aria-pressed", settings.notificationsEnabled ? "true" : "false");
    notifyBtn.textContent = "Notifications: " + (settings.notificationsEnabled ? "On" : "Off");
  } else if (perm === "default") {
    notifyBtn.disabled = false;
    notifyBtn.removeAttribute("aria-disabled");
    notifyBtn.removeAttribute("aria-pressed");
    notifyBtn.title = "Click to enable desktop notifications";
    notifyBtn.textContent = "Enable Notifications";
  } else {
    // denied
    notifyBtn.textContent = "Notifications Blocked";
    notifyBtn.disabled = true;
    notifyBtn.setAttribute("aria-disabled", "true");
    notifyBtn.removeAttribute("aria-pressed");
    notifyBtn.title = "Notifications are blocked. Allow them in your browser/site settings.";
  }
}

function setTimerValue(mins, opts) {
  if (opts === void 0) opts = { resetIfRunning: true };
  var coerced = clamp(Math.round(mins), DEFAULT_MIN, DEFAULT_MAX);
  if (timerIsActive && opts.resetIfRunning) {
    resetTimer(true);
  } else if (pausedRemainingMs != null && opts.resetIfRunning) {
    resetTimer(true);
  }
  timerValue = coerced;
  settings.lastMinutes = timerValue;
  saveSettings();
  updateMinuteValueUI();
}

function notify(title, body) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (!settings.notificationsEnabled) return;
  try {
    new Notification(title, { body: body });
  } catch (e) {
    // ignore
  }
}

function playCompletionSound() {
  if (settings.muted) return;
  if (context) {
    playWQ();
  } else if (alarmAudio && typeof alarmAudio.play === "function") {
    try {
      alarmAudio.currentTime = 0;
      alarmAudio.play().catch(function () {});
    } catch (e) {}
  }
}

/*--------------------------------------------------------------
 ## Westminster Quarters Chime
--------------------------------------------------------------*/
var notes = {
  gSharp4: 415.3,
  fSharp4: 369.99,
  e4: 329.63,
  b3: 246.94,
};

function playWQ() {
  if (secondsCircle) secondsCircle.classList.add("wq");
  if (minutesCircle) minutesCircle.classList.add("wq");

  playSound(notes.e4);
  if (secondsCircle) secondsCircle.style.strokeDashoffset = 375; // 1/4

  setTimeout(function () {
    playSound(notes.gSharp4);
    if (secondsCircle) secondsCircle.style.strokeDashoffset = 250; // 1/2
  }, 500);

  setTimeout(function () {
    playSound(notes.fSharp4);
    if (secondsCircle) secondsCircle.style.strokeDashoffset = 125; // 3/4
  }, 1000);

  setTimeout(function () {
    playSound(notes.b3, 2000);
    if (secondsCircle) secondsCircle.style.strokeDashoffset = 0; // full
  }, 1500);

  setTimeout(function () {
    playSound(notes.e4);
    if (minutesCircle) minutesCircle.style.strokeDashoffset = 125; // 3/4
  }, 2500);

  setTimeout(function () {
    playSound(notes.fSharp4);
    if (minutesCircle) minutesCircle.style.strokeDashoffset = 250; // 1/2
  }, 3000);

  setTimeout(function () {
    playSound(notes.gSharp4);
    if (minutesCircle) minutesCircle.style.strokeDashoffset = 375; // 1/4
  }, 3500);

  setTimeout(function () {
    playSound(notes.e4, 2000);
    if (minutesCircle) minutesCircle.style.strokeDashoffset = 500; // empty
  }, 4000);

  setTimeout(function () {
    if (secondsCircle) secondsCircle.classList.remove("wq");
    if (minutesCircle) minutesCircle.classList.remove("wq");
  }, 4250);
}

/*--------------------------------------------------------------
 # Timer Engine
--------------------------------------------------------------*/
function startTimer() {
  if (pausedRemainingMs != null && pausedRemainingMs > 0) {
    endTimeMs = Date.now() + pausedRemainingMs;
  } else {
    baseDurationMs = timerValue * 60000;
    endTimeMs = Date.now() + baseDurationMs;
    if (minutesCircle) minutesCircle.setAttribute("aria-valuemax", String(timerValue));
  }
  pausedRemainingMs = null;
  timerIsActive = true;
  if (startBtn) {
    startBtn.textContent = "Pause";
    startBtn.setAttribute("aria-pressed", "true");
  }
  tick();
}

function pauseTimer() {
  if (!timerIsActive) return;
  timerIsActive = false;
  if (activeTimer) {
    clearTimeout(activeTimer);
    activeTimer = null;
  }
  pausedRemainingMs = Math.max(0, endTimeMs - Date.now());
  if (startBtn) {
    startBtn.textContent = "Resume";
    startBtn.setAttribute("aria-pressed", "false");
  }
}

function resumeTimer() {
  if (timerIsActive) return;
  if (pausedRemainingMs == null || pausedRemainingMs <= 0) {
    startTimer();
  } else {
    startTimer();
  }
}

function resetTimer(skipSoundAndNotif) {
  if (skipSoundAndNotif === void 0) skipSoundAndNotif = false;
  timerIsActive = false;
  if (activeTimer) {
    clearTimeout(activeTimer);
    activeTimer = null;
  }
  pausedRemainingMs = null;
  endTimeMs = null;
  baseDurationMs = null;

  if (startBtn) {
    startBtn.textContent = "Start Timer";
    startBtn.setAttribute("aria-pressed", "false");
  }
  if (secondText) secondText.textContent = ":00";
  if (minuteText) minuteText.textContent = zeroPad(timerValue);
  if (secondsCircle) secondsCircle.style.strokeDashoffset = 0;
  if (minutesCircle) minutesCircle.style.strokeDashoffset = 500;
  updateTimeReadout(timerValue, 0);
  updateProgressUI(0, 1);
  updateAriaProgress(0, timerValue, timerValue * 60000, timerValue * 60000);

  if (!skipSoundAndNotif && alarmAudio && typeof alarmAudio.pause === "function") {
    try {
      alarmAudio.pause();
      alarmAudio.currentTime = 0;
    } catch (e) {}
  }
}

function tick() {
  if (!timerIsActive) return;
  var now = Date.now();
  var timeLeft = endTimeMs - now;

  if (timeLeft <= 0) {
    timerIsActive = false;
    activeTimer = null;

    updateTimeReadout(0, 0);
    if (secondsCircle) secondsCircle.style.strokeDashoffset = 0;
    if (minutesCircle) minutesCircle.style.strokeDashoffset = 500;
    updateProgressUI(0, baseDurationMs || 1);
    updateAriaProgress(0, 0, 0, baseDurationMs || 1);

    playCompletionSound();
    notify("Time's up!", "Your countdown has finished.");

    if (startBtn) {
      startBtn.textContent = "Start Timer";
      startBtn.setAttribute("aria-pressed", "false");
    }

    return;
  }

  var seconds = Math.floor((timeLeft / 1000) % 60);
  var minutes = Math.floor((timeLeft / 1000 / 60) % 60);

  updateTimeReadout(minutes, seconds);

  var secondsCircleLength = 500 - ((seconds / 60) * 500);
  var elapsed = (baseDurationMs - timeLeft);
  var minutesCircleLength = 500 - ((elapsed / baseDurationMs) * 500);

  if (seconds === 0) seconds = 60;
  if (secondsCircle) secondsCircle.style.strokeDashoffset = secondsCircleLength;
  if (minutesCircle) minutesCircle.style.strokeDashoffset = minutesCircleLength;

  updateProgressUI(timeLeft, baseDurationMs);
  updateAriaProgress(seconds, minutes, timeLeft, baseDurationMs);

  activeTimer = setTimeout(tick, 1000);
}

/*--------------------------------------------------------------
 # Event Wiring
--------------------------------------------------------------*/
// Increase / Decrease minutes
if (sub) {
  sub.onclick = function () {
    if (timerValue > DEFAULT_MIN) {
      setTimerValue(timerValue - 1, { resetIfRunning: false });
      if (!timerIsActive && pausedRemainingMs == null && minuteText) {
        minuteText.textContent = zeroPad(timerValue);
      }
    }
  };
}

if (plus) {
  plus.onclick = function () {
    if (timerValue < DEFAULT_MAX) {
      setTimerValue(timerValue + 1, { resetIfRunning: false });
      if (!timerIsActive && pausedRemainingMs == null && minuteText) {
        minuteText.textContent = zeroPad(timerValue);
      }
    }
  };
}

// Start/Pause/Resume
if (startBtn) {
  startBtn.onclick = function () {
    if (!timerIsActive && pausedRemainingMs == null) {
      startTimer();
    } else if (timerIsActive) {
      pauseTimer();
    } else {
      resumeTimer();
    }
  };
}

// Reset
if (resetBtn) {
  resetBtn.onclick = function () {
    resetTimer(true);
  };
}

// Presets
presets.forEach(function (btn) {
  btn.addEventListener("click", function () {
    var mins = parseInt(btn.getAttribute("data-minutes"), 10);
    if (isNaN(mins)) return;
    setTimerValue(mins, { resetIfRunning: true });
  });
});

// Custom minutes input
if (setMinutesBtn && minutesInput) {
  setMinutesBtn.addEventListener("click", function () {
    var val = parseInt(minutesInput.value, 10);
    if (isNaN(val)) return;
    setTimerValue(val, { resetIfRunning: true });
  });

  minutesInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      setMinutesBtn.click();
    }
  });
}

// Mute toggle
if (muteToggle) {
  muteToggle.checked = settings.muted;
  muteToggle.addEventListener("change", function () {
    settings.muted = !!muteToggle.checked;
    saveSettings();
    if (settings.muted && alarmAudio && typeof alarmAudio.pause === "function") {
      try {
        alarmAudio.pause();
        alarmAudio.currentTime = 0;
      } catch (e) {}
    }
  });
}

// Theme toggle (cycles: auto -> dark -> light -> auto)
function applyTheme(theme) {
  document.body.setAttribute("data-theme", theme);
  settings.theme = theme;
  saveSettings();
  if (themeToggle) {
    themeToggle.setAttribute("aria-pressed", theme !== "auto" ? "true" : "false");
    themeToggle.textContent = "Theme: " + theme.charAt(0).toUpperCase() + theme.slice(1);
  }
}

if (themeToggle) {
  themeToggle.addEventListener("click", function () {
    var current = settings.theme;
    var next = current === "auto" ? "dark" : current === "dark" ? "light" : "auto";
    applyTheme(next);
  });
}

// Notifications: act as a true toggle
if (notifyBtn) {
  notifyBtn.addEventListener("click", function () {
    if (!("Notification" in window)) {
      alert("Notifications are not supported in this browser.");
      return;
    }
    var perm = Notification.permission;
    if (perm === "granted") {
      // Toggle app-level notifications
      settings.notificationsEnabled = !settings.notificationsEnabled;
      saveSettings();
      updateNotificationUI();
      if (settings.notificationsEnabled) {
        // Small feedback
        try { notify("Notifications enabled", "You will be notified when the timer completes."); } catch (e) {}
      }
    } else if (perm === "default") {
      // Request permission
      requestNotifyPermissionCompat().then(function (p) {
        updateNotificationUI();
        if (p === "granted") {
          settings.notificationsEnabled = true;
          saveSettings();
          try { notify("Notifications enabled", "You will be notified when the timer completes."); } catch (e) {}
        } else if (p === "denied") {
          alert("Notifications were blocked by your browser. You can enable them later from site settings.");
        }
      });
    } else {
      // denied
      alert("Notifications are blocked. Please enable them in your browser's site settings.");
    }
  });
}

// Keyboard shortcuts
document.addEventListener("keydown", function (e) {
  var tgt = e.target;
  var tag = tgt && tgt.tagName ? tgt.tagName.toLowerCase() : "";
  var editable = tgt && (tgt.isContentEditable || tag === "input" || tag === "textarea");
  if (editable) return;

  if (e.code === "Space") {
    e.preventDefault();
    if (startBtn) startBtn.click();
  } else if (e.key === "r" || e.key === "R") {
    e.preventDefault();
    if (resetBtn) resetBtn.click();
    else resetTimer(true);
  } else if (e.key === "+" || e.key === "=") {
    e.preventDefault();
    if (plus) plus.click();
  } else if (e.key === "-" || e.key === "_") {
    e.preventDefault();
    if (sub) sub.click();
  }
});

/*--------------------------------------------------------------
 # Init
--------------------------------------------------------------*/
(function init() {
  loadSettings();

  // Apply persisted theme/mute/minutes
  applyTheme(settings.theme || "auto");

  if (muteToggle) {
    muteToggle.checked = !!settings.muted;
  }

  // Initialize minutes from saved value
  timerValue = settings.lastMinutes || timerValue;
  timerValue = clamp(Math.round(timerValue), DEFAULT_MIN, DEFAULT_MAX);

  updateMinuteValueUI();
  updateProgressUI(0, 1);
  updateAriaProgress(0, timerValue, timerValue * 60000, timerValue * 60000);

  if (minutesInput) {
    minutesInput.value = String(timerValue);
  }

  // Initialize notifications UI after load
  updateNotificationUI();

})();