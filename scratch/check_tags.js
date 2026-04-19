import fs from 'fs';
const content = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');

const openings = content.match(/<div/g) || [];
const motionOpenings = content.match(/<motion\.div/g) || [];
const closings = content.match(/<\/div>/g) || [];
const motionClosings = content.match(/<\/motion\.div>/g) || [];

console.log('div openings:', openings.length);
console.log('motion.div openings:', motionOpenings.length);
console.log('div closings:', closings.length);
console.log('motion.div closings:', motionClosings.length);

console.log('Net div:', openings.length - closings.length);
console.log('Net motion.div:', motionOpenings.length - motionClosings.length);
