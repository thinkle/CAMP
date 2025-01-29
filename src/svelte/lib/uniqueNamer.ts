export const names = [
  "🍏 Apple",
  "🍎 Red Apple",
  "🍐 Pear",
  "🍊 Orange",
  "🍋 Lemon",
  "🍌 Banana",
  "🍉 Watermelon",
  "🍇 Grapes",
  "🍓 Strawberry",
  "🍒 Cherry",
  "🥝 Kiwi",
  "🍍 Pineapple",
  "🥥 Coconut",
  "🌰 Chestnut",
  "🥑 Avocado",
  "🍑 Peach",
  "🍈 Melon",
  "🍅 Tomato",
  "🌶️ Chili Pepper",
  "🥕 Carrot",
  "🌽 Corn",
  "🥒 Cucumber",
  "🥬 Lettuce",
  "🥦 Broccoli",
  "🧄 Garlic",
  "🧅 Onion",
  "🥔 Potato",
  "🍠 Sweet Potato",
  "🥜 Peanuts",
  "🍞 Bread",
  "🥖 Baguette",
  "🥯 Bagel",
  "🧀 Cheese",
  "🥚 Egg",
  "🍳 Fried Egg",
  "🥞 Pancakes",
  "🧇 Waffle",
  "🥓 Bacon",
  "🍔 Burger",
  "🌭 Hot Dog",
  "🍕 Pizza",
  "🥪 Sandwich",
  "🌮 Taco",
  "🌯 Burrito",
  "🥗 Salad",
  "🍝 Pasta",
  "🍣 Sushi",
  "🍤 Shrimp",
  "🍪 Cookie",
  "🍩 Donut",
  "🎂 Cake",
  "🍰 Shortcake",
  "🧁 Cupcake",
  "🍫 Chocolate",
  "🍯 Honey",
  "🍬 Candy",
  "🍭 Lollipop",
  "🍮 Flan",
  "🍦 Ice Cream",
  "🍨 Sundae",
  "🍹 Cocktail",
  "🍸 Martini",
  "🍺 Beer",
  "🍻 Cheers",
  "🥂 Champagne",
  "🍼 Baby Bottle",
  "☕ Coffee",
  "🧃 Juice",
  "🍵 Tea",
  "🥤 Soda",
  "🌎 Earth",
  "🌍 Globe",
  "🌏 Asia Globe",
  "🌞 Sun",
  "🌜 Moon",
  "⭐ Star",
  "🔥 Fire",
  "💧 Water Drop",
  "🌊 Wave",
  "❄️ Snowflake",
  "🌪️ Tornado",
  "☁️ Cloud",
  "🎈 Balloon",
  "🎉 Confetti",
  "🎊 Party Popper",
  "🎂 Birthday Cake",
  "🎁 Gift",
  "🕹️ Joystick",
  "🎮 Game Controller",
  "🎵 Music Note",
  "🎸 Guitar",
  "🎻 Violin",
  "🎺 Trumpet",
  "🥁 Drum",
  "🎷 Saxophone",
  "🚗 Car",
  "🚕 Taxi",
  "🚙 SUV",
  "🚌 Bus",
  "🚎 Trolley",
  "🚜 Tractor",
  "🚀 Rocket",
  "✈️ Airplane",
  "🛸 UFO",
  "🚁 Helicopter",
  "⛵ Sailboat",
  "⚓ Anchor",
  "🚂 Train",
  "🚲 Bicycle",
  "🏍️ Motorcycle",
  "🏎️ Racecar",
  "🎭 Theater Masks",
  "🎨 Palette",
  "🎬 Clapperboard",
  "🎤 Microphone",
  "🎧 Headphones",
  "📷 Camera",
  "📽️ Film Projector",
  "💡 Light Bulb",
  "🔦 Flashlight",
  "🕰️ Clock",
  "⏳ Hourglass",
  "💰 Money Bag",
  "💎 Gem",
  "🔮 Crystal Ball",
  "🎯 Bullseye",
  "⚽ Soccer Ball",
  "🏀 Basketball",
  "⚾ Baseball",
  "🏈 Football",
  "🎾 Tennis Ball",
  "🏐 Volleyball",
  "🏉 Rugby Ball",
  "🎱 8-Ball",
  "🃏 Joker",
  "♠️ Spade",
  "♥️ Heart",
  "♦️ Diamond",
  "♣️ Club",
  "🎴 Cards",
  "🏆 Trophy",
  "🥇 Gold Medal",
  "🥈 Silver Medal",
  "🥉 Bronze Medal",
  "🔔 Bell",
  "🔕 Muted Bell",
  "🔑 Key",
  "🛠️ Tools",
  "⚙️ Gear",
  "⛏️ Pickaxe",
  "🛡️ Shield",
  "🗡️ Dagger",
  "⚔️ Crossed Swords",
  "🏹 Bow and Arrow",
  "💣 Bomb",
  "🧨 Firecracker",
  "🎵 Music",
  "🔗 Link",
];

export function getFirstEmoji(name: string): string {
  const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
  return [...segmenter.segment(name)][0].segment;
}

function getNameFromCount(n: number): string {
  if (n < names.length) {
    return names[n]; // Use predefined name if available
  }

  // Otherwise, generate a new unique name using an alphanumeric system
  let base = names.length;
  let generatedName = "";

  let count = n;
  while (count > 0) {
    let index = count % base;
    generatedName = getFirstEmoji(names[index]) + generatedName;
    count = Math.floor(count / base);
  }

  return generatedName;
}

export function Namer() {
  let nameCount = 0;
  let nameMap = new Map<any, string>();

  function getName(uid: any): string {
    if (nameMap.has(uid)) {
      return nameMap.get(uid)!;
    }

    let name = getNameFromCount(nameCount);
    nameMap.set(uid, name);
    nameCount++;

    return name;
  }

  return { getName };
}
