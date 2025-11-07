# ⏱️ Countdown Timer

A beautiful, accessible, and responsive countdown timer with SVG rings, presets (Pomodoro/Breaks), theme toggle, desktop notifications, and satisfying chimes. No frameworks required — just HTML, CSS, and JavaScript.

- Status: Stable
- Tech: HTML5, CSS3, JavaScript (ES5+)
- Storage: localStorage (preferences)
- Notifications: Web Notifications API
- Audio: WebAudio + HTML Audio fallback

---

## 👀 Preview

<p align="center">
  <img src="https://github.com/MdSaifAli063/Countdown-Timer/blob/c7c95b6d28f40fc0f0c7f9a6df668e084ef07c8e/Screenshot%202025-09-04%20014057.png" alt="Countdown timer animated preview" width="740"><br>
  <sub>Animated preview of the timer in action</sub>
</p>

<p align="center">
  <picture>
    <img src="https://github.com/MdSaifAli063/Countdown-Timer/blob/9a6d3d5a62a086ffcc1123cb1655ba21afb40b1b/Screenshot%202025-09-04%20014016.png" alt="Countdown timer UI screenshots (light and dark)" width="740">
  </picture><br>
  <sub>Light and Dark themes</sub>
</p>

---

## ✨ Features

- 🎯 SVG Progress Rings
  - Dual circles for minutes and seconds with glow and smooth transitions
- ▶️ Controls
  - Start, Pause/Resume, Reset
- ⏱️ Presets
  - Pomodoro 25m, Short Break 5m, Long Break 15m, Deep Focus 45m
- 🔧 Custom Minutes
  - Input 1–180 minutes with Apply button
- 📊 Progress
  - Live time readout and progress percentage
- 🔔 Desktop Notifications
  - Permission prompt and true toggle (On/Off) once granted
- 🔇 Sound
  - Westminster Quarters chime via WebAudio; fallback to <audio>; mute toggle
- 🌗 Theme
  - Auto (system), Dark, Light toggle — persists
- ♿ Accessibility
  - ARIA progressbars, role="timer", live regions, large touch targets
- 📱 Responsive UI
  - Works great from phones to desktops
- ⌨️ Shortcuts
  - Space: start/pause, R: reset, +/-: adjust minutes
- 💾 Persistence
  - Remembers last minutes, theme, mute, and notification toggle

---

## 🚀 Quick Start

1. Download or clone this repository.
2. Open index.html in your browser.
   - For full Notifications support and to avoid some browser restrictions, run via a local server:
     - Python: python -m http.server 8000
     - Node: npx serve
     - VS Code: Live Server extension

Then navigate to http://localhost:8000 (or the served URL).

---

## 🧭 Usage

- Adjust minutes
  - Use the − / + buttons or enter a value in “Set minutes” and click Apply.
  - Or click a Preset (25, 5, 15, 45).
- Start/Pause/Resume/Reset
  - Start begins the countdown; click again to Pause, then Resume.
  - Reset returns to the initial value.
- Notifications
  - Click “Enable Notifications” to grant permission.
  - Once granted, the button becomes “Notifications: On/Off” to toggle app notifications without changing browser permission.
- Sound
  - Mute alarm with the “Mute alarm” checkbox.
- Theme
  - Toggle between Auto, Dark, and Light.

---

## ⌨️ Keyboard Shortcuts

- Space: Start / Pause / Resume
- R: Reset
- + / =: Increase minutes
- - / _: Decrease minutes

---

## 🗂️ Project Structure


. ├─ index.html # Markup with SVG timer, controls, and ARIA attributes ├─ style.css # Responsive, theme-aware UI styles ├─ script.js # Timer logic, notifications, audio, persistence └─ assets/ ├─ alarm.mp3 └─ alarm.ogg


---

## 🧩 Customization

- Defaults (script.js)
  - DEFAULT_MIN: 1
  - DEFAULT_MAX: 180
  - settings: muted, theme, lastMinutes, notificationsEnabled
- CSS Variables (style.css)
  - Colors, spacing, gradients, radii, shadows. Example:
    ```css
    :root {
      --bg: #0d0f13;
      --bg-elev: #161a22;
      --text: #e6e7eb;
      --primary: #00fffc;
      --accent: #6c8cff;
      --radius: 14px;
      --shadow: 0 10px 30px rgba(0,0,0,.35);
      /* ... */
    }
    ```
- Themes
  - Controlled via data-theme on body: auto | dark | light
- Sounds
  - WebAudio notes defined in script.js (playWQ). You can swap the notes or replace with your own audio in assets/.

---

## 🧪 How It Works (Under the Hood)

- Timer engine computes remaining time with endTimeMs and Date.now(), updates every second (setTimeout).
- SVG circles animate by adjusting stroke-dashoffset to reflect progress.
- Accessibility
  - role="timer" with aria-live updates for screen readers.
  - role="progressbar" with aria-valuenow/min/max on the rings.
- Persistence via localStorage: theme, mute, lastMinutes, notificationsEnabled.
- Notifications
  - Uses the Web Notifications API; toggle controls app-level notifications without changing browser permission.

---

## 🛠️ Troubleshooting

- 🔕 Notification button doesn’t toggle
  - Ensure you’re on HTTPS or localhost. Many browsers block Notifications on file:// and non-secure origins.
  - If the button says “Notifications Blocked”, you previously denied permission. Re-enable in site settings and reload.
- 🔈 No sound
  - Some browsers block autoplay; click the page first to establish a user gesture.
  - Ensure “Mute alarm” is unchecked.
  - iOS Safari has stricter audio policies; try starting the timer after an interaction.
- ➖/➕ not changing minutes
  - The code targets the <i> inside #minuteCount. Make sure you’re using the provided script.js and HTML structure intact.
- 🟡 No glow/animation
  - If you’ve enabled “Reduce motion” at the OS/browser level, animations will be minimized.
- 🧭 Presets or Apply not working
  - Check console errors; make sure script.js is loaded after the HTML (it is in index.html). Keep element IDs unchanged.

---

## 🌐 Browser Support

- Latest Chrome, Edge, Firefox, Safari
- Notes:
  - :has() selector is used for subtle visuals; unsupported browsers still function correctly without it.
  - Notifications require user permission and secure origin (HTTPS/localhost).

---

## 📦 Deployment

- GitHub Pages / Netlify / Vercel
  - Static hosting is sufficient. Ensure assets/ is deployed alongside index.html.

---

## 🧰 Development Tips

- Tweak visual design via CSS variables in style.css.
- Extend presets by adding buttons with data-minutes="N".
- Modify keyboard shortcuts in script.js under “Keyboard shortcuts” section.
- Update chime behavior in the playWQ() function.

---

## 🏷️ License

MIT License — feel free to use, modify, and distribute.

---

## 🙌 Acknowledgements

- 🧠 WebAudio API for the chime
- 🔔 Web Notifications API
- ♿ ARIA Authoring Practices for accessibility inspiration

Enjoy focused, delightful time tracking! ⏳
