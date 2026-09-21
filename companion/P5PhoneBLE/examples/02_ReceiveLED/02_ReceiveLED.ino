/*
 * 02_ReceiveLED — receive a number from the phone and dim an LED.
 *
 * The phone sends a brightness value (0–255) and the Arduino uses it to set
 * the brightness of an LED via PWM (analogWrite). This is the companion to
 * example 01: now the Arduino is RECEIVING data instead of sending it.
 *
 * Hardware:
 *   - An LED + 220Ω resistor on a PWM-capable pin. We use D9 here.
 *     (LED long leg → D9, short leg → resistor → GND.)
 *
 * The sketch pairs with any p5-phone sketch that declares:
 *
 *   bleSetup({
 *     namePrefix: 'p5phone',
 *     characteristics: [ { name: 'brightness', type: 'uint8', write: true } ]
 *   });
 *
 * The Arduino RECEIVES "brightness", so on the phone side the characteristic
 * is `write: true` (the phone writes). Again, "receive" is from the Arduino's
 * point of view.
 */

#include <P5PhoneBLE.h>

P5PhoneBLE ble;

const int LED_PIN = 9;  // any PWM pin (3, 5, 6, 9, 10, 11 on a classic Uno)

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);

  // Register the value we want to receive BEFORE calling begin().
  ble.receiveByte("brightness");  // phone → Arduino (a uint8, range 0–255)
  ble.setDebug(true);
  ble.setStatusLED(LED_BUILTIN);
  ble.begin("p5phone");
}

void loop() {
  ble.update();  // ALWAYS call update() at the top of loop()

  // changed() returns true ONCE when a new value has arrived, then clears.
  // You don't have to use it — getInt() always returns the most recent value
  // whether it changed this loop or not. Using changed() just lets you do
  // work only when something new came in.
  if (ble.changed("brightness")) {
    int b = ble.getInt("brightness");  // works on a receiveByte (widens 0–255 → int)
    analogWrite(LED_PIN, b);           // dim the LED
    Serial.print("brightness = ");
    Serial.println(b);
  }
}
