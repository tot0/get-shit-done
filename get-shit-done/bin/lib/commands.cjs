/**
 * Commands — Standalone utility commands
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const readline = require('readline');
const { safeReadFile, loadConfig, isGitIgnored, execGit, normalizePhaseName, comparePhaseNum, getArchivedPhaseDirs, generateSlugInternal, getMilestoneInfo, resolveModelInternal, MODEL_PROFILES, toPosixPath, output, error, findPhaseInternal } = require('./core.cjs');
const { extractFrontmatter } = require('./frontmatter.cjs');

function cmdGenerateSlug(text, raw) {
  if (!text) {
    error('text required for slug generation');
  }

  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const result = { slug };
  output(result, raw, slug);
}

function cmdCurrentTimestamp(format, raw) {
  const now = new Date();
  let result;

  switch (format) {
    case 'date':
      result = now.toISOString().split('T')[0];
      break;
    case 'filename':
      result = now.toISOString().replace(/:/g, '-').replace(/\..+/, '');
      break;
    case 'full':
    default:
      result = now.toISOString();
      break;
  }

  output({ timestamp: result }, raw, result);
}

function cmdListTodos(cwd, area, raw) {
  const pendingDir = path.join(cwd, '.planning', 'todos', 'pending');

  let count = 0;
  const todos = [];

  try {
    const files = fs.readdirSync(pendingDir).filter(f => f.endsWith('.md'));

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(pendingDir, file), 'utf-8');
        const createdMatch = content.match(/^created:\s*(.+)$/m);
        const titleMatch = content.match(/^title:\s*(.+)$/m);
        const areaMatch = content.match(/^area:\s*(.+)$/m);

        const todoArea = areaMatch ? areaMatch[1].trim() : 'general';

        // Apply area filter if specified
        if (area && todoArea !== area) continue;

        count++;
        todos.push({
          file,
          created: createdMatch ? createdMatch[1].trim() : 'unknown',
          title: titleMatch ? titleMatch[1].trim() : 'Untitled',
          area: todoArea,
          path: toPosixPath(path.join('.planning', 'todos', 'pending', file)),
        });
      } catch {}
    }
  } catch {}

  const result = { count, todos };
  output(result, raw, count.toString());
}

function cmdVerifyPathExists(cwd, targetPath, raw) {
  if (!targetPath) {
    error('path required for verification');
  }

  const fullPath = path.isAbsolute(targetPath) ? targetPath : path.join(cwd, targetPath);

  try {
    const stats = fs.statSync(fullPath);
    const type = stats.isDirectory() ? 'directory' : stats.isFile() ? 'file' : 'other';
    const result = { exists: true, type };
    output(result, raw, 'true');
  } catch {
    const result = { exists: false, type: null };
    output(result, raw, 'false');
  }
}

function cmdHistoryDigest(cwd, raw) {
  const phasesDir = path.join(cwd, '.planning', 'phases');
  const digest = { phases: {}, decisions: [], tech_stack: new Set() };

  // Collect all phase directories: archived + current
  const allPhaseDirs = [];

  // Add archived phases first (oldest milestones first)
  const archived = getArchivedPhaseDirs(cwd);
  for (const a of archived) {
    allPhaseDirs.push({ name: a.name, fullPath: a.fullPath, milestone: a.milestone });
  }

  // Add current phases
  if (fs.existsSync(phasesDir)) {
    try {
      const currentDirs = fs.readdirSync(phasesDir, { withFileTypes: true })
        .filter(e => e.isDirectory())
        .map(e => e.name)
        .sort();
      for (const dir of currentDirs) {
        allPhaseDirs.push({ name: dir, fullPath: path.join(phasesDir, dir), milestone: null });
      }
    } catch {}
  }

  if (allPhaseDirs.length === 0) {
    digest.tech_stack = [];
    output(digest, raw);
    return;
  }

  try {
    for (const { name: dir, fullPath: dirPath } of allPhaseDirs) {
      const summaries = fs.readdirSync(dirPath).filter(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md');

      for (const summary of summaries) {
        try {
          const content = fs.readFileSync(path.join(dirPath, summary), 'utf-8');
          const fm = extractFrontmatter(content);

          const phaseNum = fm.phase || dir.split('-')[0];

          if (!digest.phases[phaseNum]) {
            digest.phases[phaseNum] = {
              name: fm.name || dir.split('-').slice(1).join(' ') || 'Unknown',
              provides: new Set(),
              affects: new Set(),
              patterns: new Set(),
            };
          }

          // Merge provides
          if (fm['dependency-graph'] && fm['dependency-graph'].provides) {
            fm['dependency-graph'].provides.forEach(p => digest.phases[phaseNum].provides.add(p));
          } else if (fm.provides) {
            fm.provides.forEach(p => digest.phases[phaseNum].provides.add(p));
          }

          // Merge affects
          if (fm['dependency-graph'] && fm['dependency-graph'].affects) {
            fm['dependency-graph'].affects.forEach(a => digest.phases[phaseNum].affects.add(a));
          }

          // Merge patterns
          if (fm['patterns-established']) {
            fm['patterns-established'].forEach(p => digest.phases[phaseNum].patterns.add(p));
          }

          // Merge decisions
          if (fm['key-decisions']) {
            fm['key-decisions'].forEach(d => {
              digest.decisions.push({ phase: phaseNum, decision: d });
            });
          }

          // Merge tech stack
          if (fm['tech-stack'] && fm['tech-stack'].added) {
            fm['tech-stack'].added.forEach(t => digest.tech_stack.add(typeof t === 'string' ? t : t.name));
          }

        } catch (e) {
          // Skip malformed summaries
        }
      }
    }

    // Convert Sets to Arrays for JSON output
    Object.keys(digest.phases).forEach(p => {
      digest.phases[p].provides = [...digest.phases[p].provides];
      digest.phases[p].affects = [...digest.phases[p].affects];
      digest.phases[p].patterns = [...digest.phases[p].patterns];
    });
    digest.tech_stack = [...digest.tech_stack];

    output(digest, raw);
  } catch (e) {
    error('Failed to generate history digest: ' + e.message);
  }
}

function cmdResolveModel(cwd, agentType, raw) {
  if (!agentType) {
    error('agent-type required');
  }

  const config = loadConfig(cwd);
  const profile = config.model_profile || 'balanced';
  const model = resolveModelInternal(cwd, agentType);

  const agentModels = MODEL_PROFILES[agentType];
  const result = agentModels
    ? { model, profile }
    : { model, profile, unknown_agent: true };
  output(result, raw, model);
}

function cmdCommit(cwd, message, files, raw, amend) {
  if (!message && !amend) {
    error('commit message required');
  }

  const config = loadConfig(cwd);

  // Check commit_docs config
  if (!config.commit_docs) {
    const result = { committed: false, hash: null, reason: 'skipped_commit_docs_false' };
    output(result, raw, 'skipped');
    return;
  }

  // Check if .planning is gitignored
  if (isGitIgnored(cwd, '.planning')) {
    const result = { committed: false, hash: null, reason: 'skipped_gitignored' };
    output(result, raw, 'skipped');
    return;
  }

  // Stage files
  const filesToStage = files && files.length > 0 ? files : ['.planning/'];
  for (const file of filesToStage) {
    execGit(cwd, ['add', file]);
  }

  // Commit
  const commitArgs = amend ? ['commit', '--amend', '--no-edit'] : ['commit', '-m', message];
  const commitResult = execGit(cwd, commitArgs);
  if (commitResult.exitCode !== 0) {
    if (commitResult.stdout.includes('nothing to commit') || commitResult.stderr.includes('nothing to commit')) {
      const result = { committed: false, hash: null, reason: 'nothing_to_commit' };
      output(result, raw, 'nothing');
      return;
    }
    const result = { committed: false, hash: null, reason: 'nothing_to_commit', error: commitResult.stderr };
    output(result, raw, 'nothing');
    return;
  }

  // Get short hash
  const hashResult = execGit(cwd, ['rev-parse', '--short', 'HEAD']);
  const hash = hashResult.exitCode === 0 ? hashResult.stdout : null;
  const result = { committed: true, hash, reason: 'committed' };
  output(result, raw, hash || 'committed');
}

function globToRegex(pattern) {
  let p = pattern;
  // Directory patterns (ending with /) match all contents
  if (p.endsWith('/')) p = p + '**';

  let regex = '';
  let i = 0;
  while (i < p.length) {
    const ch = p[i];
    if (ch === '*' && p[i + 1] === '*') {
      // ** matches any path segments
      regex += (p[i + 2] === '/') ? '(?:.*/)?' : '.*';
      i += (p[i + 2] === '/') ? 3 : 2;
    } else if (ch === '*') {
      regex += '[^/]*'; // * matches within single path segment
      i++;
    } else if (ch === '?') {
      regex += '[^/]';
      i++;
    } else if ('.+^${}()|[]\\'.includes(ch)) {
      regex += '\\' + ch;
      i++;
    } else {
      regex += ch;
      i++;
    }
  }
  return new RegExp('^' + regex + '$');
}

function resolveBaseBranch(cwd, config, flagBase) {
  const candidates = [];
  if (flagBase) candidates.push(flagBase);
  if (config.pr_branch_base) candidates.push(config.pr_branch_base);
  candidates.push('main', 'master');

  for (const branch of candidates) {
    const r = execGit(cwd, ['rev-parse', '--verify', branch]);
    if (r.exitCode === 0) return branch;
  }
  return null;
}

function getMergeBase(cwd, baseBranch) {
  const r = execGit(cwd, ['merge-base', baseBranch, 'HEAD']);
  if (r.exitCode !== 0) return null;
  return r.stdout;
}

function listCommits(cwd, mergeBase) {
  const r = execGit(cwd, ['log', '--format=%h%x00%s%x00%p', mergeBase + '..HEAD']);
  if (r.exitCode !== 0 || !r.stdout) return [];
  return r.stdout.split('\n').map(line => {
    const [hash, subject, parents] = line.split('\0');
    return { hash, subject, isMerge: parents.includes(' ') };
  });
}

function getCommitFiles(cwd, hash, isMerge) {
  const args = isMerge
    ? ['diff', '--name-only', hash + '^1', hash]
    : ['diff-tree', '--no-commit-id', '-r', '--name-only', hash];
  const r = execGit(cwd, args);
  if (r.exitCode !== 0 || !r.stdout) return [];
  return r.stdout.split('\n').filter(Boolean);
}

function classifyCommit(files, filterPatterns) {
  const planningFiles = [];
  const codeFiles = [];
  for (const file of files) {
    if (filterPatterns.some(re => re.test(file))) {
      planningFiles.push(file);
    } else {
      codeFiles.push(file);
    }
  }
  const type = planningFiles.length > 0 && codeFiles.length > 0 ? 'mixed'
    : planningFiles.length > 0 ? 'planning'
      : 'code';
  return { type, planningFiles, codeFiles };
}

function getPrBranchName(cwd) {
  const r = execGit(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']);
  if (r.exitCode !== 0 || r.stdout === 'HEAD') return null;
  return r.stdout + '-pr';
}

function prBranchExists(cwd, branchName) {
  return execGit(cwd, ['rev-parse', '--verify', branchName]).exitCode === 0;
}

function prBranchPushed(cwd, branchName) {
  return execGit(cwd, ['rev-parse', '--verify', 'refs/remotes/origin/' + branchName]).exitCode === 0;
}

function createWorktree(cwd, branchName, startPoint) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-pr-'));
  execGit(cwd, ['worktree', 'prune']);
  const exists = execGit(cwd, ['rev-parse', '--verify', branchName]).exitCode === 0;
  const result = exists
    ? execGit(cwd, ['worktree', 'add', tmpDir, branchName])
    : execGit(cwd, ['worktree', 'add', '-b', branchName, tmpDir, startPoint]);
  if (result.exitCode !== 0) {
    try { fs.rmdirSync(tmpDir); } catch {}
    return null;
  }
  return tmpDir;
}

function removeWorktree(cwd, worktreePath) {
  if (!worktreePath) return;
  execGit(cwd, ['worktree', 'remove', '--force', worktreePath]);
  try { fs.rmSync(worktreePath, { recursive: true, force: true }); } catch {}
  execGit(cwd, ['worktree', 'prune']);
}

function cherryPickCommits(wtCwd, commitsToCherry) {
  const picked = [];
  let failed = null;
  const skippedMerges = [];
  const skippedEmpty = [];

  for (const commit of commitsToCherry) {
    if (commit.isMerge) {
      skippedMerges.push({ hash: commit.hash, subject: commit.subject, reason: 'merge commit cannot be cherry-picked' });
      continue;
    }

    const r = execGit(wtCwd, ['cherry-pick', commit.hash]);
    if (r.exitCode === 0) {
      picked.push({ hash: commit.hash, subject: commit.subject });
      continue;
    }

    // Check for conflict files
    const diffResult = execGit(wtCwd, ['diff', '--name-only', '--diff-filter=U']);
    const conflictFiles = diffResult.stdout ? diffResult.stdout.split('\n').filter(Boolean) : [];

    // Empty cherry-pick (already applied)
    if (conflictFiles.length === 0 && (r.stderr.includes('nothing to commit') || r.stdout.includes('nothing to commit'))) {
      skippedEmpty.push({ hash: commit.hash, subject: commit.subject, reason: 'already applied' });
      execGit(wtCwd, ['cherry-pick', '--skip']);
      continue;
    }

    // Real conflict — abort and break
    if (conflictFiles.length > 0) {
      execGit(wtCwd, ['cherry-pick', '--abort']);
      failed = { hash: commit.hash, subject: commit.subject, conflictFiles };
      break;
    }

    // Unknown failure — abort and break
    execGit(wtCwd, ['cherry-pick', '--abort']);
    failed = { hash: commit.hash, subject: commit.subject, conflictFiles: [], error: r.stderr };
    break;
  }

  return { picked, failed, skippedMerges, skippedEmpty };
}

function buildPatchIdMap(cwd, commitSHAs) {
  const map = new Map();
  for (const sha of commitSHAs) {
    const diff = execGit(cwd, ['diff-tree', '-p', sha]);
    if (diff.exitCode !== 0 || !diff.stdout) continue;
    try {
      const out = execSync('git patch-id --stable', {
        input: diff.stdout, cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();
      if (out) {
        const patchId = out.split(' ')[0];
        map.set(patchId, sha);
      }
    } catch {}
  }
  return map;
}

function findNewCodeCommits(cwd, baseBranch, prBranch, codeCommits) {
  // Get PR branch commit SHAs
  const prLog = execGit(cwd, ['rev-list', baseBranch + '..' + prBranch]);
  const prSHAs = (prLog.exitCode === 0 && prLog.stdout) ? prLog.stdout.split('\n').filter(Boolean) : [];

  // If PR branch is empty or fresh, all code commits are new
  if (prSHAs.length === 0) {
    return { newCommits: codeCommits, needsRebuild: false };
  }

  // Build patch-id maps for both sides
  const prPatchIds = buildPatchIdMap(cwd, prSHAs);
  const sourcePatchIds = buildPatchIdMap(cwd, codeCommits.map(c => c.hash));

  // Filter: code commits whose patch-id is NOT already on PR branch
  const newCommits = [];
  let matchCount = 0;
  for (const commit of codeCommits) {
    // Find this commit's patch-id in the source map
    let commitPatchId = null;
    for (const [pid, sha] of sourcePatchIds) {
      if (sha === commit.hash) {
        commitPatchId = pid;
        break;
      }
    }
    if (commitPatchId && prPatchIds.has(commitPatchId)) {
      matchCount++;
    } else {
      newCommits.push(commit);
    }
  }

  // Detect rebuild scenario: PR has commits but zero source patch-ids match
  const needsRebuild = prSHAs.length > 0 && matchCount === 0;

  return { newCommits, needsRebuild };
}

function promptForBranch() {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) {
      reject(new Error(
        'Cannot auto-detect base branch. Use --base <branch> or set pr_branch.base_branch in config.'
      ));
      return;
    }
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stderr,
    });
    rl.question('Enter base branch name: ', (answer) => {
      rl.close();
      const branch = answer.trim();
      if (!branch) reject(new Error('No branch name provided'));
      else resolve(branch);
    });
  });
}

function useColor() {
  if (process.env.NO_COLOR !== undefined) return false;
  if (process.env.FORCE_COLOR !== undefined) return true;
  return process.stdout.isTTY === true;
}

function c(colorCode, text) {
  return useColor() ? colorCode + text + '\x1b[0m' : text;
}

async function cmdPrBranch(cwd, flags, raw) {
  const config = loadConfig(cwd);

  // Step A: Resolve base branch
  let baseBranch = resolveBaseBranch(cwd, config, flags.base);
  if (!baseBranch) {
    try {
      const prompted = await promptForBranch();
      const verify = execGit(cwd, ['rev-parse', '--verify', prompted]);
      if (verify.exitCode !== 0) {
        error('Branch "' + prompted + '" does not exist');
      }
      baseBranch = prompted;
    } catch (e) {
      error(e.message);
    }
  }

  // Step B: Find merge base
  const mergeBase = getMergeBase(cwd, baseBranch);
  if (!mergeBase) {
    error('Could not find merge base between ' + baseBranch + ' and HEAD');
  }
  const shortMergeBase = execGit(cwd, ['rev-parse', '--short', mergeBase]).stdout;

  // Step C: List and classify commits
  const filterPatterns = (config.pr_branch_filter_paths || ['.planning/']).map(p => globToRegex(p));
  const commits = listCommits(cwd, mergeBase);

  if (commits.length === 0) {
    const msg = 'No commits found since divergence from ' + baseBranch + '. Are you on the right branch?';
    if (raw) {
      output({
        baseBranch,
        mergeBase: shortMergeBase,
        filterPaths: config.pr_branch_filter_paths,
        commits: [],
        summary: { planning: 0, code: 0, mixed: 0 },
      }, raw, JSON.stringify({ planning: 0, code: 0, mixed: 0 }));
    }
    process.stdout.write(msg + '\n');
    process.exit(0);
  }

  const classifiedCommits = [];
  for (const commit of commits) {
    const files = getCommitFiles(cwd, commit.hash, commit.isMerge);
    const classification = classifyCommit(files, filterPatterns);
    classifiedCommits.push({ ...commit, ...classification });
  }

  // Count categories
  let planCount = 0;
  let codeCount = 0;
  let mixedCount = 0;
  for (const cc of classifiedCommits) {
    if (cc.type === 'planning') planCount++;
    else if (cc.type === 'code') codeCount++;
    else mixedCount++;
  }

  // ── Dry-run mode ────────────────────────────────────────────────────────
  if (flags.dryRun) {
    // Raw output for dry-run
    if (raw) {
      output({
        mode: 'dry-run',
        baseBranch,
        mergeBase: shortMergeBase,
        filterPaths: config.pr_branch_filter_paths,
        commits: classifiedCommits.map(cc => ({
          hash: cc.hash,
          subject: cc.subject,
          type: cc.type,
          isMerge: cc.isMerge,
          planningFiles: cc.planningFiles,
          codeFiles: cc.codeFiles,
        })),
        summary: { planning: planCount, code: codeCount, mixed: mixedCount },
      }, raw, JSON.stringify({ planning: planCount, code: codeCount, mixed: mixedCount }));
    }

    // Human-readable dry-run report
    const rule = '─'.repeat(50);
    const warn = '⚠';
    const lines = [];

    lines.push('Dry-run: pr-branch');
    lines.push(c('\x1b[2m', rule));
    lines.push('Base branch: ' + c('\x1b[1m', baseBranch) + '  Merge base: ' + c('\x1b[1m', shortMergeBase));

    const defaultPaths = ['.planning/'];
    const configuredPaths = config.pr_branch_filter_paths || defaultPaths;
    const isCustomized = configuredPaths.length !== defaultPaths.length ||
      configuredPaths.some((p, i) => p !== defaultPaths[i]);
    if (isCustomized) {
      lines.push('Filter paths: ' + configuredPaths.join(', '));
    }

    lines.push('');

    for (const cc of classifiedCommits) {
      if (cc.type === 'planning') {
        lines.push(' ' + c('\x1b[2m', 'PLAN') + '  ' + cc.hash + ' ' + cc.subject);
      } else if (cc.type === 'code') {
        lines.push(' ' + c('\x1b[32m', 'CODE') + '  ' + cc.hash + ' ' + cc.subject);
      } else {
        lines.push(c('\x1b[33m', warn) + ' ' + c('\x1b[33m', 'MIX') + '   ' + cc.hash + ' ' + cc.subject);
        lines.push('       Planning: ' + cc.planningFiles.join(', '));
        lines.push('       Code:     ' + cc.codeFiles.join(', '));
        lines.push('       Tip: Split this commit to rescue code changes');
      }
    }

    lines.push('');
    lines.push(c('\x1b[2m', rule));
    lines.push('Summary: ' + planCount + ' planning · ' + codeCount + ' code · ' + mixedCount + ' mixed');

    if (mixedCount > 0) {
      lines.push('');
      lines.push(c('\x1b[33m', warn + ' ' + mixedCount + ' mixed commit(s) need splitting before creating PR branch'));
    } else if (codeCount > 0) {
      lines.push('');
      lines.push(c('\x1b[32m', 'Run without --dry-run to create PR branch'));
    } else if (planCount > 0 && codeCount === 0 && mixedCount === 0) {
      lines.push('');
      lines.push('No code commits to include in PR branch — all commits are planning-only');
    }

    process.stdout.write(lines.join('\n') + '\n');
    process.exit(0);
  }

  // ── Execution mode ──────────────────────────────────────────────────────

  const rule = '─'.repeat(50);
  const warn = '⚠';

  // Step 1: Derive PR branch name
  const prBranch = getPrBranchName(cwd);
  if (!prBranch) {
    error('Cannot derive PR branch name: detached HEAD. Checkout a branch first.');
  }

  // Step 2: Filter to code-only commits (oldest first for cherry-pick order)
  const codeCommits = classifiedCommits.filter(cc => cc.type === 'code').reverse();
  const mixedCommits = classifiedCommits.filter(cc => cc.type === 'mixed');

  if (codeCommits.length === 0) {
    const msg = 'No code commits to cherry-pick.';
    if (mixedCommits.length > 0) {
      process.stdout.write(msg + ' ' + mixedCommits.length + ' mixed commit(s) skipped.\n');
    } else {
      process.stdout.write(msg + '\n');
    }
    process.exit(0);
  }

  // Step 3: Determine incremental vs fresh
  let prExists = prBranchExists(cwd, prBranch);
  let commitsToCherry;
  let mode = 'fresh';

  if (prExists) {
    const { newCommits, needsRebuild } = findNewCodeCommits(cwd, baseBranch, prBranch, codeCommits);

    if (needsRebuild) {
      if (prBranchPushed(cwd, prBranch)) {
        error('PR branch was pushed to remote. Source appears rebased — update will require force-push. Delete the remote PR branch or use --force (future v2) to proceed.');
      }
      // Not pushed — safe to rebuild
      process.stderr.write(c('\x1b[33m', warn + ' Source appears rebased. PR branch will be rebuilt.') + '\n');
      execGit(cwd, ['branch', '-D', prBranch]);
      prExists = false;
      commitsToCherry = codeCommits;
      mode = 'rebuild';
    } else {
      commitsToCherry = newCommits;
      mode = 'incremental';
    }

    if (commitsToCherry.length === 0) {
      process.stdout.write('PR branch is up to date. No new commits to cherry-pick.\n');
      process.exit(0);
    }
  } else {
    commitsToCherry = codeCommits;
  }

  // Step 4: Create worktree and cherry-pick (try/finally)
  let wtPath;
  let cpResult;
  try {
    const startPoint = prExists ? null : mergeBase;
    wtPath = createWorktree(cwd, prBranch, startPoint);
    if (!wtPath) error('Failed to create worktree for PR branch');

    cpResult = cherryPickCommits(wtPath, commitsToCherry);

    if (cpResult.failed) {
      // UX-03: Conflict report
      const failLines = [];
      failLines.push(c('\x1b[31m', 'Cherry-pick conflict on commit ' + cpResult.failed.hash));
      failLines.push('  Subject: ' + cpResult.failed.subject);
      if (cpResult.failed.conflictFiles.length > 0) {
        failLines.push('  Conflicting files:');
        for (const f of cpResult.failed.conflictFiles) {
          failLines.push('    - ' + f);
        }
      }
      if (cpResult.failed.error) {
        failLines.push('  Error: ' + cpResult.failed.error);
      }
      failLines.push('');
      failLines.push('Successfully cherry-picked ' + cpResult.picked.length + ' commit(s) before conflict.');
      failLines.push('PR branch has been left in its pre-update state.');
      process.stderr.write(failLines.join('\n') + '\n');
      process.exit(1);
    }
  } finally {
    removeWorktree(cwd, wtPath);
  }

  // Step 5: Raw JSON output for execution mode
  if (raw) {
    output({
      mode: 'execute',
      prBranch,
      baseBranch,
      mergeBase: shortMergeBase,
      picked: cpResult.picked,
      skippedMixed: mixedCommits.map(cc => ({ hash: cc.hash, subject: cc.subject })),
      skippedMerges: cpResult.skippedMerges,
      skippedEmpty: cpResult.skippedEmpty,
      failed: null,
    }, raw, JSON.stringify({
      prBranch,
      picked: cpResult.picked.length,
      skippedMixed: mixedCommits.length,
      skippedMerges: cpResult.skippedMerges.length,
      skippedEmpty: cpResult.skippedEmpty.length,
    }));
  }

  // Step 6: Build execution summary
  const execLines = [];
  execLines.push('pr-branch: ' + c('\x1b[1m', prBranch));
  execLines.push(c('\x1b[2m', rule));

  if (mode === 'fresh') {
    execLines.push('Created new PR branch from merge base ' + shortMergeBase);
  } else if (mode === 'rebuild') {
    execLines.push('Rebuilt PR branch (source was rebased)');
  } else {
    execLines.push('Incremental update');
  }
  execLines.push('');

  // Cherry-picked commits
  for (const p of cpResult.picked) {
    execLines.push('  ' + c('\x1b[32m', 'CODE') + '  ' + p.hash + ' ' + p.subject);
  }

  // Skipped mixed
  for (const m of mixedCommits) {
    execLines.push(c('\x1b[33m', warn) + ' ' + c('\x1b[33m', 'MIX') + '   ' + m.hash + ' ' + m.subject);
  }

  // Skipped merges
  for (const sm of cpResult.skippedMerges) {
    execLines.push(c('\x1b[2m', '  SKIP') + '  ' + sm.hash + ' ' + sm.subject + ' (merge)');
  }

  // Skipped empty (already applied)
  for (const se of cpResult.skippedEmpty) {
    execLines.push(c('\x1b[2m', '  SKIP') + '  ' + se.hash + ' ' + se.subject + ' (already applied)');
  }

  execLines.push('');
  execLines.push(c('\x1b[2m', rule));

  const skippedTotal = mixedCommits.length + cpResult.skippedMerges.length + cpResult.skippedEmpty.length;
  execLines.push('Cherry-picked: ' + cpResult.picked.length + ' · Skipped: ' + skippedTotal +
    (mixedCommits.length > 0 ? ' (' + mixedCommits.length + ' mixed)' : '') +
    ' · PR branch: ' + prBranch);

  if (mixedCommits.length > 0) {
    execLines.push('');
    execLines.push(c('\x1b[33m', warn + ' Split mixed commits to include their code changes'));
  }

  process.stdout.write(execLines.join('\n') + '\n');
  process.exit(0);
}

function cmdSummaryExtract(cwd, summaryPath, fields, raw) {
  if (!summaryPath) {
    error('summary-path required for summary-extract');
  }

  const fullPath = path.join(cwd, summaryPath);

  if (!fs.existsSync(fullPath)) {
    output({ error: 'File not found', path: summaryPath }, raw);
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  const fm = extractFrontmatter(content);

  // Parse key-decisions into structured format
  const parseDecisions = (decisionsList) => {
    if (!decisionsList || !Array.isArray(decisionsList)) return [];
    return decisionsList.map(d => {
      const colonIdx = d.indexOf(':');
      if (colonIdx > 0) {
        return {
          summary: d.substring(0, colonIdx).trim(),
          rationale: d.substring(colonIdx + 1).trim(),
        };
      }
      return { summary: d, rationale: null };
    });
  };

  // Build full result
  const fullResult = {
    path: summaryPath,
    one_liner: fm['one-liner'] || null,
    key_files: fm['key-files'] || [],
    tech_added: (fm['tech-stack'] && fm['tech-stack'].added) || [],
    patterns: fm['patterns-established'] || [],
    decisions: parseDecisions(fm['key-decisions']),
    requirements_completed: fm['requirements-completed'] || [],
  };

  // If fields specified, filter to only those fields
  if (fields && fields.length > 0) {
    const filtered = { path: summaryPath };
    for (const field of fields) {
      if (fullResult[field] !== undefined) {
        filtered[field] = fullResult[field];
      }
    }
    output(filtered, raw);
    return;
  }

  output(fullResult, raw);
}

async function cmdWebsearch(query, options, raw) {
  const apiKey = process.env.BRAVE_API_KEY;

  if (!apiKey) {
    // No key = silent skip, agent falls back to built-in WebSearch
    output({ available: false, reason: 'BRAVE_API_KEY not set' }, raw, '');
    return;
  }

  if (!query) {
    output({ available: false, error: 'Query required' }, raw, '');
    return;
  }

  const params = new URLSearchParams({
    q: query,
    count: String(options.limit || 10),
    country: 'us',
    search_lang: 'en',
    text_decorations: 'false'
  });

  if (options.freshness) {
    params.set('freshness', options.freshness);
  }

  try {
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?${params}`,
      {
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': apiKey
        }
      }
    );

    if (!response.ok) {
      output({ available: false, error: `API error: ${response.status}` }, raw, '');
      return;
    }

    const data = await response.json();

    const results = (data.web?.results || []).map(r => ({
      title: r.title,
      url: r.url,
      description: r.description,
      age: r.age || null
    }));

    output({
      available: true,
      query,
      count: results.length,
      results
    }, raw, results.map(r => `${r.title}\n${r.url}\n${r.description}`).join('\n\n'));
  } catch (err) {
    output({ available: false, error: err.message }, raw, '');
  }
}

function cmdProgressRender(cwd, format, raw) {
  const phasesDir = path.join(cwd, '.planning', 'phases');
  const roadmapPath = path.join(cwd, '.planning', 'ROADMAP.md');
  const milestone = getMilestoneInfo(cwd);

  const phases = [];
  let totalPlans = 0;
  let totalSummaries = 0;

  try {
    const entries = fs.readdirSync(phasesDir, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name).sort((a, b) => comparePhaseNum(a, b));

    for (const dir of dirs) {
      const dm = dir.match(/^(\d+(?:\.\d+)*)-?(.*)/);
      const phaseNum = dm ? dm[1] : dir;
      const phaseName = dm && dm[2] ? dm[2].replace(/-/g, ' ') : '';
      const phaseFiles = fs.readdirSync(path.join(phasesDir, dir));
      const plans = phaseFiles.filter(f => f.endsWith('-PLAN.md') || f === 'PLAN.md').length;
      const summaries = phaseFiles.filter(f => f.endsWith('-SUMMARY.md') || f === 'SUMMARY.md').length;

      totalPlans += plans;
      totalSummaries += summaries;

      let status;
      if (plans === 0) status = 'Pending';
      else if (summaries >= plans) status = 'Complete';
      else if (summaries > 0) status = 'In Progress';
      else status = 'Planned';

      phases.push({ number: phaseNum, name: phaseName, plans, summaries, status });
    }
  } catch {}

  const percent = totalPlans > 0 ? Math.min(100, Math.round((totalSummaries / totalPlans) * 100)) : 0;

  if (format === 'table') {
    // Render markdown table
    const barWidth = 10;
    const filled = Math.round((percent / 100) * barWidth);
    const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(barWidth - filled);
    let out = `# ${milestone.version} ${milestone.name}\n\n`;
    out += `**Progress:** [${bar}] ${totalSummaries}/${totalPlans} plans (${percent}%)\n\n`;
    out += `| Phase | Name | Plans | Status |\n`;
    out += `|-------|------|-------|--------|\n`;
    for (const p of phases) {
      out += `| ${p.number} | ${p.name} | ${p.summaries}/${p.plans} | ${p.status} |\n`;
    }
    output({ rendered: out }, raw, out);
  } else if (format === 'bar') {
    const barWidth = 20;
    const filled = Math.round((percent / 100) * barWidth);
    const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(barWidth - filled);
    const text = `[${bar}] ${totalSummaries}/${totalPlans} plans (${percent}%)`;
    output({ bar: text, percent, completed: totalSummaries, total: totalPlans }, raw, text);
  } else {
    // JSON format
    output({
      milestone_version: milestone.version,
      milestone_name: milestone.name,
      phases,
      total_plans: totalPlans,
      total_summaries: totalSummaries,
      percent,
    }, raw);
  }
}

function cmdTodoComplete(cwd, filename, raw) {
  if (!filename) {
    error('filename required for todo complete');
  }

  const pendingDir = path.join(cwd, '.planning', 'todos', 'pending');
  const completedDir = path.join(cwd, '.planning', 'todos', 'completed');
  const sourcePath = path.join(pendingDir, filename);

  if (!fs.existsSync(sourcePath)) {
    error(`Todo not found: ${filename}`);
  }

  // Ensure completed directory exists
  fs.mkdirSync(completedDir, { recursive: true });

  // Read, add completion timestamp, move
  let content = fs.readFileSync(sourcePath, 'utf-8');
  const today = new Date().toISOString().split('T')[0];
  content = `completed: ${today}\n` + content;

  fs.writeFileSync(path.join(completedDir, filename), content, 'utf-8');
  fs.unlinkSync(sourcePath);

  output({ completed: true, file: filename, date: today }, raw, 'completed');
}

function cmdScaffold(cwd, type, options, raw) {
  const { phase, name } = options;
  const padded = phase ? normalizePhaseName(phase) : '00';
  const today = new Date().toISOString().split('T')[0];

  // Find phase directory
  const phaseInfo = phase ? findPhaseInternal(cwd, phase) : null;
  const phaseDir = phaseInfo ? path.join(cwd, phaseInfo.directory) : null;

  if (phase && !phaseDir && type !== 'phase-dir') {
    error(`Phase ${phase} directory not found`);
  }

  let filePath, content;

  switch (type) {
    case 'context': {
      filePath = path.join(phaseDir, `${padded}-CONTEXT.md`);
      content = `---\nphase: "${padded}"\nname: "${name || phaseInfo?.phase_name || 'Unnamed'}"\ncreated: ${today}\n---\n\n# Phase ${phase}: ${name || phaseInfo?.phase_name || 'Unnamed'} — Context\n\n## Decisions\n\n_Decisions will be captured during /gsd:discuss-phase ${phase}_\n\n## Discretion Areas\n\n_Areas where the executor can use judgment_\n\n## Deferred Ideas\n\n_Ideas to consider later_\n`;
      break;
    }
    case 'uat': {
      filePath = path.join(phaseDir, `${padded}-UAT.md`);
      content = `---\nphase: "${padded}"\nname: "${name || phaseInfo?.phase_name || 'Unnamed'}"\ncreated: ${today}\nstatus: pending\n---\n\n# Phase ${phase}: ${name || phaseInfo?.phase_name || 'Unnamed'} — User Acceptance Testing\n\n## Test Results\n\n| # | Test | Status | Notes |\n|---|------|--------|-------|\n\n## Summary\n\n_Pending UAT_\n`;
      break;
    }
    case 'verification': {
      filePath = path.join(phaseDir, `${padded}-VERIFICATION.md`);
      content = `---\nphase: "${padded}"\nname: "${name || phaseInfo?.phase_name || 'Unnamed'}"\ncreated: ${today}\nstatus: pending\n---\n\n# Phase ${phase}: ${name || phaseInfo?.phase_name || 'Unnamed'} — Verification\n\n## Goal-Backward Verification\n\n**Phase Goal:** [From ROADMAP.md]\n\n## Checks\n\n| # | Requirement | Status | Evidence |\n|---|------------|--------|----------|\n\n## Result\n\n_Pending verification_\n`;
      break;
    }
    case 'phase-dir': {
      if (!phase || !name) {
        error('phase and name required for phase-dir scaffold');
      }
      const slug = generateSlugInternal(name);
      const dirName = `${padded}-${slug}`;
      const phasesParent = path.join(cwd, '.planning', 'phases');
      fs.mkdirSync(phasesParent, { recursive: true });
      const dirPath = path.join(phasesParent, dirName);
      fs.mkdirSync(dirPath, { recursive: true });
      output({ created: true, directory: `.planning/phases/${dirName}`, path: dirPath }, raw, dirPath);
      return;
    }
    default:
      error(`Unknown scaffold type: ${type}. Available: context, uat, verification, phase-dir`);
  }

  if (fs.existsSync(filePath)) {
    output({ created: false, reason: 'already_exists', path: filePath }, raw, 'exists');
    return;
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  const relPath = toPosixPath(path.relative(cwd, filePath));
  output({ created: true, path: relPath }, raw, relPath);
}

module.exports = {
  cmdGenerateSlug,
  cmdCurrentTimestamp,
  cmdListTodos,
  cmdVerifyPathExists,
  cmdHistoryDigest,
  cmdResolveModel,
  cmdCommit,
  cmdPrBranch,
  cmdSummaryExtract,
  cmdWebsearch,
  cmdProgressRender,
  cmdTodoComplete,
  cmdScaffold,
};
