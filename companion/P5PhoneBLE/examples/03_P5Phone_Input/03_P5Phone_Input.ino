/*
 * 03_P5Phone_Input — pairs with the p5-phone example `ble/01_ble_input`.
 *
 * What it does:
 *   Reads a temperature-like value from analog pin A0 and SENDS it to the
 *   phone as a float. The p5 sketch draws a bar chart of the value.
 *
 * Name check — this is the #1 source of confusion:
 *   The p5 example is called "01_ble_input" because, on the PHONE, the data
 *   is coming IN (the phone receives). On the ARDUINO side the same data is
 *   going OUT, so here we use sendFloat(). Same data, opposite perspective.
 *
 * Hardware:
 *   - A potentiometer wired to A0 (outer legs to 3V3 and GND, wiper to A0).
 *     Or any analog sensor (photoresistor, thermistor, flex sensor, etc.).
 *     No LED or button needed.
 *
 * Paired p5 sketch declares EXACTLY this (one characteristic, float, notify):
 *
 *   bleSetup({
 *     namePrefix: 'p5phone',
 *     characteristics: [ { name: 'temp', type: 'float', notify: true } ]
 *   });
 *
 * Match the name ("temp"), the type ("float"), the direction (notify = send),
 * and the ORDER. Single value here so order is trivial — example 05 has two.
 */

#include <P5PhoneBLE.h>

P5PhoneBLE ble;

const int SENSOR_PIN = A0;

void setup() {
  Serial.begin(115200);

  // Declare the value we SEND. "temp" is just a name — call it whatever your
  // p5 sketch expects, but it must match on both sides.
  ble.sendFloat("temp");
  ble.setDebug(true);
  ble.setStatusLED(LED_BUILTIN);
  ble.begin("p5phone");
}

void loop() {
  ble.update();  // ALWAYS first

  // Read the analog sensor (0–1023 on most Arduino boards) and scale it to a
  // plausible "temperature" range so the phone's bar chart looks alive.
  int raw = analogRead(SENSOR_PIN);
  float temp = map(raw, 0, 1023, 180, 310) / 10.0f;  // 18.0°C .. 31.0°C

  // set() skips the radio write when the value hasn't changed enough, so it's
  // safe to call every loop(). For a fast-changing sensor you can use
  // setFast() to bypass the throttle — but most of the time set() is right.
  ble.set("temp", temp);

  // Small delay keeps the Serial monitor readable and gives the radio time
  // to breathe. Not required for correctness.
  delay(50);
}
