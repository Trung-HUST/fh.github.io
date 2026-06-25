function safeParseJSON(str) {
  if (!str) return null;
  try {
    let cleaned = str
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "");
    cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');
    let parsed = JSON.parse(cleaned);
    if (typeof parsed === 'string') {
      parsed = JSON.parse(parsed);
    }
    return parsed;
  } catch (e) {
    return null;
  }
}
const str = '[{"category":"Food & Dining","spent":420,"limit":500000},{"category":"Transportation","spent":180,"limit":500000},{"category":"Entertainment","spent":95,"limit":0},{"category":"Shopping","spent":310,"limit":2000000},{"category":"Utilities","spent":245,"limit":1000000}]';
console.log(safeParseJSON(str));
