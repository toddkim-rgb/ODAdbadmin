/* 공통 모듈 — 저장소, 권한, 결재 엔진, 라우터, UI 헬퍼 */
window.App = (function () {
  const K = window.KIDC;
  const U = K.u;
  const A = { K, U };
  const KEY = 'kidc-db-prototype-v4';

  /* ── DOM/포맷 ─────────────────────────────── */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = v => (v == null || v === '' || isNaN(v) ? '-' : Math.round(+v).toLocaleString('ko-KR'));
  const won = v => (v == null || v === '' ? '-' : num(v) + '원');
  const eok = (v, d = 1) => (v == null || v === '' ? '-' : (v / 1e8).toLocaleString('ko-KR', { minimumFractionDigits: d, maximumFractionDigits: d }) + '억');
  const pct = (v, d = 1) => (v == null || !isFinite(v) ? '-' : (+v).toFixed(d) + '%');
  const size = b => (b > 1048576 ? (b / 1048576).toFixed(1) + 'MB' : Math.max(1, Math.round(b / 1024)) + 'KB');
  Object.assign(A, { $, $$, esc, num, won, eok, pct, size });

  /* ── 저장소 ─────────────────────────────── */
  A.load = () => {
    try { const s = localStorage.getItem(KEY); if (s) { A.db = JSON.parse(s); if (A.db.ver === 4) return; } } catch (e) { /* 저장소 사용 불가 시 메모리만 사용 */ }
    A.db = K.build(); A.save();
  };
  A.save = () => { try { localStorage.setItem(KEY, JSON.stringify(A.db)); } catch (e) { console.warn('저장 실패', e); } };
  A.reset = () => { const sess = A.db && A.db.session; A.db = K.build(); if (sess) A.db.session = sess; A.save(); A.toast('데모 데이터를 초기 상태로 되돌렸습니다.', 'ok'); A.go('/dashboard'); A.render(); };

  /* ── 조회 헬퍼 ─────────────────────────────── */
  A.me = () => A.db.users.find(u => u.id === A.db.session.userId) || A.db.users[0];
  A.user = id => A.db.users.find(u => u.id === id);
  A.uname = id => (A.user(id) || {}).name || (id ? id : '-');
  A.ulabel = id => { const u = A.user(id); return u ? `${u.name} ${u.title}` : '-'; };
  A.P = id => A.db.projects.find(p => p.id === id && !p.deleted);
  A.projects = () => A.db.projects.filter(p => !p.deleted);
  A.stageName = K.stageName;
  A.stageLabel = p => (['HELD', 'REJECTED'].includes(p.stage) && p.sub ? `${K.stageName(p.stage)}(${p.sub})` : K.stageName(p.stage) + (p.sub ? ` · ${p.sub}` : ''));
  A.stageBadge = (k, p) => `<span class="b st-${k}">${esc(p ? A.stageLabel(p) : K.stageName(k))}</span>`;
  A.pid = p => (p.round ? `${p.id} · ${p.round}차` : p.id);
  const AP_N = { DRAFT: '임시저장', PENDING: '진행중', APPROVED: '승인완료', RETURNED: '반려', SUPPLEMENT: '보완요청', WITHDRAWN: '회수' };
  const AP_T = { NEW: '신규 발굴 등록', REPROPOSE: '재제안 접수', EDIT: '사업정보 수정', CONTRACT: '입찰·계약정보', BUDGET: '예산변경', STAGE: '추진단계 변경', DELETE: '사업 삭제', PDM: 'PDM 기초선', EVAL: '자체평가' };
  A.AP_N = AP_N; A.AP_T = AP_T;
  A.apBadge = s => `<span class="b ap-${s}">${AP_N[s] || s}</span>`;
  A.surplusOf = p => (p.orderAmt != null && p.contractAmt != null ? p.orderAmt - p.contractAmt : null);
  A.rateOf = p => (p.orderAmt && p.contractAmt != null ? (p.contractAmt / p.orderAmt) * 100 : null);
  A.execOf = p => p.execs.reduce((s, e) => s + e.amt, 0);
  A.achv = i => {
    if (i.end == null) return { k: 'ing', n: '진행중', r: null };
    const r = i.target === i.base ? (i.end >= i.target ? 100 : 0) : ((i.end - i.base) / (i.target - i.base)) * 100;
    return r >= 100 ? { k: 'ok', n: '달성', r } : { k: 'bad', n: '미달성', r };
  };
  A.achvBadge = a => a.k === 'ok' ? '<span class="b ok"><span class="ic">●</span>달성</span>' : a.k === 'bad' ? '<span class="b bad"><span class="ic">▲</span>미달성</span>' : '<span class="b mute"><span class="ic">○</span>진행중</span>';
  A.measured = p => (p.perf ? p.perf.indicators.filter(i => ['Outcome', 'Output'].includes(i.level)) : []);

  /* ── 전 주기 (로드맵 시안 기준) ─────────────── */
  A.phaseOf = p => (['DISCOVERED', 'PRELIM', 'HELD'].includes(p.stage) ? 'pre' : p.stage === 'REJECTED' ? 'drop' : ['CONFIRMED', 'CONTRACTED', 'ONGOING'].includes(p.stage) ? 'run' : p.stage === 'FOLLOWUP' ? 'trk' : p.endYear >= 2023 ? 'end' : 'end0');
  A.PHASES = { pre: '발굴·예비', drop: '미선정', run: '확정·수행', trk: '추적조사', end: '종료', end0: '종료(’22 이전)' };
  A.isDue = (p, y) => p.endYear >= 2023 && ['ONGOING', 'CLOSED', 'FOLLOWUP'].includes(p.stage) && y >= p.endYear + 1 && y <= p.endYear + K.TRACK(p.type);
  A.trackPlan = p => {
    if (p.endYear < 2023 || !['ONGOING', 'CLOSED', 'FOLLOWUP'].includes(p.stage)) return [];
    const T = U.today(), rows = [];
    for (let k = 1; k <= K.TRACK(p.type); k++) {
      const due = `${p.endYear + k}-02-28`;
      const t = p.perf && p.perf.tracking.find(x => x.round === k);
      rows.push({ round: k, due, t, status: t ? t.status : due < T ? '미제출' : '예정' });
    }
    return rows;
  };
  const fy = d => `’${String(d).slice(2, 4)}.${+String(d).slice(5, 7)}`;
  /* 사업 전 주기 10단계 — 각 단계 일자와 '실제 값/계산 값' 구분 */
  A.lifecycle = p => {
    const cur = p.round || 1;
    const H = (k, sub) => [...p.stageHist].reverse().find(h => h.k === k && (sub == null || h.sub === sub) && (h.round || 1) === cur) || [...p.stageHist].reverse().find(h => h.k === k && (sub == null || h.sub === sub));
    const D = h => (h ? (h.calc ? h.d.slice(0, 4) : h.d) : '');
    const disc = p.stageHist.find(h => h.k === 'DISCOVERED' && (h.round || 1) === cur) || p.stageHist.find(h => h.k === 'DISCOVERED');
    const decided = [...p.stageHist].reverse().find(h => ['HELD', 'REJECTED'].includes(h.k) && (h.round || 1) === cur);
    const sel = H('DISCOVERED', '선정'), pre = H('PRELIM', '의결') || H('PRELIM'), conf = H('CONFIRMED'), con = H('CONTRACTED'), clo = H('CLOSED');
    const tp = A.trackPlan(p), ev = p.perf && p.perf.eval;
    const s = K.LIFE.map(x => ({ ...x, y: '', fact: false, note: '' }));
    s[0].y = disc ? `${D(disc)}${disc.calc ? '' : ' 접수'}${sel ? ` → ${D(sel)} 선정` : ''}` : '-'; s[0].fact = !!disc && !disc.calc;
    if (p.round > 1) s[0].note = `${p.round}차 제안 · 이전 차수: ${p.rounds.map(r => `${r.round}차 ${r.result}(${r.at})`).join(', ')}`;
    s[1].y = pre ? `${D(pre)}${pre.calc ? '' : ` ${pre.sub}`}` : ''; s[1].fact = !!pre && !pre.calc;
    s[2].y = D(conf); s[2].fact = !!conf && !conf.calc;
    s[3].y = con ? `${con.d}${p.contractAmt ? ` · 계약액 ${A.eok(p.contractAmt)}원` : ''}` : ''; s[3].fact = !!con;
    s[4].y = p.startDate ? `${p.startDate} ~ ${p.endDate}` : ''; s[4].fact = !!p.startDate;
    s[5].y = clo ? clo.d : p.endDate ? `${p.endDate.slice(0, 4)} (예정)` : ''; s[5].fact = !!clo;
    s[6].y = clo ? `${p.endYear + 1} ~` : '';
    s[7].n = `추적조사 (${K.TRACK(p.type)}년, 매년 2월)`;
    s[7].y = tp.length ? tp.map(r => `${r.round}차 ${fy(r.due)}${r.status === '제출' ? ' ✓' : r.status === '예정' ? '' : ' ' + r.status}`).join(' · ') : p.endYear < 2023 && clo ? '2022년 이전 종료 - 적용 여부 확인' : '';
    s[7].fact = tp.some(r => r.status === '제출');
    s[8].y = ev ? `${ev.date} 자체평가` : clo ? '평가계획에 따라' : ''; s[8].fact = !!ev;
    s[9].y = p.nextIds && p.nextIds.length ? `후속·연계 ${p.nextIds.join(', ')} 발굴` : tp.length ? `${p.endYear + K.TRACK(p.type) + 1} 전후` : '';
    s[9].fact = !!(p.nextIds && p.nextIds.length);
    if (decided && ['HELD', 'REJECTED'].includes(p.stage)) { const i = p.sub === '예비 심의' ? 1 : 0; s[i].y += ` → ${D(decided)} ${K.stageName(p.stage)}`; s[i].alt = p.stage; }
    const idx = { DISCOVERED: 0, PRELIM: 1, CONFIRMED: 2, CONTRACTED: 3, ONGOING: 4, FOLLOWUP: 7 }[p.stage] ?? (['HELD', 'REJECTED'].includes(p.stage) ? (p.sub === '예비 심의' ? 1 : 0) : p.endYear >= 2023 ? 9 : 6);
    s.forEach((x, i) => (x.state = i < idx ? 'done' : i === idx ? 'now' : ''));
    return s;
  };
  A.nextPropId = year => {
    const used = new Set([...A.db.projects.map(p => p.id), ...A.db.approvals.filter(a => a.type === 'NEW' && a.payload && a.payload.project).map(a => a.payload.project.id)]);
    for (let n = 1; n < 100; n++) { const id = `P${year}-${String(n).padStart(3, '0')}`; if (!used.has(id)) return id; }
    return `P${year}-${Date.now() % 1000}`;
  };
  /* 외부 결정 기록 — 결재 없이 결정기관·근거 문서와 함께 바로 반영 */
  A.recordDecision = (p, o, f) => {
    const me = A.me();
    const before = A.stageLabel(p);
    let sub = o.sub;
    if (sub === '@') sub = p.stage === 'DISCOVERED' ? ({ '위원회 상정': '위원회', 고도화: '고도화' }[p.sub] || '서류심사') : p.sub;
    p.stage = o.to; p.sub = sub || '';
    p.stageHist.push({ k: o.to, sub: p.sub, d: f.date, by: me.id, reason: `${o.label}${f.reason ? ' — ' + f.reason : ''}`, ext: { body: f.body || o.body, no: f.no || '', doc: f.doc || '' }, round: p.round || undefined });
    if (f.doc) p.docs.push({ id: 'D' + String(A.db.seq.doc++).padStart(4, '0'), type: ['PRELIM', 'CONFIRMED'].includes(o.to) || p.sub === '예비 심의' ? '위원회 의결서' : '자문위원회 결과', stage: o.to, name: f.doc, size: f.size || 240000, by: me.id, at: U.nowStamp(), mod: null, pub: false });
    A.db.history.unshift({ id: 'H' + String(A.db.seq.h++).padStart(4, '0'), pid: p.id, cat: '외부 결정', label: f.body || o.body, b: before, a: A.stageLabel(p) + (f.no ? ` (${f.no})` : ''), by: me.id, at: U.nowStamp(), ap: null });
    A.log('기능', `외부 결정 기록 — ${o.label}`, p.id);
    if (p.owner !== me.id) A.notify(p.owner, '단계', `[외부 결정] ${p.name} — ${A.stageLabel(p)}`, `#/projects/${p.id}?tab=schedule`);
    p.updatedAt = U.nowStamp(); p.updatedBy = me.id;
    A.save();
  };

  /* ── 권한 ─────────────────────────────────── */
  A.can = (menu, act = 'r') => { const p = A.db.perms[A.me().role]; return !!(p && p[menu] && p[menu][act]); };
  A.isMine = p => { const me = A.me(); return p.owner === me.id || p.subOwner === me.id; };
  A.canSee = p => { const me = A.me(); return me.role !== 'STAFF' || A.isMine(p) || p.acl.viewers.includes(me.id) || p.acl.editors.includes(me.id); };
  A.canEdit = p => { const me = A.me(); if (!A.can('projects', 'u')) return false; return me.role === 'ADMIN' || me.role === 'MANAGER' || A.isMine(p) || p.acl.editors.includes(me.id); };
  A.visibleProjects = () => A.projects().filter(A.canSee);

  /* ── 이력·알림 ─────────────────────────────── */
  A.hist = (pid, cat, label, b, a, ap = null) => {
    A.db.history.unshift({ id: 'H' + String(A.db.seq.h++).padStart(4, '0'), pid, cat, label, b, a, by: A.me().id, at: U.nowStamp(), ap });
    A.log('기능', `${cat} 변경 — ${label}`, pid);
  };
  A.notify = (to, kind, text, link) => {
    if (!to) return;
    A.db.notifications.unshift({ id: 'N' + String(A.db.seq.n++).padStart(4, '0'), to, kind, text, link, at: U.nowStamp(), read: false });
    A.db.mails.unshift({ at: U.nowStamp(), to, ch: '이메일', subj: text, ok: true });
  };
  A.log = (kind, act, pid) => { const me = A.me(); A.db.logs.unshift({ at: U.nowStamp(), uid: me.id, ip: '10.21.12.' + (40 + parseInt(me.id.slice(1))), br: navigator.userAgent.includes('Edg') ? 'Edge / Windows' : 'Chrome / Windows', kind, act, menu: A.cur ? A.cur.title : '', pid }); };

  /* ── 결재 엔진 ─────────────────────────────── */
  const headId = () => (A.db.users.find(u => u.head) || {}).id;
  const leadOf = team => (A.db.users.find(u => u.role === 'MANAGER' && u.team === team && !u.head) || {}).id;
  A.resolveLine = (pid, drafter) => {
    const p = pid && A.db.projects.find(x => x.id === pid);
    const team = p ? p.team : (A.user(drafter) || {}).team;
    const steps = (p && A.db.approvalLines.byProject[pid]) || A.db.approvalLines.def;
    return steps
      .map(s => ({ uid: s.kind === 'TEAM_LEAD' ? leadOf(team) || headId() : s.kind === 'HEAD' ? headId() : s.uid, label: s.label }))
      .filter((s, i, arr) => s.uid && s.uid !== drafter && arr.findIndex(x => x.uid === s.uid) === i);
  };
  A.pendingOf = pid => A.db.approvals.find(a => a.pid === pid && ['PENDING', 'SUPPLEMENT'].includes(a.status));
  A.myQueue = () => A.db.approvals.filter(a => a.status === 'PENDING' && (a.line.find(s => s.status === 'PENDING') || {}).uid === A.me().id);
  A.submit = ({ type, pid, title, changes = [], payload = null, note = '', attach = [] }) => {
    const me = A.me();
    const line = A.resolveLine(pid, me.id).map(s => ({ ...s, status: 'WAIT', at: null, comment: '' }));
    const ap = { id: `AP-${new Date().getFullYear()}-${String(A.db.seq.ap++).padStart(4, '0')}`, type, pid, title, drafter: me.id, createdAt: U.nowStamp(), status: 'PENDING', step: 0, line, changes, payload, note, attach };
    if (!line.length) { ap.status = 'APPROVED'; A.db.approvals.unshift(ap); apply(ap); A.save(); return ap; }
    line[0].status = 'PENDING';
    A.db.approvals.unshift(ap);
    A.notify(line[0].uid, '결재', `[결재 요청] ${me.name} — ${title}`, `#/approvals?open=${ap.id}`);
    if (pid) A.hist(pid, '결재', '결재 상신', '', `${ap.id} ${AP_T[type]} (${title})`, ap.id);
    A.save();
    return ap;
  };
  A.act = (ap, action, comment = '') => {
    const me = A.me();
    const cur = ap.line[ap.step];
    if (action === 'withdraw') {
      ap.status = 'WITHDRAWN'; ap.line.forEach(s => s.status === 'PENDING' && (s.status = 'WAIT'));
      if (ap.pid) A.hist(ap.pid, '결재', '결재 회수', AP_N.PENDING, AP_N.WITHDRAWN, ap.id);
    } else if (action === 'approve') {
      cur.status = 'APPROVED'; cur.at = U.nowStamp(); cur.comment = comment;
      if (ap.step + 1 < ap.line.length) {
        ap.step++; ap.line[ap.step].status = 'PENDING';
        A.notify(ap.line[ap.step].uid, '결재', `[결재 요청] ${A.uname(ap.drafter)} — ${ap.title}`, `#/approvals?open=${ap.id}`);
        A.notify(ap.drafter, '결재', `[결재 진행] ${me.name} 승인 — ${ap.title}`, `#/approvals?open=${ap.id}`);
      } else {
        ap.status = 'APPROVED';
        apply(ap);
        A.notify(ap.drafter, '승인', `[결재 완료] ${ap.title} — 최종 승인되어 반영되었습니다`, ap.pid ? `#/projects/${ap.pid}` : `#/approvals?open=${ap.id}`);
      }
    } else if (action === 'reject' || action === 'supplement') {
      const st = action === 'reject' ? 'RETURNED' : 'SUPPLEMENT';
      cur.status = st; cur.at = U.nowStamp(); cur.comment = comment; ap.status = st;
      A.notify(ap.drafter, st === 'RETURNED' ? '반려' : '보완', `[${AP_N[st]}] ${ap.title} — ${comment}`, `#/approvals?open=${ap.id}`);
      if (ap.pid) A.hist(ap.pid, '결재', AP_N[st], AP_N.PENDING, `${AP_N[st]}: ${comment}`, ap.id);
    }
    A.log('기능', `결재 ${action} — ${ap.id}`, ap.pid);
    A.save();
  };
  A.resubmit = (ap, patch = {}) => {
    Object.assign(ap, patch);
    ap.status = 'PENDING'; ap.step = 0; ap.createdAt = U.nowStamp();
    ap.line = A.resolveLine(ap.pid, ap.drafter).map((s, i) => ({ ...s, status: i === 0 ? 'PENDING' : 'WAIT', at: null, comment: '' }));
    A.notify(ap.line[0].uid, '결재', `[재상신] ${A.uname(ap.drafter)} — ${ap.title}`, `#/approvals?open=${ap.id}`);
    if (ap.pid) A.hist(ap.pid, '결재', '재상신', '', ap.id, ap.id);
    A.save();
  };
  const setPath = (o, path, v) => { const ks = path.split('.'); let t = o; ks.slice(0, -1).forEach(k => (t = t[k] = t[k] || {})); t[ks[ks.length - 1]] = v; };
  function apply(ap) {
    const by = ap.drafter;
    const H = (pid, cat, label, b, a) => A.db.history.unshift({ id: 'H' + String(A.db.seq.h++).padStart(4, '0'), pid, cat, label, b, a, by, at: U.nowStamp(), ap: ap.id });
    if (ap.type === 'NEW') {
      const x = ap.payload.project;
      const yr = +x.startYear;
      const id = x.id && !A.db.projects.some(p => p.id === x.id) ? x.id : A.nextPropId(new Date().getFullYear());
      const C = K.CONST;
      const p = {
        id, name: x.name, region: x.region, continent: C.CONTINENT[x.region] || '기타', country: x.country, countryEn: C.COUNTRY_EN[x.country] || null,
        income: C.incomeOf(x.country), type: x.type, field: x.field, workType: x.workType, crs: x.crs || '', aid: '무상', channel: '양자',
        orderer: x.orderer || '국토교통부', proposer: x.proposer || '', implementer: null, startYear: yr, endYear: +x.endYear, startDate: null, endDate: null,
        planAmt: x.planAmt ? +x.planAmt : null, orderAmt: null, contractAmt: null, owner: x.owner, subOwner: x.subOwner || null, team: C.TEAM_OF_FIELD[x.field] || '사업2팀',
        stage: 'DISCOVERED', sub: '접수', stageHist: [{ k: 'DISCOVERED', sub: '접수', d: U.today(), by, round: 1, reason: x.prevId ? `종료사업(${x.prevId}) 후속·연계사업 발굴 등록` : '신규 발굴 등록 (1차 접수)', ext: null }],
        round: 1, rounds: [], prop: { year: new Date().getFullYear(), org: x.propOrg || '공공', orgName: x.proposer || '', mode: x.mode || '', evidence: x.evidence || '' }, nextIds: [],
        isPublic: false, prevId: x.prevId || null, desc: x.desc || '', qc: [], migrated: false, deleted: false,
        bid: null, contract: null, execs: [], surplus: [], docs: [], schedule: [], perf: null, acl: { viewers: [], editors: [] }, aclHist: [],
        createdAt: U.nowStamp(), updatedAt: null, updatedBy: null,
      };
      if (p.prevId) { const pv = A.P(p.prevId); if (pv) (pv.nextIds = pv.nextIds || []).push(id); }
      if (x.pdm) p.perf = x.pdm;
      A.db.projects.push(p);
      ap.pid = id;
      H(id, '기본정보', '사업 등록', '', '신규 등록(결재 승인)');
      return;
    }
    const p = A.db.projects.find(x => x.id === ap.pid);
    if (!p) return;
    if (ap.type === 'DELETE') { p.deleted = true; H(p.id, '기본정보', '사업 삭제', p.name, '삭제(결재 승인)'); return; }
    if (ap.type === 'PDM') { p.perf = { ...(p.perf || {}), ...ap.payload.pdm, regAt: U.today() }; H(p.id, '성과', 'PDM 기초선', ap.changes.length + '개 지표', '등록(결재 승인)'); return; }
    if (ap.type === 'EVAL') { p.perf.eval = ap.payload.eval; H(p.id, '성과', '자체평가', '-', '등록(결재 승인)'); return; }
    if (ap.type === 'REPROPOSE') {
      const f = ap.payload.fields, last = [...p.stageHist].reverse().find(h => ['HELD', 'REJECTED'].includes(h.k));
      p.rounds.push({ round: p.round || 1, year: p.prop ? p.prop.year : null, result: K.stageName(p.stage), at: p.sub, reason: last ? last.reason.replace(/^(미선정|보류) — /, '') : '', snap: { name: p.name, planAmt: p.planAmt, type: p.type, mode: p.prop && p.prop.mode, evidence: p.prop && p.prop.evidence, desc: p.desc, startYear: p.startYear, endYear: p.endYear } });
      p.round = (p.round || 1) + 1;
      Object.assign(p, { name: f.name, planAmt: f.planAmt, type: f.type, desc: f.desc, startYear: +f.startYear, endYear: +f.endYear });
      p.prop = { ...(p.prop || {}), year: ap.payload.year, mode: f.mode, evidence: f.evidence };
      p.stage = 'DISCOVERED'; p.sub = '접수';
      p.stageHist.push({ k: 'DISCOVERED', sub: '접수', d: U.today(), by, round: p.round, reason: `재제안 접수 (${p.round}차) — ${ap.payload.year}년 공모`, ext: { body: '제안기관 (공모 제안서 제출)', no: `${ap.payload.year}년 신규사업 공모`, doc: ap.attach[0] || '' } });
      if (p.perf) p.perf.versions = [{ v: '제안 PDM', src: `공모 제안서 (${p.round}차)`, at: U.today() }];
      ap.changes.forEach(c => H(p.id, '기본정보', c.label, c.b, c.a));
      H(p.id, '추진단계', '재제안', `${p.round - 1}차 ${p.rounds[p.rounds.length - 1].result}`, `${p.round}차 접수`);
      p.updatedAt = U.nowStamp(); p.updatedBy = by;
      return;
    }
    if (ap.payload && ap.payload.bid) p.bid = { ...(p.bid || {}), ...ap.payload.bid };
    if (ap.payload && ap.payload.contract) { p.contract = { changes: [], ...(p.contract || {}), ...ap.payload.contract }; }
    ap.changes.forEach(c => {
      if (c.path === 'stage') {
        const sc = ap.changes.find(x => x.path === 'sub');
        p.stage = c.av; p.sub = sc ? sc.av : ''; p.stageHist.push({ k: c.av, sub: p.sub, d: U.today(), by, reason: ap.note || ap.title, round: p.round || undefined });
        if (c.av === 'CONTRACTED' || c.av === 'ONGOING') p.isPublic = true;
      } else if (c.path === 'contractAmt') {
        if (c.bv != null && p.contract) p.contract.changes.push({ date: U.today(), field: '계약금액', before: c.bv, after: c.av, reason: ap.note || '예산변경' });
        p.contractAmt = c.av; if (p.contract) p.contract.amt = c.av;
      } else if (c.path !== 'perf') setPath(p, c.path, c.av);
      H(p.id, ap.type === 'CONTRACT' || ap.type === 'BUDGET' ? '계약' : ap.type === 'STAGE' ? '추진단계' : '기본정보', c.label, c.b, c.a);
    });
    if (ap.payload && ap.payload.contractHist && p.contract) p.contract.changes.push({ date: U.today(), ...ap.payload.contractHist });
    if (p.contract && ap.type === 'CONTRACT') { p.implementer = p.contract.vendor; p.startDate = p.startDate || p.contract.start; p.endDate = p.contract.end; }
    p.updatedAt = U.nowStamp(); p.updatedBy = by;
  }

  /* ── UI: 토스트·모달 ─────────────────────── */
  A.toast = (msg, kind = '') => {
    const t = document.createElement('div'); t.className = 'toast ' + kind; t.textContent = msg;
    $('#toasts').appendChild(t); setTimeout(() => t.remove(), 3200);
  };
  A.modal = ({ title, body, foot = '', cls = '', onMount }) => {
    const bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal ${cls}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="mh"><h3>${title}</h3><button class="x-btn" data-close aria-label="닫기">×</button></div><div class="mb">${body}</div>${foot ? `<div class="mf">${foot}</div>` : ''}</div>`;
    document.body.appendChild(bg);
    const close = () => { bg.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = e => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    bg.addEventListener('mousedown', e => e.target === bg && close());
    $$('[data-close]', bg).forEach(b => (b.onclick = close));
    const m = { el: bg, close, $: s => $(s, bg), $$: s => $$(s, bg) };
    onMount && onMount(m);
    const f = $('input:not([readonly]),select,textarea', $('.mb', bg)); f && setTimeout(() => f.focus(), 30);
    return m;
  };
  A.confirm = (msg, { title = '확인', ok = '확인', danger = false } = {}) => new Promise(res => {
    const m = A.modal({ title, body: `<div style="font-size:13px;line-height:1.7">${msg}</div>`, foot: `<button class="btn" data-close>취소</button><button class="btn ${danger ? 'danger' : 'pri'}" data-ok>${ok}</button>` });
    m.$('[data-ok]').onclick = () => { m.close(); res(true); };
    m.$$('[data-close]').forEach(b => b.addEventListener('click', () => res(false)));
  });
  A.ask = (title, label, { ok = '확인', required = true, value = '', hint = '' } = {}) => new Promise(res => {
    const m = A.modal({ title, body: `<div class="f ${required ? 'req' : ''}"><label>${label}</label><textarea id="ask-v">${esc(value)}</textarea>${hint ? `<span class="hint">${hint}</span>` : ''}</div>`, foot: `<button class="btn" data-close>취소</button><button class="btn pri" data-ok>${ok}</button>` });
    m.$('[data-ok]').onclick = () => { const v = m.$('#ask-v').value.trim(); if (required && !v) { m.$('.f').classList.add('err'); A.toast('필수 입력 항목입니다.', 'bad'); return; } m.close(); res(v); };
    m.$$('[data-close]').forEach(b => b.addEventListener('click', () => res(null)));
  });

  /* ── 엑셀(CSV) 다운로드 ────────────────── */
  A.downloadCSV = (base, headers, rows, footer) => {
    A.toast('엑셀 파일을 생성하고 있습니다…');
    const name = `${base}_${U.today().replace(/-/g, '')}.csv`;
    const q = c => { const s = String(c ?? ''); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const lines = [headers, ...rows, ...(footer ? [footer] : [])].map(r => r.map(q).join(','));
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    A.log('기능', `엑셀 다운로드 — ${name}`);
    setTimeout(() => A.toast(`${name} 다운로드 완료 (${rows.length}행)`, 'ok'), 300);
  };
  A.downloadText = (name, text, type = 'text/plain') => {
    const blob = new Blob([text], { type }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  };

  /* ── 차트 ─────────────────────────────── */
  A._charts = [];
  A.cv = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  A.sc = i => A.cv('--s' + ((i % 8) + 1));
  A.chart = (el, opt) => {
    if (!el || !window.echarts) return null;
    const c = echarts.init(el, null, { renderer: 'svg' });
    const base = {
      textStyle: { fontFamily: A.cv('--font'), color: A.cv('--muted'), fontSize: 11 },
      tooltip: { backgroundColor: A.cv('--panel'), borderColor: A.cv('--line'), textStyle: { color: A.cv('--ink'), fontSize: 12 }, confine: true },
      animationDuration: 300,
    };
    c.setOption({ ...base, ...opt, tooltip: { ...base.tooltip, ...(opt.tooltip || {}) } });
    A._charts.push(c);
    return c;
  };
  A.axis = (extra = {}) => ({ axisLine: { lineStyle: { color: A.cv('--axis') } }, axisTick: { show: false }, axisLabel: { color: A.cv('--muted'), fontSize: 11 }, splitLine: { lineStyle: { color: A.cv('--grid'), type: [2, 3] } }, ...extra });
  A.bar = (extra = {}) => ({ type: 'bar', barMaxWidth: 26, itemStyle: { borderRadius: [4, 4, 0, 0], borderColor: A.cv('--chartSurface'), borderWidth: 1 }, emphasis: { focus: 'series' }, ...extra });
  window.addEventListener('resize', () => A._charts.forEach(c => c.resize()));

  /* ── 공통 위젯 ─────────────────────────── */
  A.opts = (arr, sel, all = '전체') => (all != null ? `<option value="">${all}</option>` : '') + arr.map(v => { const [val, label] = Array.isArray(v) ? v : [v, v]; return `<option value="${esc(val)}" ${String(val) === String(sel ?? '') ? 'selected' : ''}>${esc(label)}</option>`; }).join('');
  A.uniq = (arr, key) => [...new Set(arr.map(x => (typeof key === 'function' ? key(x) : x[key])).filter(v => v != null && v !== ''))].sort((a, b) => String(a).localeCompare(String(b), 'ko', { numeric: true }));
  A.code = grp => ((A.db.codes.find(g => g.grp === grp) || {}).codes || []).filter(c => c.use).sort((a, b) => a.ord - b.ord).map(c => c.nm);
  A.req = s => `<span class="req-tag" title="관련 요구사항">${s}</span>`;
  A.ph = (title, sub, acts = '', req = '') => `<div class="ph"><div><h1>${title}${req ? A.req(req) : ''}</h1>${sub ? `<div class="sub">${sub}</div>` : ''}</div><div class="acts">${acts}</div></div>`;
  A.pager = (total, page, per, onGo, host) => {
    const pages = Math.max(1, Math.ceil(total / per));
    const p0 = Math.max(1, Math.min(page - 3, pages - 6));
    const btns = []; for (let i = p0; i <= Math.min(pages, p0 + 6); i++) btns.push(`<button data-p="${i}" class="${i === page ? 'on' : ''}">${i}</button>`);
    host.innerHTML = `<span>${num(total)}건 중 ${num(total ? (page - 1) * per + 1 : 0)}–${num(Math.min(total, page * per))}</span><div class="pg"><button data-p="${page - 1}" ${page <= 1 ? 'disabled' : ''} aria-label="이전">‹</button>${btns.join('')}<button data-p="${page + 1}" ${page >= pages ? 'disabled' : ''} aria-label="다음">›</button></div>`;
    $$('button[data-p]', host).forEach(b => (b.onclick = () => onGo(+b.dataset.p)));
  };
  /* 정렬 가능한 테이블 헤더 */
  A.sortHead = (cols, sort, host, onSort) => {
    host.innerHTML = '<tr>' + cols.map(c => `<th class="${c.cls || ''} ${c.k ? 'sortable' : ''}" data-k="${c.k || ''}">${c.n}${sort.k === c.k ? `<span class="arr">${sort.d > 0 ? '▲' : '▼'}</span>` : ''}</th>`).join('') + '</tr>';
    $$('th.sortable', host).forEach(th => (th.onclick = () => { const k = th.dataset.k; onSort(sort.k === k ? { k, d: -sort.d } : { k, d: 1 }); }));
  };
  A.sorter = (sort, get) => (a, b) => { const x = get(a, sort.k), y = get(b, sort.k); if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1; return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'ko', { numeric: true })) * sort.d; };
  A.ICON = {
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    dl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 20V9M7 14l5-5 5 5M5 4h14"/></svg>',
    print: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M7 9V3h10v6M7 18H4v-7h16v7h-3M7 14h10v7H7z"/></svg>',
  };
  A.xlsBtn = (id = 'btn-xls', label = '엑셀 다운로드') => `<button class="btn" id="${id}">${A.ICON.dl}${label}</button>`;

  /* ── 라우터 ─────────────────────────────── */
  const routes = [];
  A.page = (pattern, meta, fn) => routes.push({ re: new RegExp('^' + pattern.replace(/:(\w+)/g, '([^/]+)') + '$'), keys: [...pattern.matchAll(/:(\w+)/g)].map(m => m[1]), meta, fn });
  A.go = path => { location.hash = '#' + path; };
  A.state = {};
  A.render = () => {
    A._charts.forEach(c => c.dispose()); A._charts = [];
    const [path, qs] = (location.hash.slice(1) || '/dashboard').split('?');
    const q = Object.fromEntries(new URLSearchParams(qs || ''));
    const view = $('#view');
    for (const r of routes) {
      const m = path.match(r.re);
      if (!m) continue;
      const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
      A.cur = { path, q, params, menu: r.meta.menu, title: r.meta.title };
      A.shell();
      if (!A.can(r.meta.menu, r.meta.act || 'r')) { view.innerHTML = A.ph('접근 권한이 없습니다', `현재 사용자(${A.ulabel(A.me().id)} · ${K.ROLES[A.me().role]})는 이 메뉴에 대한 ${K.ACTS[r.meta.act || 'r']} 권한이 없습니다.`) + `<div class="notice info">상단의 <b>&nbsp;사용자 전환&nbsp;</b>에서 다른 역할로 바꾸면 메뉴·버튼 노출이 역할별 권한 매트릭스에 따라 달라집니다.</div>`; return; }
      view.innerHTML = '';
      A.log('메뉴', '화면 조회');
      r.fn(view, params, q);
      window.scrollTo(0, 0);
      return;
    }
    A.go('/dashboard');
  };
  window.addEventListener('hashchange', A.render);

  /* ── 셸(사이드바·상단바) ─────────────────── */
  A.shell = () => {
    const me = A.me();
    const q = A.myQueue().length;
    let html = '';
    let pendingSec = null;
    K.MENUS.forEach(m => {
      if (m.sec) { pendingSec = m.sec; return; }
      const cfg = (A.db.menuCfg || {})[m.k] || {};
      if (!A.can(m.k) || cfg.hidden) return;
      if (pendingSec) { html += `<div class="sec">${pendingSec}</div>`; pendingSec = null; }
      const on = A.cur && A.cur.menu === m.k;
      html += `<a href="#${m.path}" class="${on ? 'on' : ''}" ${on ? 'aria-current="page"' : ''}><span>${esc(cfg.n || m.n)}</span>${m.badge === 'approvals' && q ? `<span class="cnt" title="내 결재 대기">${q}</span>` : ''}</a>`;
    });
    $('#nav').innerHTML = html;
    const unread = A.db.notifications.filter(n => n.to === me.id && !n.read).length;
    $('#bell-dot').textContent = unread; $('#bell-dot').hidden = !unread;
    $('#who').innerHTML = A.db.users.map(u => `<option value="${u.id}" ${u.id === me.id ? 'selected' : ''}>${u.name} ${u.title} · ${u.team} (${K.ROLES[u.role]})</option>`).join('');
    const mm = K.MENUS.find(m => m.k === (A.cur && A.cur.menu));
    $('#crumb').innerHTML = `사업DB 관리시스템 › <b>${esc(A.cur ? A.cur.title : '')}</b>`;
    document.title = `${A.cur ? A.cur.title + ' · ' : ''}KIDC 사업DB 관리시스템`;
    $('.app').classList.remove('nav-open');
    void mm;
  };
  A.openBell = () => {
    const me = A.me();
    const host = $('#bell-pop');
    if (!host.hidden) { host.hidden = true; return; }
    const list = A.db.notifications.filter(n => n.to === me.id).slice(0, 30);
    host.innerHTML = `<div class="ph2"><span>알림 <span class="muted small">이메일 동시 발송</span></span><button class="btn sm ghost" id="bell-all">모두 읽음</button></div>` +
      (list.length ? list.map(n => `<button class="it ${n.read ? '' : 'unread'}" data-id="${n.id}"><i class="ic"></i><span><span class="ink">${esc(n.text)}</span><br><span class="tm">${n.at} · ${n.kind}</span></span></button>`).join('') : '<div class="empty">새 알림이 없습니다.</div>');
    host.hidden = false;
    $('#bell-all', host).onclick = () => { list.forEach(n => (n.read = true)); A.save(); host.hidden = true; A.shell(); };
    $$('.it', host).forEach(b => (b.onclick = () => { const n = A.db.notifications.find(x => x.id === b.dataset.id); n.read = true; A.save(); host.hidden = true; location.hash = n.link.replace(/^#/, '#'); A.shell(); }));
  };

  A.init = () => {
    A.load();
    if (A.db.theme) document.documentElement.dataset.theme = A.db.theme;
    $('#who').onchange = e => {
      A.db.session.userId = e.target.value; A.save();
      A.state = {};
      const me = A.me();
      A.db.logs.unshift({ at: U.nowStamp(), uid: me.id, ip: '10.21.12.' + (40 + parseInt(me.id.slice(1))), br: 'Chrome / Windows', kind: '접속', act: '로그인', menu: '' });
      me.lastLogin = U.nowStamp();
      A.toast(`${me.name} ${me.title}(${K.ROLES[me.role]})(으)로 전환했습니다.`);
      A.render();
    };
    $('#bell').onclick = e => { e.stopPropagation(); A.openBell(); };
    document.addEventListener('click', e => { const p = $('#bell-pop'); if (!p.hidden && !p.contains(e.target)) p.hidden = true; });
    $('#theme').onclick = () => {
      const dark = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.dataset.theme = dark ? 'light' : 'dark'; A.db.theme = document.documentElement.dataset.theme; A.save(); A.render();
    };
    $('#menu-btn').onclick = () => $('.app').classList.toggle('nav-open');
    $('#reset').onclick = async () => { if (await A.confirm('등록·수정·결재한 내용을 모두 지우고 데모 데이터를 처음 상태로 되돌립니다.', { title: '데모 데이터 초기화', ok: '초기화', danger: true })) A.reset(); };
    A.render();
  };
  return A;
})();
