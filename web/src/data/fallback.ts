// Built-in data used when /data/*.json is missing or broken.
// Viewfy = "the growth agent that gets you users while you ship" (viewfy.ai).
// Journalists are fictional personas at real outlets; community handles are masked.
import type { Drafts, Fingerprint, Targets, TrainingRun, VoiceCorpus } from './types'
import type { BrainSnapshot } from '../engine/types'

const now = '2026-09-27T20:00:00Z'

export const FALLBACK_CORPUS: VoiceCorpus = {
  handle: '@viewfy_ai',
  fetchedAt: now,
  real: false,
  tweets: [
    ['build distribution, not 100 apps', 42, 6, 5, 3100],
    ['the buyers are already typing the question. go find it.', 31, 4, 3, 2400],
    ["shipped hourly outcome tracking this week. every reply gets scored an hour later. now the next draft knows what worked 💙", 27, 5, 2, 1900],
    ["generic AI sounds generic. so viewfy learns your voice from your own posts. founders stopped rewriting drafts. that's the whole feature.", 58, 9, 7, 5200],
    ["distribution's not scary. it's a second product you haven't built yet.", 64, 11, 9, 6100],
    ['seo fixes that land as a pull request, not a locked report. you merge it, done.', 19, 2, 1, 1400],
    ["talked to 30 founders this month. none of them want 'more content'. they want users. different job.", 45, 8, 4, 3800],
    ['reply while the thread is still warm. speed beats polish here.', 22, 3, 2, 1700],
    ['had a call with a $500M ARR company today. zero b2b sales experience. fun 🤣', 36, 7, 1, 2900],
    ['the first $1k bought the map. now the same miles take fewer wrong turns.', 29, 3, 2, 2100],
    ['you still approve before anything posts. always.', 17, 2, 1, 1200],
    ['keep building. we got the distribution part 🤟', 24, 3, 2, 1600],
  ].map(([text, likes, replies, retweets, views], i) => ({
    id: `fb-t${i + 1}`,
    text: text as string,
    createdAt: new Date(Date.parse(now) - (i + 1) * 86_400_000 * 1.7).toISOString(),
    likes: likes as number,
    replies: replies as number,
    retweets: retweets as number,
    views: views as number,
  })),
  gmailSamples: [
    {
      subject: 'quick one: the thread-age thing',
      text: "hey,\n\nshort version: founders approve replies on threads under 3h old and skip anything older. so we reply fast or not at all.\n\nhappy to share the numbers.\n\nMike",
    },
    {
      subject: 'your first 100 users are in threads, not ads',
      text: "hi,\n\nwe watched thousands of founder-approved replies. the ones that land answer the question and don't link. the ones that flop pitch.\n\nwant the data for a piece?\n\nMike",
    },
    {
      subject: 're: viewfy trial',
      text: 'love it. turned on the X squad for you, first drafts land in an hour. you approve, it posts. ping me if anything feels off.\n\nMike',
    },
  ],
}

export const FALLBACK_FINGERPRINT: Fingerprint = {
  traits: [
    { name: 'Direct', value: 0.92 },
    { name: 'Concise', value: 0.86 },
    { name: 'Confident', value: 0.81 },
    { name: 'Technical', value: 0.72 },
    { name: 'Warm', value: 0.63 },
    { name: 'Playful', value: 0.54 },
  ],
  signaturePhrases: [
    'build distribution, not 100 apps',
    'keep building',
    'you still approve before anything posts',
    'a pull request, not a locked report',
    "distribution's not scary",
    '💙',
  ],
  avgWords: 18.4,
  emojiRate: 0.16,
  examples: [
    'build distribution, not 100 apps',
    'the buyers are already typing the question. go find it.',
    "distribution's not scary. it's a second product you haven't built yet.",
    'reply while the thread is still warm. speed beats polish here.',
  ],
}

export const FALLBACK_TARGETS: Targets = {
  fetchedAt: now,
  real: false,
  signals: [
    { id: 's1', title: 'Solo founders are building million-dollar companies with AI agents', outlet: 'TechCrunch', url: 'https://techcrunch.com', date: '2026-09-26' },
    { id: 's2', title: 'AI search is now a top referral source for startups', outlet: 'The Verge', url: 'https://www.theverge.com', date: '2026-09-26' },
    { id: 's3', title: 'Reddit moderation now reads comment intent, not karma', outlet: 'Wired', url: 'https://www.wired.com', date: '2026-09-25' },
    { id: 's4', title: 'The one-person company is having a moment', outlet: 'Business Insider', url: 'https://www.businessinsider.com', date: '2026-09-25' },
    { id: 's5', title: 'Startups swap SDR teams for AI agents', outlet: 'Axios', url: 'https://www.axios.com', date: '2026-09-24' },
    { id: 's6', title: 'Show HN: 27% of launches are invisible to AI crawlers', outlet: 'Hacker News', url: 'https://news.ycombinator.com', date: '2026-09-24' },
    { id: 's7', title: 'Founders say distribution is the new moat', outlet: 'Fast Company', url: 'https://www.fastcompany.com', date: '2026-09-23' },
    { id: 's8', title: 'Build-in-public posts are getting less reach. What still works', outlet: 'Indie Hackers', url: 'https://www.indiehackers.com', date: '2026-09-23' },
  ],
  journalists: [
    { id: 'j1', name: 'Maya Chen', outlet: 'TechCrunch', beat: 'AI agents & startups', signalId: 's1' },
    { id: 'j2', name: 'Daniel Okafor', outlet: 'The Verge', beat: 'AI search & the open web', signalId: 's2' },
    { id: 'j3', name: 'Priya Raman', outlet: 'Business Insider', beat: 'solo founders', signalId: 's4' },
    { id: 'j4', name: 'Tom Becker', outlet: 'Wired', beat: 'platforms & moderation', signalId: 's3' },
    { id: 'j5', name: 'Lena Park', outlet: 'Fast Company', beat: 'small business & marketing', signalId: 's7' },
    { id: 'j6', name: 'Sam Rivera', outlet: 'Axios', beat: 'AI deals & revenue', signalId: 's5' },
  ],
  publishers: [
    { id: 'p1', name: 'Indie Hackers', domain: 'indiehackers.com', kind: 'community', audience: 'bootstrapped founders' },
    { id: 'p2', name: 'TLDR AI', domain: 'tldr.tech', kind: 'newsletter', audience: 'developers in AI' },
    { id: 'p3', name: 'My First Million', domain: 'mfmpod.com', kind: 'podcast', audience: 'founders & operators' },
    { id: 'p4', name: 'Smashing Magazine', domain: 'smashingmagazine.com', kind: 'media', audience: 'web developers' },
    { id: 'p5', name: "Lenny's Newsletter", domain: 'lennysnewsletter.com', kind: 'newsletter', audience: 'PMs & founders' },
  ],
  community: [
    { id: 'c1', handle: '@jes***', topic: 'first users', likes: 41, text: 'posting on X every day for 2 months and still ~0 signups. what am I doing wrong?' },
    { id: 'c2', handle: '@mar***', topic: 'AI search', likes: 27, text: 'asked ChatGPT about my category and it recommends 3 competitors, never us. how do you even fix that?' },
    { id: 'c3', handle: '@tom***', topic: 'reddit', likes: 18, text: 'my reddit replies keep getting flagged as self-promo. how do people do this without being cringe?' },
    { id: 'c4', handle: '@ale***', topic: 'distribution', likes: 63, text: 'honest q: how do technical founders learn distribution without hating every minute of it?' },
    { id: 'c5', handle: '@nik***', topic: 'pricing', likes: 22, text: 'no idea how to price my saas. $9? $29? $99? how did you figure it out?' },
    { id: 'c6', handle: '@sar***', topic: 'timing', likes: 12, text: 'is it worth replying to threads that are already a day old or am I too late?' },
    { id: 'c7', handle: '@raf***', topic: 'old threads', likes: 9, text: 'found a 2 year old thread asking for exactly what I built. worth replying?' },
    { id: 'c8', handle: '@kim***', topic: 'traction', likes: 88, text: 'shipped my 4th app this year. zero traction on any of them. what now?' },
    { id: 'c9', handle: '@ben***', topic: 'press', likes: 15, text: 'cold emailing journalists about my launch. does anyone actually get replies?' },
    { id: 'c10', handle: '@dan***', topic: 'launch', likes: 34, text: 'launching on product hunt next week. what actually moves the needle?' },
    { id: 'c11', handle: '@ola***', topic: 'GTM tools', likes: 51, text: 'is there anything that does GTM for you while you build? I have zero time for marketing' },
    { id: 'c12', handle: '@pri***', topic: 'build in public', likes: 19, text: "how do you write build-in-public posts that don't sound like linkedin?" },
  ],
}

function lossCurve(): { step: number; loss: number }[] {
  // deterministic noisy exponential decay, 3.9 → ~0.8
  const out: { step: number; loss: number }[] = []
  let s = 7
  for (let i = 1; i <= 40; i++) {
    s = (s * 9301 + 49297) % 233280
    const noise = (s / 233280 - 0.5) * 0.12
    const base = 0.78 + 3.15 * Math.exp(-i / 9)
    out.push({ step: i, loss: Math.round((base + noise * Math.min(1, base)) * 1000) / 1000 })
  }
  return out
}

export const FALLBACK_TRAINING: TrainingRun = {
  provider: 'river',
  real: false,
  baseModel: 'Qwen/Qwen3.5-9B',
  adapter: 'viewfy-founder-voice-lora-v3',
  examples: 412,
  steps: lossCurve(),
  voiceMatch: 0.94,
  notes: 'LoRA r=16 on @viewfy_ai tweets + founder emails. RL reward = replies received.',
  startedAt: '2026-09-27T18:10:00Z',
  finishedAt: '2026-09-27T18:34:00Z',
}

const g = (targetId: string, subject: string, text: string, voiceMatch: number, voice: 'founder' | 'company' = 'founder') => ({
  targetId,
  channel: 'gmail' as const,
  voice,
  subject,
  text,
  voiceMatch,
  real: false,
})
const x = (targetId: string, text: string, voiceMatch: number) => ({
  targetId,
  channel: 'x_reply' as const,
  voice: 'founder' as const,
  text,
  voiceMatch,
  real: false,
})
const post = (targetId: string, text: string, voiceMatch: number) => ({
  targetId,
  channel: 'x_post' as const,
  voice: 'company' as const,
  text,
  voiceMatch,
  real: false,
})

export const FALLBACK_DRAFTS: Drafts = {
  drafts: [
    g('j1', "founders approve agent replies on one condition. here's the data", "hi Maya,\n\nyou cover AI agents at startups, so one data point: founders approve agent-written replies based on thread age, not wording. under 3h old, approved. a day old, skipped.\n\nI'm building Viewfy, the growth agent that gets you users while you ship.\n\nhappy to share the numbers. 15 min?\n\nMike", 0.96),
    g('j2', '27% of Show HN launches are invisible to ChatGPT', "hi Daniel,\n\nwe scanned 383 Show HN launches. 27% can't be read by AI engines at all. most of it is a Cloudflare default nobody chose.\n\nbeing invisible to the robots is a bad growth plan. the raw list is yours if useful.\n\nMike, founder @ Viewfy", 0.97),
    g('j3', '$1k invoice in 8 hours, built solo', "hi Priya,\n\nyou write about how one-person companies actually make money. at a hackathon last month I interviewed users, built, pitched and invoiced a $1,000 customer in 8 hours. solo.\n\nthe trick wasn't the code. it was having distribution running while I built.\n\nwant the story?\n\nMike", 0.95),
    g('j4', 'reddit reads intent now. auto-posting just got riskier', "hi Tom,\n\nfrom the builder side: reddit moderation reads comment intent now, not karma. the bots that spam links are getting wiped. the ones that answer the question survive.\n\nwe see it in our data every day. happy to walk you through it.\n\nMike", 0.94),
    g('j5', 'marketing in 90-second decisions', "hi Lena,\n\nyou write for founders without a marketing team. honest version of marketing while building: you don't do it in blocks. you do it in 90-second approvals between commits.\n\nthat's what Viewfy is. the agent drafts, you approve.\n\nstory in there?\n\nMike", 0.96),
    g('j6', 'sold to a $500M ARR company with zero b2b sales experience', "hi Sam,\n\nyou track which AI startups land revenue. this week a vertical of a $500M ARR company converted to a paid trial of Viewfy. I have zero b2b sales experience.\n\nthe inbound came from a reply thread, not an ad.\n\nhappy to share numbers.\n\nMike", 0.95),
    g('p1', 'guest post: your first 100 users are in threads, not ads', "hi Indie Hackers team,\n\nwe have data from thousands of founder-approved replies: short answers win, links lose, and speed beats polish.\n\nwe'd love to write it up for your readers. no pitch, just the numbers.\n\nthe Viewfy team", 0.93, 'company'),
    g('p2', '383 Show HN launches, scanned for AI visibility', "hi TLDR team,\n\nwe scanned 383 Show HN launches. 27% can't be read by ChatGPT or Claude at all. most are Cloudflare defaults nobody chose.\n\nfeels like a one-liner your readers would click. dataset is public.\n\nthe Viewfy team", 0.94, 'company'),
    g('p3', 'episode idea: the solo founder who invoiced $1k in 8 hours', "hi MFM team,\n\nepisode idea: a solo founder interviews users, builds, pitches and invoices a $1,000 customer in 8 hours. then turns the playbook into an agent.\n\nhappy to come on and tell it straight.\n\nthe Viewfy team", 0.93, 'company'),
    g('p4', 'SEO that lands as a pull request', "hi Smashing team,\n\nevery marketing tool we tried ended in a task list. so we made the output a diff. Viewfy's SEO fixes land as a pull request on your repo. you merge it, app logic stays untouched.\n\nwould make a fun technical piece.\n\nthe Viewfy team", 0.94, 'company'),
    g('p5', 'what founders actually approve from a growth agent', "hi Lenny's team,\n\nwe watched founders approve and reject thousands of agent drafts. the pattern is simple: helpful beats clever, short beats long, and nobody approves a link in the first reply.\n\nhappy to share the full breakdown.\n\nthe Viewfy team", 0.93, 'company'),
    x('c1', "don't post more. find 5 threads from this week where someone asks for exactly what you built and answer them properly. no link unless they ask. that's the whole trick 💙", 0.96),
    x('c2', "check your robots.txt and Cloudflare bot settings first. a lot of sites block AI crawlers by default and nobody chose that. if ChatGPT can't read you, it can't recommend you.", 0.97),
    x('c3', "keep it to 2-5 sentences and answer the actual question. the long ones read like a pitch wearing a helpful hat. short answers get upvoted, then people click your profile.", 0.95),
    x('c4', "distribution's not scary, it's just a second product you haven't built yet. give it the same 30 min a day you give bugs. it compounds the same way.", 0.96),
    x('c5', 'talk to 10 of them this week. not a survey, a 15 min call. I did 30+ this month and the pricing page rewrote itself. keep building 🤟', 0.95),
    x('c6', 'reply while the thread is still alive. under a few hours old, people read it. a day old, 40 comments already said it. speed beats polish here.', 0.96),
    x('c7', 'yes. the OP usually isn\'t your buyer. your buyer is whoever lands on that thread from Google six months from now. write for them.', 0.94),
    x('c8', 'same boat once. what worked for me: build distribution, not 100 apps. one product, one channel, every day for a month. congrats on shipping 💙', 0.95),
    x('c9', 'they do if you lead with a number they can use. one stat in the subject, three lines in the body, no attachments. and follow up once on day 5.', 0.95),
    x('c10', "the launch day matters less than the 30 days after. line up 10 threads where people ask for what you built and answer them the same week.", 0.94),
    x('c11', "that's literally what we're building with viewfy. it finds the threads, drafts in your voice, you approve before anything posts. happy to set you up", 0.93),
    x('c12', 'write it like a text to a friend. one thing you shipped, one number, one thing that broke. no "thrilled to announce" ever.', 0.96),
    post('self-1', 'shipped hourly outcome tracking this week. every reply we draft now gets scored an hour later: replied, liked, booked a call. the next draft knows what worked 💙', 0.95),
    post('self-2', 'generic AI sounds generic. so viewfy writes in your voice, trained on your own posts and emails. founders stopped rewriting the drafts. that was the whole goal.', 0.94),
    post('self-3', 'the buyers are already typing the question. viewfy finds the thread, drafts the answer, you approve. marketing in 90-second decisions, while you ship.', 0.95),
  ],
  generic: [
    { targetId: 'j1', text: "Dear Maya,\n\nI hope this email finds you well! I'm reaching out to introduce Viewfy, an innovative AI-powered growth platform that leverages cutting-edge technology to revolutionize go-to-market strategies for startups. I would love to schedule a call at your earliest convenience to discuss a potential story.\n\nBest regards" },
    { targetId: 'c1', text: "Great question! Growing on social media can be challenging. Here are some tips: 1) Post consistently 2) Engage with your audience 3) Use relevant hashtags. Also, check out Viewfy, an AI-powered growth tool that can help you scale! 🚀" },
    { targetId: 'p1', text: "Hello Indie Hackers Team,\n\nI hope you're doing well. We at Viewfy would be thrilled to contribute a guest post to your esteemed publication about leveraging AI for growth. Please let me know if this is something you'd be interested in.\n\nKind regards" },
  ],
}

export const FALLBACK_BRAIN: BrainSnapshot = {
  real: false,
  pages: 1284,
  sampleQueries: [
    {
      q: 'who covers AI agents at startups?',
      hits: [
        { title: 'Maya Chen · TechCrunch', snippet: 'AI agents & startups. replied to data-angle pitch (loop 31). prefers numbers up top.', source: 'people/maya-chen' },
        { title: 'TechCrunch', snippet: 'AI desk answers pitches with a stat in the subject 2× more often.', source: 'companies/techcrunch' },
        { title: 'Sam Rivera · Axios', snippet: 'AI deals & revenue. opened twice, no reply yet (loop 35).', source: 'people/sam-rivera' },
      ],
    },
    {
      q: 'what pitch angle gets journalist replies?',
      hits: [
        { title: 'Lead with a number', snippet: '3 of 4 journalist replies came from pitches with a stat in the subject line.', source: 'lessons/lead-with-a-number' },
        { title: 'news-jack pitch · data angle v4', snippet: 'tie the pitch to a story from the last 48h, one stat, 3 lines. 38% reply rate.', source: 'workflows/news-jack-pitch' },
        { title: 'Daniel Okafor · The Verge', snippet: 'asked for the Show HN dataset. follow up with the raw list.', source: 'people/daniel-okafor' },
      ],
    },
    {
      q: 'which X replies worked last week?',
      hits: [
        { title: '@jes*** · first users thread', snippet: 'helpful-first reply, no link. 14 likes, then a DM asking for a demo.', source: 'threads/x-jes' },
        { title: 'Short replies win', snippet: 'replies under 40 words got 2.1× the likes of longer ones.', source: 'lessons/short-replies' },
        { title: 'X reply · value-first v3', snippet: 'answer the question, share one real number, never link first. 31% reply rate.', source: 'workflows/x-reply-helpful-first' },
      ],
    },
  ],
}
