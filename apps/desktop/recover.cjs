const fs = require('fs');
const logFile = 'C:\\Users\\harsh\\.gemini\\antigravity-ide\\brain\\3f63d16b-9405-42bd-9421-154c9c850cbd\\.system_generated\\logs\\transcript.jsonl';
const text = fs.readFileSync(logFile, 'utf8');

const regex = /"(\d+):\s(.*?)(?:\\n|")/g;
let match;
const fileLines = [];
let maxLineFound = -1;

while ((match = regex.exec(text)) !== null) {
    const lineNum = parseInt(match[1]);
    let code = match[2];
    
    // We only want to keep if this came from LibraryPage.tsx
    // Since we are matching globally, we might get other files. But AppLayout only has ~400 lines and LibraryPage has 800.
    // So this might mix them, but AppLayout was output before LibraryPage.
    // Let's refine by reading ONLY the tool responses where output contains "LibraryPage.tsx"
    
    // Unescape code
    code = code.replace(/\\\\/g, '\\').replace(/\\"/g, '"').replace(/\\t/g, '\t');
    fileLines[lineNum] = code;
    if (lineNum > maxLineFound) maxLineFound = lineNum;
}

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
