// What players type (Who Said It answers, nicknames) goes on other teens' phones and, if the room
// votes it up, on a page parents may read. Strong swears and slurs come out as a redaction bar,
// which suits a classified file. This is a floor, not a guarantee: the host can also hide any
// answer during the reveal, and only answers the room votes up reach the share page.
const BAR = '▇▇▇';
const PATTERNS = [
  /f+u+c+k+\w*/gi, /\bf+[\W_]*u+[\W_]*c+[\W_]*k/gi, /\bfck\w*/gi, /\bwtf\b/gi, /\bstfu\b/gi,
  /\bs+h+i+t+\w*/gi, /\bbull?shit\w*/gi, /\bb+i+t+c+h+\w*/gi, /\bass+hole\w*/gi, /\bdumbass\w*/gi, /\bjackass\w*/gi,
  /\bd+i+c+k+(?:s|head)?\b/gi, /\bcocks?\b/gi, /\bpuss(?:y|ies)\b/gi, /\bc+u+n+t+\w*/gi, /\bsl+u+t+\w*/gi, /\bwh+o+r+e+\w*/gi,
  /\bbastard\w*/gi, /\bdamn\w*/gi, /\bgoddam\w*/gi, /\bpricks?\b/gi, /\btwat\w*/gi, /\bwank\w*/gi, /\bpenis\w*/gi, /\bvagina\w*/gi,
  /\bboob\w*/gi, /\btits?\b/gi, /\bsex(?:y|ier|iest|ual|ually|ting)?\b/gi, /\bporn\w*/gi, /\bhorny\b/gi, /\bnude\w*/gi,
  /\bn+[i1!|]+g{2,}\w*/gi, /\bf+a+g+\w*/gi, /\bretard\w*/gi, /\btrann(?:y|ie)\w*/gi, /\bspics?\b/gi,
  /\bchinks?\b/gi, /\bkike\w*/gi, /\bdyke\w*/gi, /\bwetback\w*/gi, /\bbeaner\w*/gi, /\bgook\w*/gi, /\braghead\w*/gi,
  /\bkys\b/gi, /\bkill\s+(?:your|ur)\s*self\w*/gi,
];
export function redact(text) {
  let out = String(text || '');
  for (const p of PATTERNS) out = out.replace(p, BAR);
  return out;
}
export const tidy = (s, max) => redact(String(s || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, max);
