/*
 * 05_P5Phone_Both — pairs with the p5-phone example `ble/03_ble_both`.
 *
 * What it does:
 *   Bidirectional. The Arduino SENDS a float "temp" (from a sensor) AND
 *   RECEIVES a uint8 "brightness" (to dim an LED). One connection, two values.
 *
 * This is where DECLARATION ORDER becomes critical. The p5 sketch declares:
 *
 *   bleSetup({
 *     namePrefix: 'p5phone',
 *     characteristics: [
 *       { name: 'temp',       type: 'float', notify: true },   // index 1
 *       { name: 'brightness', type: 'uint8', write: true }     // index 2
 *     ]
 *   });
 *
 * The characteristic UUIDs are derived from order: index 1 → 19b10001-…,
 * index 2 → 19b10002-…. So on the Arduino you MUST register them in the
 * SAME ORDER: sendFloat("temp") FIRST, then receiveByte("brightness").
 * Swap them and the phone will write brightness to the temp characteristic
 * and nothing will work. This is the #1 footgun — memorize it.
 *
 * Hardware:
 *   - A potentiometer or analog sensor on A0 (for "temp").
 *   - An LED + 220Ω resistor on PWM pin 9 (for "brightness").
 */

#include <P5PhoneBLE.h>

P5PhoneBLE ble;

const int SENSOR_PIN = A0;
const int LED_PIN = 9;

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);

  // ORDER MATTERS — temp first (index 1), then brightness (index 2).
  ble.sendFloat("temp");           // index 1: Arduino → phone (notify)
  ble.receiveByte("brightness");   // index 2: phone → Arduino (write)

  ble.setDebug(true);
  ble.setStatusLED(LED_BUILTIN);
  ble.begin("p5phone");
}

void loop() {
  ble.update();  // ALWAYS first

  // --- Outbound: read sensor, send temp ---
  int raw = analogRead(SENSOR_PIN);
  float temp = map(raw, 0, 1023, 180, 310) / 10.0f;  // 18.0°C .. 31.0°C
  ble.set("temp", temp);

  // --- Inbound: read brightness, dim LED ---
  int b = ble.getInt("brightness");
  analogWrite(LED_PIN, b);

  // Tiny delay so the Serial monitor is readable.
  delay(50);
}
