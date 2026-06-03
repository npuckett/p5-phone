# Suggested Structure For `donottouchWorkshop.md`

Keep the current file as an instructor planning document, but split the material into clearer sections so it can drive both the workshop website and the teaching notes.

## 1. Instructor Notes

- Workshop length: 90 minutes.
- Audience: ITP Camp, basic p5.js familiarity, mixed skill levels.
- Goal: phones as creative computers, not touchscreens.
- Materials: paper, string, tape, fabric, NFC tags if available, speakers/headphones if needed.
- Required setup: phone, Chrome or Edge on computer, p5 Web Editor account, phone camera for QR scanning.

## 2. Participant-Facing Description

Use the current workshop title and public description here. Remove private notes such as “do not print this part” from this section.

## 3. 90-Minute Agenda

| Time | Activity | Outcome |
| --- | --- | --- |
| 0-10 | Introduction and premise | Participants understand the no-touch rule and phone hardware idea. |
| 10-25 | Hardware and data examples | Participants see where values appear in code. |
| 25-40 | Web Editor workflow | Participants can scan a fullscreen sketch on their phone. |
| 40-75 | Build time | Participants create one input-output interaction. |
| 75-90 | Share-out | Participants describe their value, output, and material. |

## 4. Platform Notes

- iOS supports motion, microphone, and camera permission flows, but requires a user gesture for permissions.
- Android Chrome supports motion, microphone, camera, Web NFC, and vibration when the phone/browser supports those APIs.
- Web NFC and browser vibration should be framed as Android-first or Android-only workshop options.
- Hosted HTTPS pages are required for most hardware APIs.

## 5. Example Table

Use a table instead of loose lists so each example has a teaching purpose.

| Topic | Input Or Output | Platform | Teaching Point | Example |
| --- | --- | --- | --- | --- |
| Orientation | Input range | iPhone + Android | Rotation values behave like sliders. | Orientation |
| Device Shaken | Input event | iPhone + Android | Thresholds turn movement into triggers. | Device Shaken |
| Microphone | Input range | iPhone + Android | Sound level can become size, speed, or density. | Microphone Level |
| Vibration | Output | Android Chrome | Haptics can be a physical response. | Haptic Feedback |
| NFC | Input event | Android Chrome | Materials can identify themselves. | Two Tag Effects |
| FaceMesh | Camera input | iPhone + Android | Body tracking values can drive outputs. | Mouth Particle Cannon |
| HandPose | Camera input | iPhone + Android | Distance between landmarks is a useful value. | Hand Image Opacity |

## 6. Build Prompt

Ask participants to complete this sentence before coding:

> When my phone senses ________, it will change ________.

Then ask them to choose one material constraint:

- The phone is attached to something.
- The phone is covered, muffled, suspended, or carried.
- The phone watches a body part, object, or material.
- The phone reacts to a tag, sound, position, or gesture.

## 7. Publishing Checklist

- GitHub Pages workshop URL works.
- QR code for the workshop page works.
- Existing example links work.
- New workshop examples load on desktop.
- At least one motion example works on iPhone.
- At least one motion or vibration example works on Android.
- Microphone permission flow works.
- Camera/ML5 examples load and track.
- p5 Web Editor starter links are confirmed or marked local-only.

## 8. Cleanup Suggestions

- Use `p5-phone`, `p5.js`, and `p5 Web Editor` consistently.
- Fix `seperate` to `separate`.
- Change “the values being are clearly saved” to “the values being produced are clearly saved”.
- Keep the playful workshop copy, but move implementation checklists into clearly named sections.