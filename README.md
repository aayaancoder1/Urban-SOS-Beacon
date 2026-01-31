# 🚨 Urban SOS Beacon

A real-time mobile emergency alert system that connects people in distress with nearby responders using live location, push notifications, and cloud sync.

Built as a hackathon MVP to demonstrate how **response time before official help arrives** can be reduced through community-powered proximity alerts.

---

## 🧠 Problem

In urban emergencies, the biggest gap is not *availability* of help — it’s **time**.

Even in cities:
- Emergency services take several minutes to arrive
- Nearby people who could help are unaware
- Victims often don’t have time to explain or call multiple contacts

Those first few minutes matter.

---

## 💡 Solution

**Urban SOS Beacon** is a one-tap emergency system:

- A user triggers an emergency with a single tap
- Their **live location** and **emergency type** are captured
- Nearby responders receive a **real push notification**
- A responder can **acknowledge** and assist immediately
- The victim sees real-time acknowledgement status

The demo uses two physical phones to show the full end-to-end flow.

---

## ✨ Key Features

- 📍 Live GPS location capture
- 🔔 Real push notifications (Expo)
- ☁️ Real-time cloud sync (Firebase Firestore)
- 🔄 Victim ↔ Responder acknowledgement loop
- 📏 Distance calculation between devices
- 🧪 Anonymous, auth-free demo setup
- 📱 Built and tested on real mobile devices
- Instant emergency confirmation popup (“Emergency alert sent”)
- Victim reassurance when a responder acknowledges (“Help is on the way”)
- Responder navigation to victim location via Maps (demo uses mocked coordinates)


---

## 🛠️ Tech Stack

- **Expo (React Native)**
- **Firebase Firestore**
- **Expo Push Notifications**
- **Expo Location**
- **TypeScript**
- **Git & GitHub**

---

## 🧪 Demo Flow (Two Devices)

1. **Phone A (Victim)**
   - Selects emergency type
   - Presses EMERGENCY
   - App immediately confirms alert with a visual popup
   - Location + alert sent

2. **Phone B (Responder)**
   - Receives push notification
   - Views emergency details and distance
   - Redirects to Maps to Victim's location
   - Acknowledges the emergency

3. **Phone A**
   - Victim sees “Help is on the way” confirmation

This controlled setup demonstrates how the system would scale to multiple responders in production.

---

## 🧩 What I Learned / Skills Gained

Through building this project, I gained hands-on experience with:

- Designing **panic-friendly mobile UX**
- Building **real-time systems** using Firestore
- Implementing **push notifications** in Expo
- Managing **environment variables securely**
- Debugging **Expo + native plugin issues**
- Structuring an MVP under **hackathon constraints**
- Using AI tools (Cursor) effectively for accelerated development
- End-to-end project workflow: build → debug → deploy → version control

Most importantly, I learned how to **turn a concept into a working, demo-ready product**.

---

## ⚠️ Notes

- Firebase configuration is provided via environment variables (`.env`) and is **not committed**.
- This is an MVP / demo project, not a production deployment.
- Nearby responder discovery is demonstrated using a controlled two-device setup.

---

## 📌 Future Improvements

- Responder opt-in onboarding
- Radius-based filtering at scale
- Authority escalation logic
- Offline / low-network fallback
- Native Bluetooth / Wi-Fi proximity discovery

---

## 🙌 Acknowledgements

Built during a hackathon to explore smart-city safety and rapid emergency response systems.

---

