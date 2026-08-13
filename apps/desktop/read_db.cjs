const fs = require('fs');
const buf = fs.readFileSync('C:/Users/harsh/OneDrive/Documents/BACHAM/Data/bacham.sqlite');
const s = buf.toString('latin1');
const idx = s.indexOf('aiProvider');
if (idx > -1) {
    console.log('Found aiProvider, raw bytes around it:');
    console.log(JSON.stringify(s.slice(idx, idx + 120)));
} else {
    console.log('aiProvider NOT FOUND in database');
    // Look for any provider-related strings
    let pos = 0;
    while (true) {
        const i = s.indexOf('provider', pos);
        if (i === -1) break;
        console.log('provider at', i, ':', JSON.stringify(s.slice(Math.max(0, i-10), i+40)));
        pos = i + 1;
        if (pos > 100000) break;
    }
}
