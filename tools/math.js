// Renders formulas for build.py. stdin: JSON [{tex, display}], stdout: JSON [html].
const katex = require('katex');
let src = '';
process.stdin.on('data', d => (src += d)).on('end', () => {
  const out = JSON.parse(src).map(({ tex, display }) =>
    katex.renderToString(tex, { displayMode: display, throwOnError: true, output: 'htmlAndMathml' }));
  process.stdout.write(JSON.stringify(out));
});
