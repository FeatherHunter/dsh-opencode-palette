// scripts/update-thanks.ts —— 致谢数据自动追加：拉新编号、合并进 JSON。
// （从 dsh-mattpocock-skills-deck 同名脚本移植，再按 base 包迁移收窄：脚本只写 JSON，不画表。）
//
// 为什么要有它：
//   致谢数据以前是人肉维护的——新开了 Issue、合了 PR、讨论区多了一条，都要人翻记录、
//   数花、排顺序，还要在中英两份 README 里逐行对齐。三处对不齐、漏数一朵，
//   读到的人一眼就能看出来。机器做这件事不会漏、不会数错，跑完直接能合。
//
// 数据流只有一条：docs/thanks-data.json 是唯一数据源。脚本只联网拉新
// （只看比游标新的编号，老的不再碰）并合并进 JSON；README.md、
// docs/README.en.md 与 package/README.md 里标记之间的表格由
// dsh-featherhunter-plugin-base 的 readme:sync 渲染（同源渲染，不再由本脚本画表）。
// 中间任何一步拿不到数据（gh 报错、第一页就是空的），直接退出，一个字节都不写——
// 宁可这次不更新，也不能把数据写残。
//
// 用法（都在仓库根目录下跑）：
//   node scripts/update-thanks.ts   拉新并写回 docs/thanks-data.json
//
// 手工补漏：直接改 docs/thanks-data.json（字段含义见文件头的 _说明），
// 然后跑 npm run readme:sync 重画三处 README 的表格，照常走门禁与提交。
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const ROOT: string = path.dirname(path.dirname(url.fileURLToPath(import.meta.url)));
const REPO_OWNER: string = 'FeatherHunter';
const REPO_NAME: string = 'dsh-opencode-palette';
const DATA_PATH: string = path.join(ROOT, 'docs', 'thanks-data.json');

// 表格在正文里的起止标记：由 base 包 readme:sync 负责替换标记之间的内容，
// 标记之外的介绍语、结尾语一个字都不碰。这里保留常量只为门禁/排障引用同一份口径。
export const ZH_START: string = '<!-- THANKS-TABLE-ZH-START -->';
export const ZH_END: string = '<!-- THANKS-TABLE-ZH-END -->';
export const EN_START: string = '<!-- THANKS-TABLE-EN-START -->';
export const EN_END: string = '<!-- THANKS-TABLE-EN-END -->';

export type ItemKind = 'issue' | 'pr' | 'discussion' | 'comment';
export interface ThanksItem {
  n: number;
  k: ItemKind;
  at: string;
  thread?: 'issue' | 'pr';
}
// 编号加它诞生的时间：时间一律 UTC 的 ISO，渲染按编号升序，门禁拿时间重算最后活跃。
export interface DatedNum {
  n: number;
  at: string;
}
export interface AuthorRec {
  issues: DatedNum[];
  prs: DatedNum[];
  discussions: DatedNum[];
  comments: Array<{ n: number; thread: 'issue' | 'pr'; at: string }>;
  lastActive: string;
}
export interface ThanksData {
  cursors: { issues: number; discussions: number };
  authors: Record<string, AuthorRec>;
}

// 维护者本人、机器人、已注销账号不进表：他们的编号再新也不算外部贡献。
export function isSkippedLogin(login: unknown): boolean {
  if (typeof login !== 'string' || !login) return true;
  if (login === REPO_OWNER || login === 'ghost') return true;
  return login === 'dependabot' || login.endsWith('[bot]');
}

// 花数进位（与发布手册第 2 节同一条规则）：10000 换 💎、1000 换 👑、100 换 🏆、
// 10 换 💐，余下的每一张补 🌹。从大到小贪心，一档画完再画下一档
// （例如 11 张是 💐🌹，123 张是 🏆💐💐🌹🌹🌹）。
const TIERS: Array<[number, string]> = [
  [10000, '💎'],
  [1000, '👑'],
  [100, '🏆'],
  [10, '💐'],
  [1, '🌹'],
];
export function rosesFor(total: number): string {
  let rest: number = Math.max(0, Math.floor(total));
  let out: string = '';
  for (const [worth, mark] of TIERS) {
    while (rest >= worth) {
      out += mark;
      rest -= worth;
    }
  }
  return out;
}

// 一个人的全部事项拍平成带时间的条目：门禁拿它重算总数与最后活跃时间。
export function itemsOf(rec: AuthorRec): ThanksItem[] {
  const out: ThanksItem[] = [];
  for (const d of rec.issues || []) out.push({ n: d.n, k: 'issue', at: d.at || '' });
  for (const d of rec.prs || []) out.push({ n: d.n, k: 'pr', at: d.at || '' });
  for (const d of rec.discussions || []) out.push({ n: d.n, k: 'discussion', at: d.at || '' });
  for (const c of rec.comments || []) out.push({ n: c.n, k: 'comment', at: c.at || '', thread: c.thread });
  return out;
}

export function totalOf(rec: AuthorRec): number {
  return (rec.issues || []).length + (rec.prs || []).length + (rec.discussions || []).length + (rec.comments || []).length;
}

// 排名：总数多的在前；总数一样看最后活跃（晚的在前）；还一样按登录名字典序，
// 保证每次渲染的顺序一模一样，不会忽前忽后。
export function orderedLogins(authors: Record<string, AuthorRec>): string[] {
  return Object.keys(authors).sort((a, b) => {
    const ta: number = totalOf(authors[a]);
    const tb: number = totalOf(authors[b]);
    if (ta !== tb) return tb - ta;
    const la: string = authors[a].lastActive || '';
    const lb: string = authors[b].lastActive || '';
    if (la !== lb) return la < lb ? 1 : -1;
    return a < b ? -1 : a > b ? 1 : 0;
  });
}

// ---------------------------------------------------------------------------
// 联网拉取：全部读到内存，落盘之前不写任何文件。
// ---------------------------------------------------------------------------
function ghApi(args: string[]): string {
  return execFileSync('gh', ['api', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

interface FreshNumber {
  n: number;
  author: string;
  created: string;
  isPr: boolean;
}

function fetchNewIssues(cursor: number): { fresh: FreshNumber[]; maxSeen: number } {
  const fresh: FreshNumber[] = [];
  let maxSeen: number = cursor;
  for (let page = 1; page <= 30; page++) {
    // 参数必须拼在地址里：-f 写法会被当成写请求（建议题），真机会当场 422。
    const raw: string = ghApi([
      `repos/${REPO_OWNER}/${REPO_NAME}/issues?state=all&per_page=100&page=${page}`,
      '--jq',
      '[.[] | {n: .number, u: .user.login, c: .created_at, pr: (.pull_request != null)}]',
    ]);
    const items: Array<{ n: number; u: string; c: string; pr: boolean }> = JSON.parse(raw);
    if (!Array.isArray(items) || items.length === 0) break;
    let stopHere: boolean = false;
    for (const it of items) {
      if (it.n > maxSeen) maxSeen = it.n;
      if (it.n <= cursor) {
        stopHere = true;
        continue;
      }
      fresh.push({ n: it.n, author: it.u, created: it.c, isPr: it.pr });
    }
    if (stopHere) break;
  }
  return { fresh, maxSeen };
}

function fetchComments(n: number): Array<{ author: string; created: string }> {
  const out: Array<{ author: string; created: string }> = [];
  for (let page = 1; page <= 10; page++) {
    const raw: string = ghApi([
      `repos/${REPO_OWNER}/${REPO_NAME}/issues/${n}/comments?per_page=100&page=${page}`,
      '--jq',
      '[.[] | {u: .user.login, c: .created_at}]',
    ]);
    const items = JSON.parse(raw) as Array<{ u: string; c: string }>;
    if (!Array.isArray(items) || items.length === 0) break;
    for (const c of items) out.push({ author: c.u, created: c.c });
  }
  return out;
}

function fetchNewDiscussions(cursor: number): { fresh: FreshNumber[]; maxSeen: number } {
  const fresh: FreshNumber[] = [];
  let maxSeen: number = cursor;
  let endCursor: string | null = null;
  for (let round = 0; round < 20; round++) {
    const vars: string[] = [
      '-f',
      'query=query($after: String) { repository(owner: "' +
        REPO_OWNER +
        '", name: "' +
        REPO_NAME +
        '") { discussions(first: 50, after: $after, orderBy: {field: CREATED_AT, direction: DESC}) { nodes { number author { login } createdAt } pageInfo { hasNextPage endCursor } } } }',
      '--jq',
      '.data.repository.discussions | {hasNext: .pageInfo.hasNextPage, end: .pageInfo.endCursor, items: [.nodes[] | {n: .number, u: .author.login, c: .createdAt}]}',
    ];
    if (endCursor) vars.push('-F', `after=${endCursor}`);
    const raw: string = ghApi(['graphql', ...vars]);
    const res: { hasNext: boolean; end: string; items: Array<{ n: number; u: string; c: string }> } = JSON.parse(raw);
    let stopHere: boolean = false;
    for (const it of res.items) {
      if (it.n > maxSeen) maxSeen = it.n;
      if (it.n <= cursor) {
        stopHere = true;
        continue;
      }
      fresh.push({ n: it.n, author: it.u, created: it.c, isPr: false });
    }
    if (stopHere || !res.hasNext) break;
    endCursor = res.end;
  }
  return { fresh, maxSeen };
}

function emptyRec(): AuthorRec {
  return { issues: [], prs: [], discussions: [], comments: [], lastActive: '' };
}

// 编号已存在就保留原来的时间（诞生时间不会变）；不存在才追加。
function pushUniqueDated(list: DatedNum[], n: number, at: string): void {
  if (!list.some((d) => d.n === n)) list.push({ n, at });
}

function main(): void {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')) as ThanksData;
  if (!data || typeof data !== 'object' || !data.cursors || !data.authors) {
    console.error('贡献数据读不出来（docs/thanks-data.json 结构不对），什么都不改。');
    process.exit(1);
  }
  for (const login of Object.keys(data.authors)) {
    if (isSkippedLogin(login)) {
      console.error(`贡献数据里混进了不该进表的人（${login}），请手工清掉再跑，什么都不改。`);
      process.exit(1);
    }
  }

  let addedItems: number = 0;
  const addedAuthors: string[] = [];
  const issues = fetchNewIssues(data.cursors.issues);
  if (issues.maxSeen <= 0) {
    console.error('议题列表一页都没拉到（网络或令牌问题），什么都不改。');
    process.exit(1);
  }
  for (const f of issues.fresh) {
    if (isSkippedLogin(f.author)) continue;
    if (!data.authors[f.author]) {
      data.authors[f.author] = emptyRec();
      addedAuthors.push(f.author);
    }
    const rec: AuthorRec = data.authors[f.author];
    pushUniqueDated(f.isPr ? rec.prs : rec.issues, f.n, f.created);
    if (!rec.lastActive || rec.lastActive < f.created) rec.lastActive = f.created;
    addedItems++;
    // 同一串下的留言只算一次参与：同一个人反复留言不重复加花。
    for (const cm of fetchComments(f.n)) {
      if (isSkippedLogin(cm.author) || cm.author === f.author) continue;
      if (!data.authors[cm.author]) {
        data.authors[cm.author] = emptyRec();
        addedAuthors.push(cm.author);
      }
      const crec: AuthorRec = data.authors[cm.author];
      if (crec.comments.some((x) => x.n === f.n)) continue;
      crec.comments.push({ n: f.n, thread: f.isPr ? 'pr' : 'issue', at: cm.created });
      if (!crec.lastActive || crec.lastActive < cm.created) crec.lastActive = cm.created;
      addedItems++;
    }
  }
  const discussions = fetchNewDiscussions(data.cursors.discussions);
  for (const f of discussions.fresh) {
    if (isSkippedLogin(f.author)) continue;
    if (!data.authors[f.author]) {
      data.authors[f.author] = emptyRec();
      addedAuthors.push(f.author);
    }
    const rec: AuthorRec = data.authors[f.author];
    pushUniqueDated(rec.discussions, f.n, f.created);
    if (!rec.lastActive || rec.lastActive < f.created) rec.lastActive = f.created;
    addedItems++;
  }
  data.cursors.issues = Math.max(data.cursors.issues, issues.maxSeen);
  data.cursors.discussions = Math.max(data.cursors.discussions, discussions.maxSeen);

  // 键按字典序落盘：同一批数据每次写出来逐字节一样，diff 只显示真正的变化。
  const sortedAuthors: Record<string, AuthorRec> = {};
  for (const login of Object.keys(data.authors).sort()) sortedAuthors[login] = data.authors[login];
  data.authors = sortedAuthors;
  const jsonText: string = JSON.stringify(data, null, 2) + '\n';
  const oldJson: string = fs.existsSync(DATA_PATH) ? fs.readFileSync(DATA_PATH, 'utf8') : '';
  if (jsonText === oldJson) {
    console.log(`致谢数据已是最新（议题看到 ${data.cursors.issues} 号、讨论看到 ${data.cursors.discussions} 号），无需更新。`);
    return;
  }
  fs.writeFileSync(DATA_PATH, jsonText);
  console.log(
    `致谢数据已更新：新增事项 ${addedItems} 条${addedAuthors.length ? '、新人 ' + addedAuthors.join('、') : ''}；` +
      `游标推到议题 ${data.cursors.issues} 号、讨论 ${data.cursors.discussions} 号；改动文件：${DATA_PATH}`,
  );
}

try {
  // 只有直接跑本文件才执行：门禁 import 纯函数时不许联网、不许落盘，
  // 否则每扇门禁跑一遍就顺手拉一次网，离线环境当场红。
  const entry: string = process.argv[1] || '';
  if (path.resolve(entry).endsWith(path.join('scripts', 'update-thanks.ts'))) main();
} catch (e) {
  console.error('致谢更新失败，什么都没写：' + (e instanceof Error ? e.message : String(e)));
  process.exit(1);
}
