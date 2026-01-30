# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

---

## 🔴 Hackathon Project Override: Urban SOS Beacon

PURPOSE:
Demonstrate real nearby device pinging using two physical phones.

ROLES:
1. Victim device: triggers emergency
2. Responder device: receives ping and acknowledges

TECH STACK:
- Expo (React Native)
- Firebase Firestore
- Expo Push Notifications

CORE FLOW (Victim):
1. Press EMERGENCY
2. Select emergency type
3. Fetch live GPS
4. Create emergency record in Firestore
5. Send push notification to responders
6. Show real-time responder acknowledgements

CORE FLOW (Responder):
1. App receives push notification
2. Opens emergency details
3. Shows distance to victim
4. User taps ACKNOWLEDGE
5. Firestore updates in real time

CONSTRAINTS:
- Anonymous users only
- No authentication
- Two-device demo is acceptable
- Focus on reliability over features

PRIORITY:
This section OVERRIDES any previous instructions in this README.

