const fs = require('fs');

const fixes = [
  { file: 'WorkspaceScroll.tsx', search: '<section-transparent overflow-hidden">', replace: '<section ref={containerRef} className="py-24 border-t border-white/5 bg-transparent overflow-hidden">' },
  { file: 'WhyItExists.tsx', search: '<section-transparent">', replace: '<section id="why" className="py-32 border-t border-white/5 bg-transparent">' },
  { file: 'ProductShowcase.tsx', search: '<section-transparent overflow-hidden">', replace: '<section className="py-32 border-t border-white/5 bg-transparent overflow-hidden">' },
  { file: 'Privacy.tsx', search: '<section-transparent overflow-hidden">', replace: '<section id="privacy" className="py-32 border-t border-white/5 bg-transparent overflow-hidden">' },
  { file: 'LectureIntelligence.tsx', search: '<section-transparent">', replace: '<section className="py-32 border-t border-white/5 bg-transparent">' },
  { file: 'HowItWorks.tsx', search: '<section-transparent overflow-hidden">', replace: '<section id="how-it-works" className="py-32 border-t border-white/5 bg-transparent overflow-hidden">' },
  { file: 'FeaturesGrid.tsx', search: '<section-transparent">', replace: '<section id="features" className="py-32 border-t border-white/5 bg-transparent">' },
  { file: 'FAQ.tsx', search: '<section-transparent">', replace: '<section id="faq" className="py-32 border-t border-white/5 bg-transparent">' },
  { file: 'DownloadCTA.tsx', search: '<section-transparent">', replace: '<section id="download" className="py-32 border-t border-white/5 bg-transparent">' },
  { file: 'BuiltForStudents.tsx', search: '<section-transparent">', replace: '<section className="py-32 border-t border-white/5 bg-transparent">' },
  { file: 'Footer.tsx', search: '<footer-transparent py-12 mt-24">', replace: '<footer className="border-t border-white/5 bg-transparent py-12 mt-24">' }
];

const basePath = 'C:/Users/harsh/OneDrive/Desktop/Meeting/apps/landing/src/components';
const sectionsPath = basePath + '/sections';

for (const fix of fixes) {
  const p = fix.file === 'Footer.tsx' ? `${basePath}/${fix.file}` : `${sectionsPath}/${fix.file}`;
  const code = fs.readFileSync(p, 'utf8');
  const newCode = code.replace(fix.search, fix.replace);
  fs.writeFileSync(p, newCode);
  console.log('Fixed', p);
}
