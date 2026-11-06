# Check Timer

Offline web app (PWA) for a small-fleet maintenance planner. Tracks hours remaining to each
aircraft's 100 h check and custom work orders. Used on several iPhones, installed to the home
screen from GitHub Pages. No server, no accounts, no sync.

## Files

| File | Role |
| --- | --- |
| index.html | The whole app: HTML, CSS and JS in one file |
| sw.js | Service worker, cache-first so the app opens with no network; refreshes with `cache: 'no-cache'` so one online launch fetches a new upload |
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
  old value. Never deduct twice. "Same date" means since the last 定检完成 only (a 修正剩余 / 初始 the
  same day does not make the earlier entry count as "not entered"); see `sameDay()`.
- 备忘录 per aircraft: `notes` = [{id, text, date, ts}], newest first; optional (defaulted to [] in
  `normalize()`). Added / edited / deleted on the detail page; editing keeps the original date. Home
  shows a small note icon + count next to the registration. Not part of "一键复制".
- Back-filling a date earlier than the latest typed value (剩余 / 机身 / 发动机) shows a yellow note in
  the confirmation (that value may already include the flight). It is a note, not a block.
- Editing an overrun aircraft / hour order: the field shows 0:00; saving it unchanged keeps the overrun.
- Restore and load refuse data that is missing a registration or events (`validState()`); unreadable
  stored data is kept under `checktimer.v2.damaged.<time>` and the user is told to restore a backup.
- Past entries can be edited or deleted from the history list (tap the remaining time or "记录").
  Edits are in place; everything recomputes from the event list.
- Entry that would reach or pass a limit: show a red warning, then record anyway if confirmed.
  Negative values show as "超限 h:mm".
- Three views in one page: home (summary tiles + one row per aircraft, no progress bar (user asked
  to keep it clean), every open order listed under its aircraft in its level color; tap a row = detail), batch (one input per aircraft for one
  date, prefilled with what is already entered; blank = no change; one confirmation for all), and
  detail (big remaining + bar, single entry, orders, recent records, 编辑, 定检完成).
- Entry date (batch and detail) defaults to today, no future dates; a past date shows as "补录" in yellow.
- "定检完成" (detail page) resets to a value the user can type; default 100:00.
- Airframe and engine total time (one engine per aircraft), optional per aircraft (`af` / `eng` =
  `{min, ts}`; missing = not shown). Total = base + every flight entered after `ts`. Set or changed
  in the 编辑 dialog (engine change = edit engine only). Shown as one grey line on the card.
  Not part of "一键复制".
- Aircraft remaining can be set above 100:00 in the edit dialog.
- Registration: user types the part after `B-`; the app adds `B-`.
- Work orders per aircraft, two types:
  - hours: start value, minus flights entered after the order was created or its value last edited.
    Editing only the name keeps the countdown.
  - date: due date; days remaining from the device date.
  - Done = delete. Each order has 编辑 and 完成. Hour orders show "剩余 h:mm".
  - Add dialog offers preset names (检查前起, 校验磁罗盘, 灭火瓶称重, ELT测试); tap fills the name,
    which stays editable; any name can be typed instead.
- Colors (status dot before the registration on home = most urgent item of that aircraft; home shows
  one card per aircraft with a gap between, no side stripes; "B-" in the same style as the number):
  - hours: red <= 10:00, yellow <= 30:00, green > 30:00
  - days: red <= 3, yellow <= 7, green > 7
- Green (normal) is shown only by the status dot and the detail-page bar; normal numbers and
  order text stay in the plain text color / grey, so only yellow and red stand out.
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
- Backup reminder: time of the last backup is kept under `checktimer.v2.lastBackup` (separate key, not
  in the data). Set on a successful 备份数据 copy, on copying from the manual-copy box of a backup, and
  after a restore. Red dot on the backup button when there are aircraft and no backup yet or the last
  one is more than 7 days old; the menu shows "上次备份：今天 / 昨天 / N 天前 / 还没有备份过".

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
