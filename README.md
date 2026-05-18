# VEO Automation - Chrome Extension

This project contains the source code for the VEO Automation Chrome extension.

## How to use as a Chrome Extension

1.  Click **Export** or download the project files.
2.  Run `npm install` and `npm run build`.
3.  Open Google Chrome and go to `chrome://extensions/`.
4.  Enable **Developer mode** in the top right.
5.  Click **Load unpacked** and select the `dist` folder of this project.

## Development

The preview in AI Studio shows the **Extension Dashboard (Popup UI)**.
The actual automation logic is contained in `src/extension/contentScript.ts`.

## Features
- Queue support for batch processing
- Text-to-Video, Image-to-Video, Components-to-Video
- Text-to-Image, Image-to-Image
- Auto-download with project organization
- Custom retry mechanisms
