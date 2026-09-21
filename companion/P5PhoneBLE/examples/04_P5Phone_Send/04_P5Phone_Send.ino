/*
 * 04_P5Phone_Send — pairs with the p5-phone example `ble/02_ble_send`.
 *
 * What it does:
 *   RECEIVES a brightness value (0–255) from the phone and dims an LED.
 *   The p5 sketch has a slider the user drags; the Arduino renders the result.
 *
 * Name check (same inversion as example 03, the other direction):
 *   The p5 example is called "02_ble_send" because, on the PHONE, the data is
 *   going OUT (the phone writes). On the ARDUINO side the same data is coming
 *   IN, so here we use receiveByte(). Same data, opposite perspective.
 *
 * Hardware:
 *   - An LED + 220Ω resistor on PWM pin 9.
 *
 * Paired p5 sketch declares EXACTLY this (one characteristic, uint8, write):
 *
 *   bleSetup({
 *     namePrefix: 'p5phone',
 *     characteristics: [ { name: 'brightness', type: 'uint8', write: true } ]
 *   });
 */

#include <P5PhoneBLE.h>

P5PhoneBLE ble;

const int LED_PIN = 9;  // any PWM pin

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);

  // Declare the value we RECEIVE. Type uint8 means "one byte, 0–255".
  ble.receiveByte("brightness");
  ble.setDebug(true);
  ble.setStatusLED(LED_BUILTIN);
  ble.begin("p5phone");
}

void loop() {
  ble.update();  // ALWAYS first

  // getInt() returns the most recent value the phone sent. It works on a
  // receiveByte because getInt() widens whatever int type was declared.
  int b = ble.getInt("brightness");
  analogWrite(LED_PIN, b);

  // changed() is a handy way to print only when something new arrives:
  if (ble.changed("brightness")) {
    Serial.print("brightness = ");
    Serial.println(b);
  }
}
