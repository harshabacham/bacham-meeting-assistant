const fs = require('fs');
const logFile = 'C:\\Users\\harsh\\.gemini\\antigravity-ide\\brain\\3f63d16b-9405-42bd-9421-154c9c850cbd\\.system_generated\\logs\\transcript_full.jsonl';
const text = fs.readFileSync(logFile, 'utf8');

const lines = text.split('\n');
const fileLines2 = [];
let m2 = -1;
for (const line of lines) {
    if (line.includes('LibraryPage.tsx') && line.includes('Showing lines')) {
        const m = line.match(/"output":"(.*?)"/);
        if (m) {
            const outLines = m[1].split('\\n');
            for(const out of outLines) {
                 const lm = out.match(/^(\d+):\s(.*)$/);
                 if(lm) {
                     let c = lm[2].replace(/\\\\/g, '\\').replace(/\\"/g, '"').replace(/\\t/g, '\t');
                     fileLines2[parseInt(lm[1])] = c;
                     if(parseInt(lm[1]) > m2) m2 = parseInt(lm[1]);
                 }
            }
        }
    }
}

const recovered = [];
for (let i = 1; i <= m2; i++) {
    recovered.push(fileLines2[i] !== undefined ? fileLines2[i] : '');
}

fs.writeFileSync('C:\\Users\\harsh\\OneDrive\\Desktop\\Meeting\\apps\\desktop\\src\\pages\\LibraryPage.tsx', recovered.join('\n'));
console.log('Recovered max line: ' + m2);
