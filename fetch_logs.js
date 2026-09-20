const fs = require('fs');

async function fetchLogs() {
  const repo = 'harshabacham/bacham-meeting-assistant';
  
  console.log('Fetching workflow runs...');
  const runsRes = await fetch(`https://api.github.com/repos/${repo}/actions/runs?per_page=5`);
  const runsData = await runsRes.json();
  
  const run = runsData.workflow_runs.find(r => r.name === 'Release');
  if (!run) {
    console.log('No Release run found.');
    return;
  }
  
  console.log(`Found run ${run.id} for ${run.head_branch}. Fetching jobs...`);
  const jobsRes = await fetch(run.jobs_url);
  const jobsData = await jobsRes.json();
  
  const macJob = jobsData.jobs.find(j => j.name.includes('macos'));
  if (!macJob) {
    console.log('No macOS job found.');
    return;
  }
  
  console.log(`Found macOS job ${macJob.id} (Status: ${macJob.conclusion}). Fetching log text...`);
  const logRes = await fetch(`https://api.github.com/repos/${repo}/actions/jobs/${macJob.id}/logs`);
  const logText = await logRes.text();
  
  const lines = logText.split('\n');
  const tail = lines.slice(-100).join('\n');
  console.log('--- LAST 100 LINES OF LOG ---');
  console.log(tail);
}

fetchLogs().catch(console.error);
