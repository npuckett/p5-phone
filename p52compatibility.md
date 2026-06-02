# Overall
Update all examples to work with p5 2.x methods. While the still support both, they are planning to move to 2x as the default in the coming monthds and I want to future proof the examples

full new reference is here: https://beta.p5js.org/reference/

# Version and fallback
use 2.2.3 and the compatibility for preload in all index pages

<html lang="en"><head>
    <script src="https://cdn.jsdelivr.net/npm/p5@2.2.3/lib/p5.js"></script><script src="https://cdn.jsdelivr.net/npm/p5.js-compatibility@0.2.0/src/preload.js"></script>
   

# Update Image examples
any example that loads images will need to swith from preload to async/await
https://beta.p5js.org/reference/p5/loadImage/

# Update sound examples
use the updated p5 sound reference to update all sound-based examples
https://beta.p5js.org/reference/p5.sound/