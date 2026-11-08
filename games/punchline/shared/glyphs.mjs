// A sign line as letters: "~BOWL" -> [{ c: 'B', off: true }, { c: 'O', off: false }, ...]. A `~` darkens
// the letter after it (a burnt-out bulb, a peeled-off letter). Shared by the art and the server.
export function letters(line) {
  const out = [];
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '~' && i + 1 < line.length) { out.push({ c: line[i + 1], off: true }); i++; } else out.push({ c: line[i], off: false });
  }
  return out;
}
