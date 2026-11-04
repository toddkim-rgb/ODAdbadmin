/* 사업 목록 · 사업 등록/수정 · 단계별 추진현황 보드 */
(function (A) {
  const { esc, num, eok, U, K } = A;

  /* ── 사업 목록 (SFR-016, SFR-034) ──────────────── */
  const F0 = { q: '', year: '', region: '', country: '', field: '', workType: '', type: '', stage: '', owner: '', team: '', qc: false, page: 1, per: 20, sort: { k: 'id', d: -1 } };
  A.page('/projects', { menu: 'projects', title: '사업 목록' }, (view, _, q) => {
    const f = (A.state.pl = A.state.pl || { ...F0 });
    if (Object.keys(q).length) { Object.assign(f, { ...F0, sort: f.sort }, q, { qc: q.qc === '1', page: 1 }); history.replaceState(null, '', '#/projects'); }
    const me = A.me();
    const base = A.visibleProjects();
    const all = A.projects();
    const pending = new Set(A.db.approvals.filter(a => ['PENDING', 'SUPPLEMENT'].includes(a.status)).map(a => a.pid));

    view.innerHTML = `
      ${A.ph('사업 목록', me.role === 'STAFF' ? `담당자 권한: 본인 담당·조회권한이 부여된 사업 ${base.length}건만 조회됩니다 (전체 ${all.length}건)` : `전체 ${all.length}건 조회 가능`, `${A.xlsBtn()}${A.can('projects', 'c') ? `<a class="btn pri" href="#/projects/new">${A.ICON.plus}사업 등록</a>` : ''}`, 'SFR-016·034')}
      <div class="bar" id="flt">
        <div class="fl"><span>검색어</span><input type="search" id="f-q" placeholder="사업명·사업번호·수행기관" value="${esc(f.q)}"></div>
        <div class="fl"><span>시작연도</span><select id="f-year">${A.opts(A.uniq(all, 'startYear').reverse(), f.year)}</select></div>
        <div class="fl"><span>지역</span><select id="f-region">${A.opts(A.uniq(all, 'region'), f.region)}</select></div>
        <div class="fl"><span>국가</span><select id="f-country">${A.opts(A.uniq(all.filter(p => !f.region || p.region === f.region), 'country'), f.country)}</select></div>
        <div class="fl"><span>분야</span><select id="f-field">${A.opts(A.code('field'), f.field)}</select></div>
        <div class="fl"><span>공종</span><select id="f-workType">${A.opts(A.code('workType'), f.workType)}</select></div>
        <div class="fl"><span>사업유형</span><select id="f-type">${A.opts(A.code('type'), f.type)}</select></div>
        <div class="fl"><span>추진단계</span><select id="f-stage">${A.opts([...K.STAGES.map(s => [s.k, s.n]), ...(String(f.stage).includes(',') ? [[f.stage, '(복수 단계)']] : [])], f.stage)}</select></div>
        <div class="fl"><span>담당자</span><select id="f-owner">${A.opts(A.db.users.filter(u => u.role === 'STAFF').map(u => [u.id, `${u.name} (${u.team})`]), f.owner)}</select></div>
        <label class="ck"><input type="checkbox" id="f-qc" ${f.qc ? 'checked' : ''}>이관자료 정비 필요</label>
        <span class="sp"></span>
        <button class="btn ghost" id="f-reset">조건 초기화</button>
      </div>
      <div class="summary" id="sum"></div>
      <div class="card"><div class="tw"><table class="tbl"><thead id="th"></thead><tbody id="tb"></tbody></table></div><div class="pager" id="pg"></div></div>`;

    const cols = [
      { k: 'id', n: '사업번호' }, { k: 'name', n: '사업명' }, { k: 'country', n: '국가(지역)' }, { k: 'field', n: '분야 · 공종' }, { k: 'type', n: '유형' },
      { k: 'startYear', n: '사업기간' }, { k: 'stage', n: '추진단계' }, { k: 'contractAmt', n: '계약금액', cls: 'num' }, { k: 'owner', n: '담당자' }, { k: 'updated', n: '최종수정' },
    ];
    const get = (p, k) => k === 'stage' ? K.STAGES.findIndex(s => s.k === p.stage) : k === 'owner' ? A.uname(p.owner) : k === 'updated' ? (p.updatedAt || p.createdAt) : k === 'contractAmt' ? (p.contractAmt ?? p.planAmt) : p[k];
    const filtered = () => base.filter(p =>
      (!f.q || (p.name + p.id + (p.implementer || '') + p.country).toLowerCase().includes(f.q.toLowerCase())) &&
      (!f.year || p.startYear === +f.year) && (!f.region || p.region === f.region) && (!f.country || p.country === f.country) &&
      (!f.field || p.field === f.field) && (!f.workType || p.workType === f.workType) && (!f.type || p.type === f.type) &&
      (!f.stage || String(f.stage).split(',').includes(p.stage)) && (!f.owner || p.owner === f.owner || p.subOwner === f.owner) && (!f.qc || p.qc.length));
    const draw = () => {
      const rows = filtered().sort(A.sorter(f.sort, get));
      const pages = Math.max(1, Math.ceil(rows.length / f.per)); if (f.page > pages) f.page = pages;
      A.sortHead(cols, f.sort, A.$('#th', view), s => { f.sort = s; draw(); });
      const sumC = rows.reduce((s, p) => s + (p.contractAmt || 0), 0);
      A.$('#sum', view).innerHTML = `<span>검색 결과 <b>${num(rows.length)}</b>건</span><span>계약금액 합계 <b>${num(sumC)}</b>원 (${eok(sumC)})</span><span>시행계획 예산 합계 <b>${eok(rows.reduce((s, p) => s + (p.planAmt || 0), 0))}</b></span>`;
      A.$('#tb', view).innerHTML = rows.slice((f.page - 1) * f.per, f.page * f.per).map(p => `
        <tr class="click" data-id="${p.id}">
          <td class="mono small nowrap">${A.pid(p)}</td>
          <td class="nm"><span class="t" title="${esc(p.name)}">${esc(p.name)}</span><span class="m">${p.round > 1 ? `<span class="tag">재제안 ${p.round}차</span>` : ''}${p.prop && p.stage === 'DISCOVERED' ? `<span class="b mute">${p.prop.year}년 공모</span>` : ''}${p.prevId ? '<span class="tag blue">후속·연계</span>' : ''}${pending.has(p.id) ? '<span class="b ap-PENDING">결재중</span>' : ''}${p.qc.length ? `<span class="qc" title="${esc(p.qc.join(', '))}">⚠ 정비 ${p.qc.length}</span>` : ''}${p.isPublic ? '' : '<span class="b mute">비공개</span>'}</span></td>
          <td class="nowrap">${esc(p.country)}<div class="muted small">${esc(p.region)}</div></td>
          <td class="nowrap">${esc(p.field)}<div class="muted small">${esc(p.workType)}</div></td>
          <td class="nowrap">${esc(p.type)}</td>
          <td class="mono small nowrap">${p.startYear}–${p.endYear}</td>
          <td class="nowrap">${A.stageBadge(p.stage, p)}</td>
          <td class="num">${p.contractAmt != null ? num(p.contractAmt) : `<span class="muted" title="시행계획 예산">${p.planAmt != null ? '(예산) ' + num(p.planAmt) : '-'}</span>`}</td>
          <td class="nowrap">${A.uname(p.owner)}</td>
          <td class="mono small nowrap">${(p.updatedAt || p.createdAt).slice(0, 10)}</td>
        </tr>`).join('') || `<tr><td colspan="10" class="empty">조건에 맞는 사업이 없습니다.</td></tr>`;
      A.$$('#tb tr[data-id]', view).forEach(tr => (tr.onclick = () => A.go('/projects/' + tr.dataset.id)));
      A.pager(rows.length, f.page, f.per, p => { f.page = p; draw(); }, A.$('#pg', view));
    };
    ['year', 'region', 'country', 'field', 'workType', 'type', 'stage', 'owner'].forEach(k => (A.$('#f-' + k, view).onchange = e => { f[k] = e.target.value; f.page = 1; if (k === 'region') { f.country = ''; A.render(); return; } draw(); }));
    A.$('#f-q', view).oninput = e => { f.q = e.target.value; f.page = 1; draw(); };
    A.$('#f-qc', view).onchange = e => { f.qc = e.target.checked; f.page = 1; draw(); };
    A.$('#f-reset', view).onclick = () => { A.state.pl = { ...F0 }; A.render(); };
    A.$('#btn-xls', view).onclick = () => {
      const rows = filtered().sort(A.sorter(f.sort, get));
      A.downloadCSV('사업목록', ['사업번호', '사업명', '지역', '국가', '분야', '공종', '사업유형', '시행계획분야', '시작연도', '종료연도', '추진단계', '시행계획예산(원)', '발주금액(원)', '계약금액(원)', '수행기관', '주담당자', '공개여부'],
        rows.map(p => [p.id, p.name, p.region, p.country, p.field, p.workType, p.type, p.crs, p.startYear, p.endYear, A.stageName(p.stage), p.planAmt ?? '', p.orderAmt ?? '', p.contractAmt ?? '', p.implementer || '', A.uname(p.owner), p.isPublic ? '공개' : '비공개']),
        ['합계', `${rows.length}건`, '', '', '', '', '', '', '', '', '', rows.reduce((s, p) => s + (p.planAmt || 0), 0), rows.reduce((s, p) => s + (p.orderAmt || 0), 0), rows.reduce((s, p) => s + (p.contractAmt || 0), 0), '', '', '']);
    };
    draw();
  });

  /* ── 사업 등록 / 수정 (SFR-017) ──────────────── */
  const money = v => (v == null || v === '' ? '' : Number(v).toLocaleString('ko-KR'));
  const unmoney = s => { const d = String(s || '').replace(/[^\d]/g, ''); return d ? +d : null; };
  const formDef = (mode) => {
    const countries = A.uniq(A.projects().filter(p => !K.CONST.NONCOUNTRY.includes(p.country)), 'country');
    const staff = A.db.users.filter(u => u.role === 'STAFF').map(u => [u.id, `${u.name} ${u.title} (${u.team})`]);
    const D = [
      { sec: '기본 정보' },
      ...(mode === 'new' ? [{ k: '_id', n: '사업ID · 차수', ro: 1, cls: 'span2', hint: '접수 시 부여 · 선정·보류·미선정·재제안과 관계없이 변경 불가 (★ 잇다의 출발점)' }, { k: '_stage', n: '추진단계', ro: 1, cls: 'span2', hint: '발굴 → 심의 → 확정 → 조달·계약 → 수행 → 종료평가 → 추적조사' }] : []),
      { k: 'name', n: '사업명', req: 1, cls: 'span4', ph: '예) ○○국 ○○ 마스터플랜 수립 사업' },
      { k: 'type', n: '사업유형', req: 1, opts: A.code('type') },
      { k: 'field', n: '분야', req: 1, opts: A.code('field'), hint: '분야에 따라 담당팀 자동 지정' },
      { k: 'workType', n: '공종', req: 1, opts: A.code('workType') },
      { k: 'crs', n: '시행계획 분야', opts: A.code('crs') },
      { k: 'country', n: '국가(수원국)', req: 1, opts: countries },
      { k: 'region', n: '지역', ro: 1, hint: '국가 선택 시 자동 입력' },
      { k: 'income', n: '소득그룹', ro: 1 },
      { k: 'orderer', n: '발주처', req: 1 },
      { sec: '기관 · 기간 · 사업비' },
      { k: 'proposer', n: '제안기관(시행기관)', req: 1, cls: 'span2' },
      ...(mode === 'edit' ? [{ k: 'implementer', n: '수행기관', cls: 'span2', hint: '계약 체결 시 입찰·계약 정보에서 자동 반영' }] : [{ k: 'propOrg', n: '제안기관 구분', req: 1, opts: ['공공', '민간'] }, { k: 'mode', n: '추진방식', ph: '예) 공공기관 제안 · 수원기관 공동 기획' }]),
      { k: 'startYear', n: '시작연도', req: 1, num: 1 },
      { k: 'endYear', n: '종료연도', req: 1, num: 1 },
      ...(mode === 'edit' ? [{ k: 'startDate', n: '착수일', date: 1 }, { k: 'endDate', n: '종료일', date: 1 }] : []),
      { k: 'planAmt', n: mode === 'edit' ? '시행계획 예산(원)' : '제안 사업비(원)', req: 1, money: 1, cls: mode === 'edit' ? '' : 'span2' },
      ...(mode === 'edit' ? [{ k: 'orderAmt', n: '발주금액(원)', money: 1, hint: '입찰정보 등록 시 갱신' }] : []),
      { sec: '담당 · 공개 · 연계' },
      { k: 'owner', n: '주담당자', req: 1, opts: staff },
      { k: 'subOwner', n: '부담당자', opts: staff },
      { k: 'isPublic', n: '홈페이지 공개', opts: [['true', '공개'], ['false', '비공개']], hint: '공개 시 홈페이지 사업DB에 자동 연계' },
      { k: 'aid', n: '원조형태', opts: ['무상', '유상'] },
      ...(mode === 'new' ? [
        { k: 'evidence', n: '근거 서류', cls: 'span2', ph: '예) 수원국 요청공문 · LOI · 사전타당성조사' },
        { k: 'reId', n: '재제안이면 기존 사업ID ♥', cls: 'span2', opts: A.projects().filter(p => p.prop && ['REJECTED', 'HELD'].includes(p.stage)).map(p => [p.id, `${A.pid(p)} ${p.name} (${A.stageLabel(p)})`]), hint: '선택하면 새 번호 없이 같은 사업ID의 다음 차수로 접수합니다' },
        { k: 'prevId', n: '선행 사업 (후속·연계사업인 경우)', cls: 'span4', opts: A.projects().filter(p => ['CLOSED', 'FOLLOWUP', 'ONGOING'].includes(p.stage)).map(p => [p.id, `${p.id} ${p.name}`]) },
      ] : []),
      { k: 'desc', n: '사업개요', cls: 'span4', area: 1 },
    ];
    return D;
  };
  const fieldHtml = (d, v) => {
    if (d.sec) return `<div class="fsec">${d.sec}</div>`;
    if (d.blank) return `<div class="${d.cls || ''}"></div>`;
    const val = v == null ? '' : v;
    let ctl;
    if (d.ro) ctl = `<div class="ro" id="i-${d.k}">${esc(val) || '&nbsp;'}</div>`;
    else if (d.opts) ctl = `<select id="i-${d.k}">${A.opts(d.opts, val, '선택')}</select>`;
    else if (d.area) ctl = `<textarea id="i-${d.k}">${esc(val)}</textarea>`;
    else if (d.money) ctl = `<input id="i-${d.k}" inputmode="numeric" class="num" value="${money(val)}" placeholder="0">`;
    else if (d.date) ctl = `<input id="i-${d.k}" type="date" value="${esc(val)}">`;
    else ctl = `<input id="i-${d.k}" ${d.num ? 'inputmode="numeric"' : ''} value="${esc(val)}" placeholder="${esc(d.ph || '')}">`;
    return `<div class="f ${d.req ? 'req' : ''} ${d.cls || ''}" data-k="${d.k}"><label for="i-${d.k}">${d.n}</label>${ctl}${d.hint ? `<span class="hint">${d.hint}</span>` : ''}</div>`;
  };
  const readForm = (D, root) => {
    const o = {};
    D.filter(d => d.k && !d.blank).forEach(d => {
      const el = A.$('#i-' + d.k, root);
      if (!el) return;
      let v = d.ro ? el.textContent.trim() : el.value.trim();
      if (d.money) v = unmoney(v);
      else if (d.num) v = v ? +v : null;
      else if (d.k === 'isPublic') v = v === 'true';
      o[d.k] = v === '' ? null : v;
    });
    return o;
  };
  const validate = (D, o, root) => {
    let ok = true;
    A.$$('.f', root).forEach(f => f.classList.remove('err'));
    D.filter(d => d.req).forEach(d => {
      const v = o[d.k];
      if (v == null || v === '') { ok = false; const f = A.$(`.f[data-k="${d.k}"]`, root); f && f.classList.add('err'); }
    });
    if (o.startYear && o.endYear && o.endYear < o.startYear) { ok = false; A.$('.f[data-k="endYear"]', root).classList.add('err'); A.toast('종료연도는 시작연도 이후여야 합니다.', 'bad'); return false; }
    if (!ok) A.toast('필수 입력 항목(*)을 확인하세요. 미입력 시 저장할 수 없습니다.', 'bad');
    return ok;
  };
  const bindAuto = (root) => {
    const c = A.$('#i-country', root);
    const fill = () => {
      const p = A.projects().find(x => x.country === c.value);
      A.$('#i-region', root).textContent = p ? p.region : '';
      A.$('#i-income', root).textContent = c.value ? K.CONST.incomeOf(c.value) : '';
    };
    c && c.addEventListener('change', fill);
    A.$$('input.num', root).forEach(i => i.addEventListener('input', () => { const n = unmoney(i.value); i.value = n == null ? '' : money(n); }));
  };
  const LABEL = { name: '사업명', type: '사업유형', field: '분야', workType: '공종', crs: '시행계획 분야', country: '국가', region: '지역', income: '소득그룹', orderer: '발주처', proposer: '제안기관', implementer: '수행기관', startYear: '시작연도', endYear: '종료연도', startDate: '착수일', endDate: '종료일', planAmt: '시행계획 예산', orderAmt: '발주금액', owner: '주담당자', subOwner: '부담당자', isPublic: '홈페이지 공개', aid: '원조형태', desc: '사업개요' };
  const disp = (k, v) => v == null || v === '' ? '-' : ['planAmt', 'orderAmt', 'contractAmt'].includes(k) ? A.won(v) : ['owner', 'subOwner'].includes(k) ? A.uname(v) : k === 'isPublic' ? (v ? '공개' : '비공개') : String(v);
  A.diffTable = changes => `<table class="tbl diff"><thead><tr><th>항목</th><th>변경 전</th><th>변경 후</th></tr></thead><tbody>${changes.map(c => `<tr><td class="nowrap">${esc(c.label)}</td><td class="bf">${esc(c.b)}</td><td class="af">${esc(c.a)}</td></tr>`).join('')}</tbody></table>`;

  const formPage = (view, p, q = {}) => {
    const mode = p ? 'edit' : 'new';
    const D = formDef(mode);
    const me = A.me();
    const newId = p ? null : A.nextPropId(new Date().getFullYear());
    const pv = !p && q.prev ? A.P(q.prev) : null;
    const init = p ? { ...p } : { _id: `${newId} · 1차`, _stage: '발굴 · 접수', orderer: '국토교통부', owner: me.role === 'STAFF' ? me.id : '', isPublic: false, aid: '무상', propOrg: '공공', startYear: new Date().getFullYear() + 2, endYear: new Date().getFullYear() + 3,
      ...(pv ? { prevId: pv.id, name: pv.name.replace(/(사업|수립|용역)?$/, '') + ' 후속사업', country: pv.country, type: pv.type, field: pv.field, workType: pv.workType, crs: pv.crs, proposer: pv.proposer, mode: '선행사업 연계 제안', evidence: '선행사업 추적조사 결과 · 수원국 요청공문', desc: `${pv.id} 추적조사·평가에서 확인한 후속 수요를 반영한 후속·연계사업` } : {}) };
    const pend = p && A.pendingOf(p.id);
    view.innerHTML = `
      ${A.ph(p ? '사업 기본정보 수정' : '사업 등록 (발굴)', p ? `${A.pid(p)} · ${esc(p.name)}` : '전 주기의 첫 기록 · 등록 내용은 결재(팀장 → 센터장) 승인 후 사업DB에 반영됩니다', `<a class="btn" href="#${p ? '/projects/' + p.id : '/projects'}">취소</a><button class="btn pri" id="save">결재 상신</button>`, 'SFR-017')}
      ${pend ? `<div class="notice warn"><span>⚠</span><span class="grow">이 사업에는 결재 진행중인 변경 건(${pend.id} · ${esc(pend.title)})이 있습니다. 추가 상신 시 별도 결재로 처리됩니다.</span></div>` : ''}
      ${p ? '<div class="notice info"><span>ⓘ</span><span class="grow">수정한 항목은 주황색으로 표시됩니다. 상신 시 변경 전·후 내용이 결재 문서에 첨부되고, 최종 승인 후 변경 이력으로 확정 기록됩니다.</span></div>' : ''}
      <div id="cmp"></div>
      <div class="card"><div class="bd"><div class="form" id="frm">${D.map(d => fieldHtml(d, d.k ? (d.k === 'isPublic' ? String(!!init.isPublic) : init[d.k]) : null)).join('')}</div></div></div>
      <div class="card"><div class="hd"><h3>첨부 문서</h3><span class="note">사업계획서·공문 등 (프로토타입: 파일명만 기록)</span></div><div class="bd"><label class="upl" id="upl">파일을 선택하거나 끌어다 놓으세요<input type="file" id="files" multiple hidden></label><div id="flist" class="small muted" style="margin-top:8px"></div></div></div>`;
    const root = A.$('#frm', view);
    bindAuto(root);
    if (!p) { A.$('#i-region', root).textContent = ''; if (pv) A.$('#i-country', root).dispatchEvent(new Event('change')); }
    if (pv) A.$('#cmp', view).innerHTML = `<div class="notice info"><span>↺</span><span class="grow"><b>후속·연계사업 발굴</b> — 선행사업 <a href="#/projects/${pv.id}">${pv.id} ${esc(pv.name)}</a>의 정보를 불러왔습니다. 등록되면 선행사업의 '환류 → 다음 발굴' 단계에 연결됩니다.</span></div>`;
    const files = [];
    A.$('#files', view).onchange = e => { [...e.target.files].forEach(f => files.push(f.name)); A.$('#flist', view).textContent = files.join(', '); };
    if (p) {
      A.$$('.f', root).forEach(f => f.addEventListener('input', () => {
        const o = readForm(D, root); const k = f.dataset.k;
        f.classList.toggle('chg', String(o[k] ?? '') !== String((k === 'isPublic' ? !!p.isPublic : p[k]) ?? ''));
      }));
      A.$$('.f select', root).forEach(s => s.addEventListener('change', () => s.closest('.f').dispatchEvent(new Event('input'))));
    }
    const reSel = A.$('#i-reId', root);
    if (reSel) reSel.onchange = () => {
      const src = A.P(reSel.value);
      if (!src) { A.$('#cmp', view).innerHTML = ''; return; }
      A.$('#cmp', view).innerHTML = `<div class="notice warn"><span>↺</span><span class="grow"><b>재제안은 새 사업을 만들지 않습니다</b> — <a href="#/projects/${src.id}">${A.pid(src)}</a> (${esc(A.stageLabel(src))})의 ${src.round + 1}차로 접수합니다. 사업ID가 바뀌지 않아 이후 심의·확정·계약·수행 기록이 모두 이 ID 아래 쌓입니다.</span><button class="btn sm pri" id="re-open">${src.id} · ${src.round + 1}차 접수</button></div>`;
      A.$('#re-open', view).onclick = () => A.reproposeModal(src, () => A.go('/projects/' + src.id + '?tab=info'));
    };
    A.$('#save', view).onclick = async () => {
      const o = readForm(D, root);
      if (!validate(D, o, root)) return;
      if (!p) {
        if (o.reId) { A.reproposeModal(A.P(o.reId), () => A.go('/projects/' + o.reId)); return; }
        o.id = newId; o.proposer = o.proposer || ''; delete o._id; delete o._stage;
        const changes = ['name', 'country', 'type', 'field', 'workType', 'planAmt', 'owner'].map(k => ({ path: k, label: k === 'planAmt' ? '제안 사업비' : LABEL[k], bv: null, av: o[k], b: '-', a: k === 'planAmt' ? A.won(o[k]) + '' : disp(k, o[k]) }));
        changes.unshift({ path: 'id', label: '사업ID · 차수', b: '-', a: `${newId} · 1차 (접수 시 부여)` });
        changes.splice(6, 0, { path: 'startYear', label: '사업기간', b: '-', a: `${o.startYear} ~ ${o.endYear}` });
        changes.push({ path: 'propOrg', label: '제안기관', b: '-', a: `${o.proposer} (${o.propOrg})` });
        if (o.prevId) changes.push({ path: 'prevId', label: '선행 사업', b: '-', a: o.prevId });
        const note = await A.ask('결재 상신', '상신 의견', { required: false, ok: '상신', hint: `결재선: ${A.resolveLine(null, me.id).map(s => A.ulabel(s.uid)).join(' → ')}` });
        if (note === null) return;
        const ap = A.submit({ type: 'NEW', pid: null, title: `신규 발굴 등록 — ${newId} · 1차 ${o.name}`, changes, payload: { project: o }, note, attach: files });
        A.toast(ap.status === 'APPROVED' ? '등록되었습니다.' : `결재 상신 완료 (${ap.id}) — ${A.uname(ap.line[0].uid)}님에게 알림을 발송했습니다.`, 'ok');
        A.go('/approvals?open=' + ap.id);
        return;
      }
      const changes = Object.keys(o).filter(k => !['region', 'income', '_id', '_stage'].includes(k) && String(o[k] ?? '') !== String((k === 'isPublic' ? !!p.isPublic : p[k]) ?? ''))
        .map(k => ({ path: k, label: LABEL[k] || k, bv: k === 'isPublic' ? !!p.isPublic : p[k], av: o[k], b: disp(k, k === 'isPublic' ? !!p.isPublic : p[k]), a: disp(k, o[k]) }));
      if (o.country !== p.country) {
        const src = A.projects().find(x => x.country === o.country);
        changes.push({ path: 'region', label: '지역', bv: p.region, av: src.region, b: p.region, a: src.region }, { path: 'continent', label: '대륙', bv: p.continent, av: src.continent, b: p.continent, a: src.continent }, { path: 'countryEn', label: '국가코드', bv: p.countryEn, av: src.countryEn, b: p.countryEn || '-', a: src.countryEn || '-' });
      }
      if (!changes.length) { A.toast('변경된 항목이 없습니다.'); return; }
      const m = A.modal({ title: '결재 상신 — 변경 내용 확인', cls: 'wide', body: `${A.diffTable(changes.filter(c => !['continent', 'countryEn'].includes(c.path)))}<div class="f"><label>결재선</label><div class="ro">${A.resolveLine(p.id, me.id).map(s => `${s.label} ${A.ulabel(s.uid)}`).join(' → ')}</div></div><div class="f"><label for="note">상신 의견</label><textarea id="note" placeholder="변경 사유를 입력하세요"></textarea></div>`, foot: `<button class="btn" data-close>취소</button><button class="btn pri" id="go">결재 상신</button>` });
      m.$('#go').onclick = () => {
        const ap = A.submit({ type: 'EDIT', pid: p.id, title: changes.length > 2 ? `사업정보 수정 (${changes[0].label} 외 ${changes.length - 1}건)` : `사업정보 수정 (${changes.map(c => c.label).join(', ')})`, changes, note: m.$('#note').value.trim(), attach: files });
        m.close();
        A.toast(ap.status === 'APPROVED' ? '수정 내용이 반영되었습니다.' : `결재 상신 완료 (${ap.id}) — 승인 후 반영됩니다.`, 'ok');
        A.go('/projects/' + p.id + '?tab=approval');
      };
    };
  };
  A.page('/projects/new', { menu: 'projects', title: '사업 등록 (발굴)', act: 'c' }, (view, _, q) => formPage(view, null, q));
  A.page('/projects/:id/edit', { menu: 'projects', title: '사업 수정', act: 'u' }, (view, { id }) => {
    const p = A.P(id);
    if (!p || !A.canEdit(p)) { view.innerHTML = A.ph('수정할 수 없습니다', '사업이 없거나 수정 권한이 없습니다.'); return; }
    formPage(view, p);
  });

  A.page('/pipeline', { menu: 'yearly', title: '단계별 추진현황' }, () => A.go('/yearly?view=board'));
})(window.App);
