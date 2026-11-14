# pose_landmarker_lite.task

Google's MediaPipe Pose Landmarker (lite, float16), Apache License 2.0
(https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker). A zip of
`pose_detector.tflite` (2,959,078 bytes) and `pose_landmarks_detector.tflite` (2,818,390 bytes).

Copied from the npm package `pose-landmarker-react-native@0.1.0`
(`android/src/main/assets/models/pose_landmarker_lite.task`), because the lab's build machine can
reach npm but not Google's model storage. 5,777,746 bytes,
sha256 59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a.

The runtime is `@mediapipe/tasks-vision` (package.json); scripts/build.mjs copies its bundle and
wasm next to the page, so IRL loads nothing from anyone else's servers.
