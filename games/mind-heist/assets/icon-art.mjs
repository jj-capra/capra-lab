// Mind Heist app icon: a shifty bandit mask on a highlighter sticker, with a pink "?" badge.
// scale < 1 shrinks the art into the safe zone for Android maskable icons.
export function iconSVG({ size = 1024, scale = 1, rounded = false } = {}) {
  const ink = '#0a1140', cobalt = '#2441d6', hi = '#ffe94a', gum = '#ff5fa8';
  const art = `
  <g transform="translate(512 512) scale(${scale}) translate(-512 -512)">
    <g transform="rotate(-7 512 520)">
      <path fill="none" stroke="${ink}" stroke-width="36" stroke-linecap="round" d="M330 470C250 436 186 436 122 470C112 476 104 486 100 498M330 506C258 520 206 556 178 616"/>
      <circle cx="546" cy="554" r="318" fill="${ink}"/>
      <circle cx="512" cy="520" r="318" fill="${hi}" stroke="${ink}" stroke-width="34"/>
      <path fill="${ink}" d="M232 494C232 412 318 378 408 390C460 397 488 420 512 420C536 420 564 397 616 390C706 378 792 412 792 494C792 590 712 632 626 622C570 615 546 584 512 584C478 584 454 615 398 622C312 632 232 590 232 494Z"/>
      <path fill="${hi}" d="M318 500C322 460 366 440 410 446C452 452 478 476 474 506C470 540 428 556 386 550C344 544 314 532 318 500Z"/>
      <path fill="${hi}" d="M706 500C702 460 658 440 614 446C572 452 546 476 550 506C554 540 596 556 638 550C680 544 710 532 706 500Z"/>
      <circle cx="436" cy="506" r="25" fill="${ink}"/>
      <circle cx="660" cy="506" r="25" fill="${ink}"/>
    </g>
    <g transform="rotate(10 772 262)">
      <circle cx="792" cy="282" r="132" fill="${ink}"/>
      <circle cx="772" cy="262" r="132" fill="${gum}" stroke="${ink}" stroke-width="28"/>
      <path fill="none" stroke="${ink}" stroke-width="44" stroke-linecap="round" stroke-linejoin="round" d="M722 222C722 168 820 160 822 220C824 262 772 268 772 310"/>
      <circle cx="772" cy="360" r="25" fill="${ink}"/>
    </g>
  </g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="${size}" height="${size}">` +
    (rounded ? `<rect width="1024" height="1024" rx="230" fill="${cobalt}"/>` : `<rect width="1024" height="1024" fill="${cobalt}"/>`) + art + `</svg>`;
}
