# Check Timer

Offline web app (PWA) for a small-fleet maintenance planner. Tracks hours remaining to each
aircraft's 100 h check and custom work orders. Used on several iPhones, installed to the home
screen from GitHub Pages. No server, no accounts, no sync.

## Files

| File | Role |
| --- | --- |
| index.html | The whole app: HTML, CSS and JS in one file |
| sw.js | Service worker, cache-first so the app opens with no network |
| manifest.webmanifest | Home-screen name and display mode |
| icon-180/192/512.png | Icons |

## Hard rules

- Do not change the storage key `checktimer.v2` in index.html. Every phone's data lives under it;
  a new key makes all data look lost.
- Data shape must stay backward compatible. Old backups must still restore. If a field is added,
  give it a default on load (see how `orders` is defaulted in `load()`).
- No external URLs in index.html (no CDN, fonts, analytics). The app must work fully offline.
- No native `alert` / `confirm` / `prompt`. Use the in-page dialog helpers `ask()` and `tell()`.
- When the list of cached files in sw.js changes, bump `CACHE` (currently `check-timer-v1`).
  index.html changes alone do not need a bump: the worker refreshes it in the background and the
  new version shows on the next launch.
- Change only what was asked. Keep UI text in Chinese, as it is now.

## Business rules (agreed with the user)

- One 100 h check per aircraft. "Remaining to check" = last reset/init value minus flights after it.
- Daily entry is air time in h:mm. Input is digits only, last two digits are minutes
  (`215` -> `2:15`). Minutes must be < 60; one entry is at most 24:00.
- Same aircraft + same date entered again: ask "already entered X, change to Y?" and replace the
  old value. Never deduct twice.
- Past entries can be edited or deleted from the history list (tap the remaining time or "记录").
  Edits are in place; everything recomputes from the event list.
- Entry that would reach or pass a limit: show a red warning, then record anyway if confirmed.
  Negative values show as "超限 h:mm".
- "定检完成" resets to a value the user can type; default 100:00.
- Aircraft remaining can be set above 100:00 in the edit dialog.
- Registration: user types the part after `B-`; the app adds `B-`.
- Work orders per aircraft, two types:
  - hours: start value, minus flights entered after the order was created or its value last edited.
    Editing only the name keeps the countdown.
  - date: due date; days remaining from the device date.
  - Done = delete. Each order has 编辑 and ×.
- Colors (left stripe of a card = most urgent item of that aircraft):
  - hours: red <= 10:00, yellow <= 30:00, green > 30:00
  - days: red <= 3, yellow <= 7, green > 7
- No status words (正常/注意/紧急); color only.
- Cards sorted by remaining-to-check ascending (display only; stored order unchanged).
- "一键复制" text (aircraft in the same sorted order; order section only when any order exists;
  hour orders by remaining ascending, then date orders by due date; overrun shows 超限 instead of 剩余):
  ```
  MM/DD 定检剩余
  B-XXXX  剩余h:mm
  —————————
  未完成生产指令单
  B-XXXX  <order name>h:mm
  B-XXXX  <order name>M月D日前
  ```
- Date refreshes when the app returns to the foreground and when the local date changes
  (checked every 30 s, skipped while typing or a dialog is open).
- Backup/restore = JSON text of the whole state, copy and paste.

## Testing before every change is shipped

- Pure logic lives between `// LOGIC START` and `// LOGIC END` in index.html. Test it with node.
- Serve the folder over http (localhost), load once, then go offline and reload: the page and the
  data must still be there.
- Check at 320 px and 390 px width: no horizontal scroll.
- Report results with numbers (checks passed, values before/after), not "looks fine".

## Deploying

The user pushes to GitHub (GitHub Desktop: Commit, then Push). GitHub Pages updates in 1-2 min.
Phones pick up the new version after opening the app once while online, then reopening.
Remind the user to back up on the main phone before shipping a change.
