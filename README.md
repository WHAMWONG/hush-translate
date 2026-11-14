# Hush Translate

A [Raycast](https://www.raycast.com/) extension that translates with the Apple Intelligence model on your Mac. There is no account and no API key, it works offline, and the text you translate never leaves the device.

## Requirements

- A Mac with Apple silicon
- macOS 26 or later
- Apple Intelligence turned on in System Settings

## Commands

| Command                  | What it does                                                          |
| ------------------------ | --------------------------------------------------------------------- |
| **Translate**            | Type text and press Return.                                           |
| **Translate Clipboard**  | Translates what is on the clipboard. An image is read with OCR first. |
| **Translate Selection**  | Translates the text selected in the frontmost app.                    |
| **Translate Screenshot** | Select an area of the screen; the text in it is read and translated.  |

The source language is detected automatically. The language menu in the search bar sets the target. Text that is already in that language is translated into your fallback language instead, so one command covers both directions.

On a result, Return copies the translation and ⌘Return pastes it into the frontmost app. ⌘T translates the same text into another language.

## Languages

简体中文, 繁體中文, English, 日本語, 한국어, Français, Deutsch, Español, Italiano, Português, Nederlands, Svenska, Dansk, Norsk, Türkçe, Tiếng Việt.

## Preferences

- **Translate into**: the language you usually translate into.
- **Fallback Language**: used when the text is already in that language.
- **Copy every translation automatically**: off by default.

## Install from source

```shell
git clone https://github.com/WHAMWONG/hush-translate.git
cd hush-translate
npm install && npm run dev
```

Once the commands show up in Raycast you can stop the dev server with Ctrl-C.

## How it works

`Sources/translator` is a small Swift command-line tool that does the work Raycast's Node runtime cannot: it calls the on-device model through the FoundationModels framework, reads text from images with Vision, and reads images from the pasteboard. The built binary is committed as `assets/translator`. After changing the Swift code, rebuild it with:

```shell
npm run build-swift
```

Long texts are split on paragraph boundaries and translated piece by piece, because the on-device model has a small context window. Apple Intelligence can decline some content; when it does, the extension says so.
