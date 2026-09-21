/*
 * 01_SendBool — the simplest possible P5PhoneBLE sketch.
 *
 * Reads the board's built-in button and sends its state (true/false) to a
 * paired phone over BLE. The phone can use it to toggle a circle, fire a
 * sound, drive an animation — anything you can imagine.
 *
 * Hardware:
 *   - Arduino UNO R4 WiFi  (onboard button on D2, pull it to GND with a wire)
 *   - OR Nano 33 IoT / Nano 33 BLE (wire a pushbutton: D2 to one leg, GND to the other)
 *
 * The sketch pairs with any p5-phone sketch that declares:
 *
 *   bleSetup({
 *     namePrefix: 'p5phone',
 *     characteristics: [ { name: 'button', type: 'bool', notify: true } ]
 *   });
 *
 * The Arduino SENDS "button", so on the phone side the characteristic is
 * `notify: true` (the phone listens). Note the perspective: "send" here is
 * from the Arduino's point of view.
 *
 * Directory order matters! If you add more values later, declare them in the
 * SAME order on both sides — the characteristic UUIDs are derived from order.
 */

#include <P5PhoneBLE.h>

P5PhoneBLE ble;  // the one library object you need

const int BUTTON_PIN = 2;  // built-in button on UNO R4 WiFi; use D2 on other boards

void setup() {
  Serial.begin(115200);

  pinMode(BUTTON_PIN, INPUT_PULLUP);  // button reads LOW when pressed

  // Register the value we want to send BEFORE calling begin().
  ble.sendBool("button");          // Arduino → phone
  ble.setDebug(true);              // print connect/disconnect to Serial
  ble.setStatusLED(LED_BUILTIN);   // solid = connected, blink = advertising
  ble.begin("p5phone");            // the name the phone will see
}

void loop() {
  ble.update();  // ALWAYS call update() at the top of loop()

  // Read the button. INPUT_PULLUP means pressed = LOW = false here.
  // We invert so pressed = true, which reads more naturally on the phone.
  bool pressed = (digitalRead(BUTTON_PIN) == LOW);

  // set() is smart: it only sends a BLE notification when the value actually
  // changes, so it's safe to call every loop(). No flooding the radio.
  ble.set("button", pressed);
}
