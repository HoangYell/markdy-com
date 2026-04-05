const { parse } = require('./packages/core/dist/index.js');

const code2 = `
scene width=800 height=400 bg=#ffffff
asset doge_meme = image("https://upload.wikimedia.org/wikipedia/en/5/5f/Original_Doge_meme.jpg")
asset fire_icon = icon("lucide:flame")

actor my_meme = sprite(doge_meme) at (600, 200) scale 0.5
actor flames = sprite(fire_icon) at (200, 200) scale 2.0

@1.0: my_meme.throw(fire_icon, to=(200,200), dur=0.5)
`;

try {
  parse(code2);
  console.log("Example 2 Parsed OK");
} catch (e) {
  console.error("Example 2 Error:", e.message);
}

const code3 = `
scene width=800 height=400
asset doge_meme = image("https://upload.wikimedia.org/wikipedia/en/5/5f/Original_Doge_meme.jpg")

actor a = figure(#c68642, m, 😎) at (200, 200) scale 1.2
actor b = text("Hello World") at (400, 100) size 24
actor c = sprite(doge_meme) at (600, 200) scale 0.3 opacity 0.5
actor d = box() at (400, 300)
`;

try {
  parse(code3);
  console.log("Example 3 Parsed OK");
} catch (e) {
  console.error("Example 3 Error:", e.message);
}
