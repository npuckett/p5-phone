# Paired p5.js sketches

These are the **p5-phone** sketches that match the Arduino examples in this
library. Each pairs one-to-one with an Arduino example in `examples/`:

| Arduino example | This p5 sketch | Data flow |
|---|---|---|
| `examples/03_P5Phone_Input/` | `01_ble_input.js` | Arduino sends `temp` (float, notify) → phone displays it |
| `examples/04_P5Phone_Send/` | `02_ble_send.js` | Phone writes `brightness` (uint8) → Arduino dims an LED |
| `examples/05_P5Phone_Both/` | `03_ble_both.js` | Both: Arduino sends `temp`, phone writes `brightness` |

(The two getting-started Arduino examples — `01_SendBool`, `02_ReceiveLED` —
pair with any p5 sketch that declares a matching single characteristic; they
don't have a dedicated paired sketch here.)

## How to run one

1. Install the **p5-phone** library into the p5 Web Editor (or your local p5
   project): <https://github.com/npuckett/p5-phone>
2. Open a new sketch, drag in the p5-phone library files, and paste the
   contents of one of the `.js` files here into `sketch.js`.
3. Run on **Chrome or Edge** over HTTPS. (On iPhone/iPad, use the **Bluefy**
   browser — Safari doesn't support Web Bluetooth.)
4. Flash the matching Arduino example, power the board, and tap Connect in
   the p5 sketch. The board appears as `p5phone…`.

## Why the names look inverted

The p5 sketches are named from the **phone's** perspective (`ble_input` =
data coming *into* the phone). The Arduino role is the opposite: when the
phone receives, the Arduino sends. Each Arduino example's header spells out
which side does what — read it first if anything seems backwards.
