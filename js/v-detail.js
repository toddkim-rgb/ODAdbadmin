/* 사업 상세 (SFR-018~028, 045~048) — 탭 구조 통합 조회 */
(function (A) {
  const { esc, num, eok, won, pct, U, K } = A;
  const money = v => (v == null || v === '' ? '' : Number(v).toLocaleString('ko-KR'));
  const unmoney = s => { const d = String(s || '').replace(/[^\d.-]/g, ''); return d === '' ? null : +d; };
  const refresh = () => { const y = window.scrollY; A.render(); window.scrollTo(0, y); };
  const bindMoney = root => A.$$('input.money', root).forEach(i => i.addEventListener('input', () => { const n = unmoney(i.value); i.value = n == null ? '' : money(n); }));
  const kv = (k, v, cls = '') => `<div class="${cls}"><dt>${k}</dt><dd>${v == null || v === '' ? '<span class="muted">-</span>' : v}</dd></div>`;

  const TABS = [
    ['info', '기본정보', 'SFR-020'], ['schedule', '추진경과·일정', 'SFR-006'], ['contract', '입찰·계약', 'SFR-018·019'], ['exec', '예산집행', 'SFR-022'],
    ['surplus', '낙찰차액', 'SFR-025'], ['docs', '문서', ''], ['perf', '성과관리', 'SFR-045~048'], ['approval', '결재', 'SFR-027'], ['hist', '변경이력', 'SFR-028'], ['acl', '권한', 'SFR-021'],
  ];

  A.page('/projects/:id', { menu: 'projects', title: '사업 상세' }, (view, { id }, q) => {
    const p = A.P(id);
    if (!p) { view.innerHTML = A.ph('사업을 찾을 수 없습니다', `${esc(id)} — 삭제되었거나 존재하지 않는 사업입니다.`, '<a class="btn" href="#/projects">목록으로</a>'); return; }
    if (!A.canSee(p)) {
      view.innerHTML = A.ph('조회 권한이 없는 사업입니다', `${p.id} · 담당자로 지정되지 않은 사업의 상세정보는 조회권한자 외 접근이 제한됩니다.`, '<a class="btn" href="#/projects">목록으로</a>', 'SFR-021') +
        `<div class="notice info"><span>ⓘ</span><span class="grow">사업 담당자 또는 관리자에게 <b>조회권한 부여</b>를 요청하세요. (권한 탭에서 사용자별 조회/수정 권한을 지정합니다)</span></div>`;
      return;
    }
    const tab = TABS.some(t => t[0] === q.tab) ? q.tab : 'info';
    const edit = A.canEdit(p);
    const pend = A.pendingOf(p.id);
    const ext = (K.EXT[p.stage] || []).filter(o => o.when(p));
    const int = (K.INT[p.stage] || []).filter(o => o.when(p));
    const nAp = A.db.approvals.filter(a => a.pid === p.id).length;
    view.innerHTML = `
      <div class="ph"><div>
        <div class="row small muted"><span class="mono">${A.pid(p)}</span>${A.stageBadge(p.stage, p)}${p.isPublic ? '<span class="b info">홈페이지 공개</span>' : '<span class="b mute">비공개</span>'}${p.round > 1 ? `<span class="tag">재제안 ${p.round}차</span>` : ''}${p.prop ? `<span class="b mute">${p.prop.year}년 공모</span>` : ''}${p.prevId ? '<span class="tag blue">후속·연계</span>' : ''}${p.migrated ? '<span class="b mute">공개 사업DB 이관</span>' : ''}</div>
        <h1 style="margin-top:4px">${esc(p.name)}</h1>
        <div class="sub">${esc(p.country)}(${esc(p.region)}) · ${esc(p.field)} · ${esc(p.type)} · ${p.startYear}–${p.endYear} · 담당 ${A.ulabel(p.owner)}${p.subOwner ? ' / ' + A.uname(p.subOwner) : ''}</div>
      </div><div class="acts">
        <button class="btn" id="b-exp">${A.ICON.dl}내보내기</button>
        ${edit && ext.length ? '<button class="btn" id="b-ext" title="위원회·국토부 등 외부 결정은 결재 없이 근거만 기록">외부 결정 기록</button>' : ''}
        ${edit && int.length ? '<button class="btn" id="b-stage">단계 변경 (결재)</button>' : ''}
        ${edit && p.prop && ['REJECTED', 'HELD'].includes(p.stage) ? `<button class="btn" id="b-re">${A.reLabel(p)}</button>` : ''}
        ${edit ? `<a class="btn pri" href="#/projects/${p.id}/edit">기본정보 수정</a>` : ''}
        ${A.can('projects', 'd') ? '<button class="btn danger" id="b-del">삭제</button>' : ''}
      </div></div>
      ${pend ? `<div class="notice warn"><span>⚠</span><span class="grow"><b>결재 ${A.AP_N[pend.status]}</b> — ${esc(pend.title)} (${pend.id}, ${A.uname(pend.drafter)} 상신). 승인 전까지 변경 내용은 반영되지 않습니다.</span><button class="btn sm" id="b-pend">결재 문서 보기</button></div>` : ''}
      <div class="card"><div class="bd">${stepper(p)}</div></div>
      <div class="tabs" role="tablist">${TABS.map(([k, n]) => `<button role="tab" data-t="${k}" class="${k === tab ? 'on' : ''}" aria-selected="${k === tab}">${n}${k === 'docs' ? `<span class="cnt">${p.docs.length}</span>` : k === 'approval' && nAp ? `<span class="cnt">${nAp}</span>` : ''}</button>`).join('')}</div>
      <div id="tab"></div>`;
    const draw = t => {
      A._charts.forEach(c => c.dispose()); A._charts = [];
      A.$$('.tabs button', view).forEach(b => { b.classList.toggle('on', b.dataset.t === t); b.setAttribute('aria-selected', b.dataset.t === t); });
      const host = A.$('#tab', view);
      host.innerHTML = '';
      R[t](p, host, edit);
    };
    A.$$('.tabs button', view).forEach(b => (b.onclick = () => { history.replaceState(null, '', `#/projects/${p.id}?tab=${b.dataset.t}`); A.cur.q.tab = b.dataset.t; draw(b.dataset.t); }));
    A.$('#b-pend', view) && (A.$('#b-pend', view).onclick = () => A.openApproval(pend.id));
    A.$('#b-exp', view).onclick = () => exportModal(p);
    A.$('#b-ext', view) && (A.$('#b-ext', view).onclick = () => A.decisionModal(p, refresh));
    A.$('#b-stage', view) && (A.$('#b-stage', view).onclick = () => stageModal(p));
    A.$('#b-re', view) && (A.$('#b-re', view).onclick = () => A.reproposeModal(p, refresh));
    A.$('#b-del', view) && (A.$('#b-del', view).onclick = async () => {
      if (!(await A.confirm(`<b>${esc(p.name)}</b> 사업을 삭제합니다.<br>삭제는 결재 승인 후 처리되며 삭제 이력이 기록됩니다.`, { title: '사업 삭제', ok: '삭제 결재 상신', danger: true }))) return;
      const reason = await A.ask('사업 삭제', '삭제 사유'); if (!reason) return;
      const ap = A.submit({ type: 'DELETE', pid: p.id, title: '사업 삭제 — ' + p.name, note: reason, changes: [{ path: 'deleted', label: '사업 삭제', b: p.name, a: '삭제' }] });
      A.toast(`삭제 결재 상신 (${ap.id})`, 'ok'); refresh();
    });
    draw(tab);
  });

  /* ── 단계 스텝퍼 (현재 차수 기준) ─────────────── */
  function stepper(p) {
    const cur = p.round || 1;
    const hist = p.stageHist.filter(h => (h.round || 1) === cur);
    const last = k => { const h = [...hist].reverse().find(x => x.k === k); return h ? (h.calc ? `${h.d.slice(0, 4)} 계산` : h.d) : ''; };
    const atPre = p.sub === '예비 심의';
    const flow = ['HELD', 'REJECTED'].includes(p.stage) ? (atPre ? ['DISCOVERED', 'PRELIM', p.stage, 'CONFIRMED', 'CONTRACTED', 'ONGOING', 'CLOSED'] : ['DISCOVERED', p.stage, 'PRELIM', 'CONFIRMED', 'CONTRACTED', 'ONGOING', 'CLOSED']) : K.FLOW;
    const ci = flow.indexOf(p.stage);
    return `<div class="stepper" aria-label="추진단계">${flow.map((k, i) => {
      const cls = i < ci ? 'done' : i === ci ? 'cur' : '';
      const x = k === 'REJECTED' ? ' alt' : k === 'HELD' ? ' hold' : '';
      const y = (K.STAGES.find(s => s.k === k) || {}).y;
      return `<div class="st ${cls}${i === ci ? x : ''}"><i>${i < ci ? '✓' : ''}</i><span>${i === ci ? esc(A.stageLabel(p)) : K.stageName(k)}${y ? ` <span class="muted small">${y}</span>` : ''}</span><span class="dt">${i <= ci ? last(k) : ''}</span></div>`;
    }).join('')}</div>`;
  }

  /* ── 전 주기 10단계 패널 (로드맵 상세 패널과 공유) ── */
  A.lifeHtml = p => `<div class="life">${A.lifecycle(p).map(s => `<div class="lst ${s.state}${s.alt ? ' alt' : ''}">
      <div class="n">${esc(s.n)}${s.y ? ` <span class="tagx ${s.fact ? 'fact' : ''}">${s.fact ? '실제 값' : '계산 값'}</span>` : ''}</div>
      <div class="d">${esc(s.y || '-')}</div>${s.note ? `<div class="src" style="color:var(--accentText)">${esc(s.note)}</div>` : ''}
      <div class="who2"><b>주관</b> ${esc(s.w[0])} · <b>작성</b> ${esc(s.w[1])} · <b>결정</b> ${esc(s.w[2])}</div>
      <div class="src">${esc(s.src)} · <span class="mono">${esc(s.ref)}</span></div></div>`).join('')}</div>`;

  /* ── 탭 렌더러 ─────────────────────────────── */
  const R = {};

  R.info = (p, host, edit) => {
    const prev = p.prevId && A.P(p.prevId);
    const nexts = (p.nextIds || []).map(A.P).filter(Boolean);
    const lastDec = [...p.stageHist].reverse().find(h => ['HELD', 'REJECTED'].includes(h.k) && (h.round || 1) === (p.round || 1));
    host.innerHTML = `
      ${p.qc.length ? `<div class="notice warn"><span>⚠</span><span class="grow"><b>이관자료 정비 필요</b> — ${p.qc.map(esc).join(' · ')}<br><span class="small muted">공개 사업DB 엑셀에서 이관된 값입니다. 입력기준에 맞게 보완 후 결재 상신하세요.</span></span>${edit ? `<a class="btn sm" href="#/projects/${p.id}/edit">보완하기</a>` : ''}</div>` : ''}
      <div class="card"><div class="hd"><h3>사업 기본정보</h3><span class="note">최종수정 ${p.updatedAt ? `${p.updatedAt} · ${A.uname(p.updatedBy)}` : p.createdAt}</span></div>
        <dl class="dl" style="margin:0">
          ${kv('사업ID · 차수', `<span class="mono">${A.pid(p)}</span>${p.prop ? ' <span class="muted small">접수 시 부여 · 변경 불가</span>' : ''}`)}${kv('사업유형', esc(p.type))}${kv('분야', esc(p.field))}${kv('공종', esc(p.workType))}
          ${kv('국가(수원국)', esc(p.country))}${kv('지역 · 대륙', `${esc(p.region)} · ${esc(p.continent)}`)}${kv('소득그룹', esc(p.income))}${kv('시행계획 분야', esc(p.crs))}
          ${kv('발주처', esc(p.orderer))}${kv('제안기관(시행기관)', esc(p.proposer))}${kv('수행기관', esc(p.implementer))}${kv('원조형태', `${esc(p.aid)} · ${esc(p.channel)}`)}
          ${kv('사업기간', `${p.startYear} ~ ${p.endYear}`)}${kv('착수일 ~ 종료일', p.startDate ? `<span class="mono">${p.startDate} ~ ${p.endDate}</span>` : '')}${kv('담당팀', esc(p.team))}${kv('주담당 / 부담당', `${A.ulabel(p.owner)}${p.subOwner ? ' / ' + A.ulabel(p.subOwner) : ''}`)}
          ${kv(p.prop ? '제안 사업비' : '시행계획 예산', p.planAmt != null ? `<span class="mono">${won(p.planAmt)}</span>` : '')}${kv('발주금액', p.orderAmt != null ? `<span class="mono">${won(p.orderAmt)}</span>` : '')}${kv('계약금액', p.contractAmt != null ? `<span class="mono">${won(p.contractAmt)}</span>` : '')}${kv('낙찰차액 · 낙찰률', A.surplusOf(p) != null ? `<span class="mono">${won(A.surplusOf(p))} · ${pct(A.rateOf(p), 2)}</span>` : '')}
          ${p.prop ? kv('공모 · 제안기관 구분', `${p.prop.year}년 공모 · ${esc(p.prop.org)}`) + kv('추진방식', esc(p.prop.mode)) + kv('근거 서류', esc(p.prop.evidence), 'w2') : ''}
          ${kv('사업개요', esc(p.desc), 'w4')}
        </dl></div>
      ${p.prop ? `<div class="card"><div class="hd"><h3>제안 차수 이력</h3><div class="row"><span class="note">재제안은 같은 사업ID의 다음 차수로 접수</span>${p.rounds.length ? '<button class="btn sm" id="rd-cmp">차수 간 변경 비교</button>' : ''}</div></div><div class="bd">
        ${p.rounds.map(r => `<div class="cstep ${r.result === '미선정' ? 'no' : 'hold'}"><div class="t">${p.id} · ${r.round}차 · ${esc(r.result)} (${esc(r.at)})</div><div class="s">${r.year}년 공모 · 사유: ${esc(r.reason)} · 제안 사업비 ${eok(r.snap.planAmt)}원 · ${esc(r.snap.mode || '')}</div></div>`).join('')}
        <div class="cstep ${['REJECTED'].includes(p.stage) ? 'no' : ['HELD'].includes(p.stage) ? 'hold' : 'ok'}"><div class="t">${p.id} · ${p.round}차 · ${esc(A.stageLabel(p))}</div><div class="s">${p.prop.year}년 공모 · ${lastDec ? '사유: ' + esc(lastDec.reason.replace(/^(미선정|보류) — /, '')) : p.round > 1 ? '새 번호 없이 같은 사업ID로 이후 단계 진행' : '접수 시 부여한 사업ID로 이후 심의·확정·계약·수행 기록이 모두 누적'}</div></div>
        ${['REJECTED', 'HELD'].includes(p.stage) && edit ? `<div class="row" style="margin-top:4px"><button class="btn sm pri" id="rd-re">${A.reLabel(p)}</button><span class="muted small">미선정 사유와 검토 결과를 다음 공모 제안서 보완에 활용</span></div>` : ''}
      </div></div>` : ''}
      ${prev || nexts.length ? `<div class="card"><div class="hd"><h3>연계 사업</h3><span class="note">후속·연계 (환류 → 다음 발굴)</span></div><div class="bd stack" style="gap:8px">
        ${prev ? `<div class="notice"><span class="tag blue">선행사업</span><span class="grow"><a href="#/projects/${prev.id}">${prev.id} ${esc(prev.name)}</a> ${A.stageBadge(prev.stage, prev)}</span></div>` : ''}
        ${nexts.map(n => `<div class="notice"><span class="tag blue">후속사업</span><span class="grow"><a href="#/projects/${n.id}">${A.pid(n)} ${esc(n.name)}</a> ${A.stageBadge(n.stage, n)}</span></div>`).join('')}
      </div></div>` : ''}`;
    A.$('#rd-cmp', host) && (A.$('#rd-cmp', host).onclick = () => A.roundCompare(p));
    A.$('#rd-re', host) && (A.$('#rd-re', host).onclick = () => A.reproposeModal(p, refresh));
  };

  /* 차수 간 변경 비교 */
  A.roundCompare = p => {
    const F = [['name', '사업명'], ['desc', '사업내용'], ['planAmt', '제안 사업비'], ['type', '사업유형'], ['mode', '추진방식'], ['evidence', '근거 서류'], ['period', '시행연도']];
    const cur = { name: p.name, desc: p.desc, planAmt: p.planAmt, type: p.type, mode: p.prop && p.prop.mode, evidence: p.prop && p.prop.evidence, startYear: p.startYear, endYear: p.endYear };
    const snaps = [...p.rounds.map(r => ({ round: r.round, s: r.snap, res: `${r.result}(${r.at})` })), { round: p.round, s: cur, res: A.stageLabel(p) }];
    const a = snaps[snaps.length - 2], b = snaps[snaps.length - 1];
    const val = (s, k) => (k === 'planAmt' ? won(s.planAmt) : k === 'period' ? `${s.startYear} ~ ${s.endYear}` : s[k] || '-');
    const chg = F.filter(([k]) => val(a.s, k) !== val(b.s, k)).length;
    A.modal({ title: `차수 간 변경 비교 — ${p.id}`, cls: 'xwide', body: `
      <div class="notice info"><span>↺</span><span class="grow"><b>${p.id} · ${a.round}차</b> (${esc(a.res)}) → <b>${b.round}차</b> (${esc(b.res)}) · 변경 항목 <b>${chg}</b>개 · 새 번호 없이 같은 사업ID로 관리</span></div>
      <table class="tbl diff"><thead><tr><th>항목</th><th>${a.round}차</th><th>${b.round}차 (재제안)</th><th class="c">변경</th></tr></thead><tbody>
      ${F.map(([k, n]) => { const x = val(a.s, k), y = val(b.s, k), d = x !== y; return `<tr><td class="nowrap">${n}</td><td class="${d ? 'bf' : ''}">${esc(x)}</td><td class="${d ? 'af' : ''}">${esc(y)}</td><td class="c">${d ? '<span class="b acc">변경</span>' : '<span class="muted small">동일</span>'}</td></tr>`; }).join('')}
      <tr class="sub"><td>예산 증감</td><td colspan="3" class="mono">${a.s.planAmt && b.s.planAmt ? `${b.s.planAmt >= a.s.planAmt ? '+' : ''}${won(b.s.planAmt - a.s.planAmt)} (${pct(((b.s.planAmt - a.s.planAmt) / a.s.planAmt) * 100)})` : '-'}</td></tr>
      </tbody></table>
      <div class="card"><div class="hd"><h3>차수별 심사 이력</h3></div><div class="bd"><ul class="tl">${p.stageHist.filter(h => !h.calc).map(h => `<li class="${h.k === 'REJECTED' ? 'bad' : ''}"><div class="d">${h.d} · ${h.round || 1}차</div><div class="t">${K.stageName(h.k)}${h.sub ? ' · ' + esc(h.sub) : ''}</div><div class="x">${esc(h.reason)}${h.ext ? ` <span class="muted">— ${esc(h.ext.body)}${h.ext.no ? ', ' + esc(h.ext.no) : ''}</span>` : ''}</div></li>`).join('')}</ul></div></div>` });
  };

  /* 지침 기한 규칙으로 예정일 자동 제안 (♥ 추가 제안) */
  const ruleItems = p => {
    const end = p.endDate || `${p.endYear}-12-15`;
    const out = [];
    if (['CONFIRMED', 'CONTRACTED', 'ONGOING'].includes(p.stage)) {
      out.push(['성과평가위원회 (종료 1개월 전)', U.addD(end, -30), '성과평가위원회 지침 제8조 · 종료 1개월 전', 'ONGOING']);
      out.push(['성과평가 결과 통보', U.addD(end, -16), '위원회 후 14일 이내 통보', 'ONGOING']);
      out.push(['준공 · 수원국 최종보고회 인계', end, '사업관리 규정 제37조 · 수원국 최종보고회', 'ONGOING']);
      out.push(['성과평가 보완 제출', U.addD(end, 44), '결과 통보 후 2개월 이내 보완', 'CLOSED']);
      out.push(['정산 승인 후 잔액 반납', U.addD(end, 40), '정산 승인 후 7영업일 (정산 승인일은 예시)', 'CLOSED']);
    }
    if (p.endYear >= 2023 && ['CONFIRMED', 'CONTRACTED', 'ONGOING', 'CLOSED', 'FOLLOWUP'].includes(p.stage)) for (let k = 1; k <= K.TRACK(p.type); k++) out.push([`추적조사 ${k}차 보고서 제출`, `${p.endYear + k}-02-28`, '성과관리 지침 제26조 · 종료 후 매년 2월', 'FOLLOWUP']);
    if (p.stage === 'PRELIM' && p.sub === '의결') out.push(['국제개발협력위원회 신규사업 확정', `${p.startYear}-01-22`, '외교부 검토 → 국제개발협력위원회 (발굴 제2조)', 'CONFIRMED']);
    return out.filter(r => !p.schedule.some(m => m.name === r[0]));
  };

  R.schedule = (p, host, edit) => {
    const T = U.today();
    const rules = ruleItems(p);
    host.innerHTML = `
      <div class="g-7-5">
        <div class="card"><div class="hd"><h3>주요 일정</h3><div class="row"><span class="note">알림: 예정일 D-7 · D-1 담당자 이메일</span>${edit && rules.length ? `<button class="btn sm" id="ms-rule" title="지침 기한 규칙으로 예정일 자동 제안">지침 기한 자동 제안 <span class="cnt">${rules.length}</span></button>` : ''}${edit ? '<button class="btn sm pri" id="ms-add">일정 추가</button>' : ''}</div></div>
          <div class="tw"><table class="tbl"><thead><tr><th>일정</th><th>단계</th><th>예정일</th><th>완료일</th><th>상태</th><th>지연 사유 / 향후 조치</th>${edit ? '<th></th>' : ''}</tr></thead><tbody>
          ${p.schedule.slice().sort((a, b) => (a.plan < b.plan ? -1 : 1)).map(m => {
            const dd = U.diffD(T, m.plan);
            const st = m.done ? (m.done > m.plan ? `<span class="b warn">완료(${U.diffD(m.plan, m.done)}일 지연)</span>` : '<span class="b ok">완료</span>') : dd < 0 ? `<span class="b bad">지연 ${-dd}일</span>` : dd <= 7 ? `<span class="b warn">D-${dd}</span>` : `<span class="b mute">D-${dd}</span>`;
            return `<tr><td class="ink">${esc(m.name)}${m.rule ? `<div class="muted small">근거: ${esc(m.rule)}</div>` : ''}</td><td class="nowrap">${K.stageName(m.stage)}</td><td class="mono small">${m.plan}</td><td class="mono small">${m.done || '-'}</td><td>${st}</td><td class="small">${m.reason ? `<div style="color:var(--bad)">${esc(m.reason)}</div>` : ''}${m.action ? `<div class="muted">→ ${esc(m.action)}</div>` : ''}</td>${edit ? `<td><button class="btn sm" data-ms="${m.id}">수정</button></td>` : ''}</tr>`;
          }).join('') || `<tr><td colspan="7" class="empty">등록된 일정이 없습니다.</td></tr>`}
          </tbody></table></div></div>
        <div class="card"><div class="hd"><h3>사업 전 주기</h3><span class="note">10단계 · 주관 · 작성 · 결정</span></div><div class="bd">${A.lifeHtml(p)}</div></div>
      </div>
      <div class="card"><div class="hd"><h3>처리 이력</h3><span class="note">외부 결정은 결재 없이 결정기관·근거 문서로 기록 · 내부 처리는 결재 후 반영</span></div>
        <div class="tw"><table class="tbl"><thead><tr><th>일자</th><th>차수</th><th>단계 · 세부</th><th>내용</th><th>구분</th><th>결정기관 · 근거</th><th>처리자</th></tr></thead><tbody>
        ${[...p.stageHist].reverse().map(h => `<tr><td class="mono small nowrap">${h.calc ? h.d.slice(0, 4) : h.d}</td><td class="small">${h.round ? h.round + '차' : '-'}</td><td class="nowrap">${A.stageBadge(h.k)}${h.sub ? ` <span class="small">${esc(h.sub)}</span>` : ''}</td><td>${esc(h.reason)}</td><td class="nowrap">${h.calc ? '<span class="tagx">계산 값</span>' : h.ext ? '<span class="b info">외부 결정</span>' : '<span class="b mute">내부 처리</span>'}</td><td class="small">${h.ext ? `${esc(h.ext.body)}${h.ext.no ? `<div class="muted">${esc(h.ext.no)}</div>` : ''}${h.ext.doc ? `<div>📎 ${esc(h.ext.doc)}</div>` : ''}` : '-'}</td><td class="nowrap">${h.calc ? '-' : A.uname(h.by)}</td></tr>`).join('')}
        </tbody></table></div></div>`;
    const msModal = m => {
      const isNew = !m; m = m || { name: '', stage: p.stage, plan: U.addD(T, 14), done: '', reason: '', action: '' };
      const md = A.modal({ title: isNew ? '일정 추가' : '일정 수정', body: `<div class="form" style="grid-template-columns:1fr 1fr">
        <div class="f req span2"><label>일정명</label><input id="m-name" value="${esc(m.name)}"></div>
        <div class="f"><label>단계</label><select id="m-stage">${A.opts(K.STAGES.map(s => [s.k, s.n]), m.stage, null)}</select></div>
        <div class="f req"><label>예정일</label><input type="date" id="m-plan" value="${m.plan}"></div>
        <div class="f"><label>완료일</label><input type="date" id="m-done" value="${m.done || ''}"></div><div></div>
        <div class="f span2"><label>지연 사유</label><input id="m-reason" value="${esc(m.reason)}" placeholder="예정일 경과 시 입력"></div>
        <div class="f span2"><label>향후 조치사항</label><input id="m-action" value="${esc(m.action)}"></div></div>`,
        foot: `${isNew ? '' : '<button class="btn danger" id="m-del">삭제</button><span class="sp"></span>'}<button class="btn" data-close>취소</button><button class="btn pri" id="m-ok">저장</button>` });
      md.$('#m-ok').onclick = () => {
        const o = { name: md.$('#m-name').value.trim(), stage: md.$('#m-stage').value, plan: md.$('#m-plan').value, done: md.$('#m-done').value || null, reason: md.$('#m-reason').value.trim(), action: md.$('#m-action').value.trim() };
        if (!o.name || !o.plan) { A.toast('일정명과 예정일은 필수입니다.', 'bad'); return; }
        if (!o.done && o.plan < T && !o.reason) { md.$('#m-reason').closest('.f').classList.add('err'); A.toast('예정일이 지난 미완료 일정은 지연 사유를 입력하세요.', 'bad'); return; }
        if (isNew) { p.schedule.push({ id: 'M' + String(A.db.seq.ms++).padStart(4, '0'), rule: '', ...o }); A.hist(p.id, '일정', o.name, '', `예정 ${o.plan}`); }
        else { const before = `예정 ${m.plan} / 완료 ${m.done || '-'}`; Object.assign(m, o); A.hist(p.id, '일정', o.name, before, `예정 ${o.plan} / 완료 ${o.done || '-'}`); }
        A.save(); md.close(); A.toast('일정을 저장했습니다.', 'ok'); refresh();
      };
      md.$('#m-del') && (md.$('#m-del').onclick = async () => { if (!(await A.confirm(`'${esc(m.name)}' 일정을 삭제할까요?`, { danger: true, ok: '삭제' }))) return; p.schedule = p.schedule.filter(x => x !== m); A.hist(p.id, '일정', m.name, `예정 ${m.plan}`, '삭제'); A.save(); md.close(); refresh(); });
    };
    A.$('#ms-add', host) && (A.$('#ms-add', host).onclick = () => msModal());
    A.$$('[data-ms]', host).forEach(b => (b.onclick = () => msModal(p.schedule.find(m => m.id === b.dataset.ms))));
    A.$('#ms-rule', host) && (A.$('#ms-rule', host).onclick = () => {
      const md = A.modal({ title: '지침 기한 규칙으로 예정일 자동 제안', cls: 'wide', body: `
        <div class="notice info small"><span>♥</span><span class="grow">지침에 정해진 기한을 사업 종료일·종료연도 기준으로 계산해 제안합니다. 담당자가 기한을 외우지 않아도 되고, 추가한 일정은 D-7·D-1 알림 대상이 됩니다.</span></div>
        <table class="tbl"><thead><tr><th class="c"><input type="checkbox" id="r-all" checked aria-label="전체 선택"></th><th>일정</th><th>예정일</th><th>근거</th></tr></thead><tbody>
        ${rules.map((r, i) => `<tr><td class="c"><input type="checkbox" data-r="${i}" checked aria-label="${esc(r[0])}"></td><td class="ink">${esc(r[0])}</td><td class="mono small">${r[1]}</td><td class="small muted">${esc(r[2])}</td></tr>`).join('')}
        </tbody></table><div class="small muted">그 외 지침 기한(위원회 후 10일 통보 등)은 착수 시 센터와 기한표를 확정해 규칙에 추가합니다.</div>`,
        foot: '<button class="btn" data-close>취소</button><button class="btn pri" id="r-ok">선택 일정 추가</button>' });
      md.$('#r-all').onchange = e => md.$$('[data-r]').forEach(c => (c.checked = e.target.checked));
      md.$('#r-ok').onclick = () => {
        const sel = md.$$('[data-r]').filter(c => c.checked).map(c => rules[+c.dataset.r]);
        if (!sel.length) { A.toast('추가할 일정을 선택하세요.', 'bad'); return; }
        sel.forEach(r => p.schedule.push({ id: 'M' + String(A.db.seq.ms++).padStart(4, '0'), name: r[0], stage: r[3], plan: r[1], done: null, reason: '', action: '', rule: r[2] }));
        A.hist(p.id, '일정', '지침 기한 자동 제안', '', `${sel.length}건 추가`);
        A.save(); md.close(); A.toast(`${sel.length}건의 일정을 추가했습니다.`, 'ok'); refresh();
      };
    });
  };

  R.contract = (p, host, edit) => {
    const fi = K.FLOW.indexOf(p.stage);
    if (fi < K.FLOW.indexOf('CONFIRMED')) { host.innerHTML = `<div class="card"><div class="empty">입찰·계약 정보는 국제개발협력위원회 의결 후 <b>확정사업</b> 단계부터 등록합니다.<br>현재 단계: ${A.stageBadge(p.stage)}</div></div>`; return; }
    const b = p.bid || {}; const c = p.contract;
    const ind = b.indicators || {};
    const ck = (v, n) => `<span class="b ${v ? 'ok' : 'mute'}"><span class="ic">${v ? '✓' : '–'}</span>${n}</span>`;
    host.innerHTML = `
      <div class="grid2">
        <div class="card"><div class="hd"><h3>입찰 정보</h3>${edit && !c ? '<button class="btn sm pri" id="bid-reg">입찰·낙찰 결과 등록</button>' : ''}</div>
          <dl class="dl" style="margin:0;grid-template-columns:repeat(2,minmax(0,1fr))">
            ${kv('입찰공고일', `<span class="mono">${b.notice || '-'}</span>`)}${kv('입찰방법', esc(b.method))}
            ${kv('발주금액', `<span class="mono">${won(p.orderAmt)}</span>`)}${kv('입찰 선정 지표', `<div class="row" style="gap:4px">${ck(ind.pcp, 'PCP')}${ck(ind.letter, '수원국 요청공문')}${ck(ind.fs, '사전타당성조사')}</div>`)}
            ${kv('낙찰업체', esc(b.winner))}${kv('낙찰일', `<span class="mono">${b.awardDate || '-'}</span>`)}
            ${kv('낙찰금액', `<span class="mono">${won(b.awardAmt)}</span>`)}${kv('낙찰률', b.awardAmt && p.orderAmt ? `<span class="calc" style="display:inline-block;min-height:auto;padding:1px 8px">${pct((b.awardAmt / p.orderAmt) * 100, 2)}<small>자동계산</small></span>` : '-')}
          </dl></div>
        <div class="card"><div class="hd"><h3>계약 정보</h3>${edit && c ? '<button class="btn sm" id="ct-edit">계약정보 수정</button>' : ''}</div>
          ${c ? `<dl class="dl" style="margin:0;grid-template-columns:repeat(2,minmax(0,1fr))">
            ${kv('계약일', `<span class="mono">${c.date}</span>`)}${kv('계약업체', esc(c.vendor))}
            ${kv('계약기간', `<span class="mono">${c.start} ~ ${c.end}</span>`)}${kv('계약금액', `<span class="mono">${won(c.amt)}</span>`)}
            ${kv('낙찰률 (계약금액 ÷ 발주금액 × 100)', `<span class="mono">${pct(A.rateOf(p), 2)}</span>`)}${kv('낙찰차액 (발주금액 − 계약금액)', `<span class="mono">${won(A.surplusOf(p))}</span>`)}
          </dl>` : '<div class="empty">계약 체결 전입니다. 입찰·낙찰 결과를 등록하면 계약정보가 함께 생성됩니다.</div>'}</div>
      </div>
      <div class="card"><div class="hd"><h3>입찰 참가 이력</h3><span class="note">협상에 의한 계약 · 기술 80점 + 가격 20점</span></div><div class="tw"><table class="tbl"><thead><tr><th class="c">순위</th><th>업체명</th><th class="num">기술평가</th><th class="num">가격평가</th><th class="num">종합</th><th>결과</th></tr></thead><tbody>
        ${(b.bidders || []).map(x => `<tr><td class="c mono">${x.rank}</td><td class="ink">${esc(x.name)}</td><td class="num">${x.tech.toFixed(2)}</td><td class="num">${x.price.toFixed(2)}</td><td class="num">${x.total.toFixed(2)}</td><td>${x.name === b.winner ? '<span class="b ok">낙찰</span>' : '<span class="muted small">-</span>'}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">제안서 평가 전입니다.</td></tr>'}
      </tbody></table></div></div>
      <div class="card"><div class="hd"><h3>계약 변경 이력</h3><span class="note">계약금액·기간 변경 시 변경 전·후 자동 기록</span></div><div class="tw"><table class="tbl"><thead><tr><th>변경일</th><th>항목</th><th class="num">변경 전</th><th class="num">변경 후</th><th>사유</th></tr></thead><tbody>
        ${c && c.changes.length ? c.changes.map(x => `<tr><td class="mono small">${x.date}</td><td>${esc(x.field)}</td><td class="num">${typeof x.before === 'number' ? num(x.before) : esc(x.before)}</td><td class="num">${typeof x.after === 'number' ? num(x.after) : esc(x.after)}</td><td>${esc(x.reason)}</td></tr>`).join('') : '<tr><td colspan="5" class="empty">변경 이력이 없습니다.</td></tr>'}
      </tbody></table></div></div>`;
    A.$('#bid-reg', host) && (A.$('#bid-reg', host).onclick = () => bidModal(p));
    A.$('#ct-edit', host) && (A.$('#ct-edit', host).onclick = () => contractModal(p));
  };

  function calcBox(order, amt) {
    if (!order || !amt) return { rate: '-', diff: '-' };
    return { rate: pct((amt / order) * 100, 2), diff: won(order - amt) };
  }
  function bidModal(p) {
    const b = p.bid || {};
    const T = U.today();
    const bidders = [{ name: '', tech: '', price: '' }, { name: '', tech: '', price: '' }];
    const m = A.modal({ title: '입찰·낙찰 결과 등록', cls: 'wide', body: `
      <div class="form">
        <div class="fsec">입찰 정보</div>
        <div class="f req"><label>입찰공고일</label><input type="date" id="b-notice" value="${b.notice || ''}"></div>
        <div class="f req span2"><label>입찰방법</label><select id="b-method">${A.opts(['제한경쟁입찰(협상에 의한 계약)', '일반경쟁입찰(협상에 의한 계약)', '일반경쟁입찰(적격심사)', '수의계약'], b.method, null)}</select></div>
        <div class="f req"><label>발주금액(원)</label><input class="money num" id="b-order" value="${money(p.orderAmt)}"></div>
        <div class="f span4"><label>입찰 선정 지표</label><div class="row"><label class="row small"><input type="checkbox" id="b-pcp" ${b.indicators && b.indicators.pcp ? 'checked' : ''}>PCP</label><label class="row small"><input type="checkbox" id="b-letter" ${b.indicators && b.indicators.letter ? 'checked' : ''}>수원국 요청공문</label><label class="row small"><input type="checkbox" id="b-fs" ${b.indicators && b.indicators.fs ? 'checked' : ''}>사전타당성조사</label></div></div>
        <div class="fsec">제안서 평가 결과 <button class="btn sm" id="b-add" type="button">업체 추가</button></div>
        <div class="span4"><table class="tbl"><thead><tr><th>업체명</th><th class="num">기술(80)</th><th class="num">가격(20)</th><th class="num">종합</th><th class="c">순위</th></tr></thead><tbody id="b-rows"></tbody></table></div>
        <div class="fsec">낙찰 · 계약</div>
        <div class="f req"><label>낙찰업체</label><div class="ro" id="b-win">-</div><span class="hint">종합점수 1순위 자동 지정</span></div>
        <div class="f req"><label>낙찰일</label><input type="date" id="b-adate" value="${T}"></div>
        <div class="f req"><label>낙찰(계약)금액(원)</label><input class="money num" id="b-amt"></div>
        <div class="f"><label>낙찰률 / 낙찰차액</label><div class="calc" id="b-calc">-</div></div>
        <div class="f req"><label>계약일</label><input type="date" id="b-cdate" value="${T}"></div>
        <div class="f req"><label>계약 시작일</label><input type="date" id="b-cs" value="${U.addD(T, 10)}"></div>
        <div class="f req"><label>계약 종료일</label><input type="date" id="b-ce" value="${p.endYear}-12-15"></div>
        <div class="f"><label>첨부</label><div class="ro small">입찰공고문, 제안요청서, 계약서</div></div>
      </div>
      <div class="notice info"><span>ⓘ</span><span class="grow">등록 시 결재가 상신되며, 최종 승인되면 추진단계가 <b>확정 → 계약체결</b>로 변경되고 계약금액·수행기관이 사업 기본정보에 반영됩니다.</span></div>`,
      foot: `<button class="btn" data-close>취소</button><button class="btn pri" id="b-ok">결재 상신</button>` });
    bindMoney(m.el);
    const rows = () => {
      const scored = bidders.map(x => ({ ...x, total: (+x.tech || 0) + (+x.price || 0) }));
      const order = [...scored].sort((a, c) => c.total - a.total);
      m.$('#b-rows').innerHTML = scored.map((x, i) => `<tr><td><input data-i="${i}" data-f="name" value="${esc(x.name)}" placeholder="업체명"></td><td><input class="num" data-i="${i}" data-f="tech" value="${x.tech}"></td><td><input class="num" data-i="${i}" data-f="price" value="${x.price}"></td><td class="num">${x.total ? x.total.toFixed(2) : '-'}</td><td class="c mono">${x.total ? order.indexOf(scored[i]) + 1 : '-'}</td></tr>`).join('');
      m.$$('#b-rows input').forEach(inp => (inp.onchange = () => { bidders[+inp.dataset.i][inp.dataset.f] = inp.value; rows(); }));
      const top = order.find(x => x.name && x.total);
      m.$('#b-win').textContent = top ? top.name : '-';
    };
    rows();
    m.$('#b-add').onclick = () => { bidders.push({ name: '', tech: '', price: '' }); rows(); };
    const calc = () => { const r = calcBox(unmoney(m.$('#b-order').value), unmoney(m.$('#b-amt').value)); m.$('#b-calc').innerHTML = `${r.rate} / ${r.diff}<small>자동계산</small>`; };
    m.$('#b-order').addEventListener('input', calc); m.$('#b-amt').addEventListener('input', calc);
    m.$('#b-ok').onclick = () => {
      const order = unmoney(m.$('#b-order').value), amt = unmoney(m.$('#b-amt').value), win = m.$('#b-win').textContent;
      const v = { notice: m.$('#b-notice').value, adate: m.$('#b-adate').value, cdate: m.$('#b-cdate').value, cs: m.$('#b-cs').value, ce: m.$('#b-ce').value };
      if (!order || !amt || win === '-' || Object.values(v).some(x => !x)) { A.toast('필수 항목(*)과 평가 결과를 입력하세요.', 'bad'); return; }
      if (amt > order) { A.toast('낙찰금액이 발주금액을 초과합니다.', 'bad'); return; }
      const bs = bidders.filter(x => x.name).map(x => ({ name: x.name, tech: +x.tech || 0, price: +x.price || 0, total: (+x.tech || 0) + (+x.price || 0) })).sort((a, c) => c.total - a.total).map((x, i) => ({ ...x, rank: i + 1 }));
      const bid = { notice: v.notice, method: m.$('#b-method').value, orderAmt: order, bidders: bs, indicators: { pcp: m.$('#b-pcp').checked, letter: m.$('#b-letter').checked, fs: m.$('#b-fs').checked }, winner: win, awardDate: v.adate, awardAmt: amt };
      const contract = { date: v.cdate, amt, start: v.cs, end: v.ce, vendor: win, changes: [] };
      const ap = A.submit({ type: 'CONTRACT', pid: p.id, title: '입찰·낙찰 결과 및 계약정보 등록', payload: { bid, contract },
        changes: [
          { path: 'orderAmt', label: '발주금액', bv: p.orderAmt, av: order, b: won(p.orderAmt), a: won(order) },
          { path: 'contractAmt', label: '계약금액', bv: null, av: amt, b: '-', a: won(amt) },
          { path: 'implementer', label: '수행기관(낙찰업체)', bv: p.implementer, av: win, b: p.implementer || '-', a: win },
          { path: 'stage', label: '추진단계', bv: p.stage, av: 'CONTRACTED', b: A.stageName(p.stage), a: '계약체결' },
        ], note: `낙찰률 ${pct((amt / order) * 100, 2)}, 낙찰차액 ${won(order - amt)}` });
      m.close(); A.toast(`결재 상신 완료 (${ap.id})`, 'ok'); refresh();
    };
  }
  function contractModal(p) {
    const c = p.contract;
    const m = A.modal({ title: '계약정보 수정', cls: 'wide', body: `<div class="form">
      <div class="f req"><label>계약일</label><input type="date" id="c-date" value="${c.date}"></div>
      <div class="f req span3"><label>계약업체</label><input id="c-vendor" value="${esc(c.vendor)}"></div>
      <div class="f req"><label>계약 시작일</label><input type="date" id="c-s" value="${c.start}"></div>
      <div class="f req"><label>계약 종료일</label><input type="date" id="c-e" value="${c.end}"></div>
      <div class="f req"><label>계약금액(원)</label><input class="money num" id="c-amt" value="${money(c.amt)}"></div>
      <div class="f"><label>낙찰률 / 낙찰차액</label><div class="calc" id="c-calc"></div></div>
      <div class="f span4 req"><label>변경 사유</label><input id="c-reason" placeholder="예) 과업범위 조정에 따른 변경계약"></div></div>
      <div class="notice info"><span>ⓘ</span><span class="grow">계약금액·기간 변경은 결재 승인 후 반영되며 변경 전·후가 계약 변경 이력에 자동 기록됩니다. 금액 증감은 <b>예산변경 요청</b>으로 처리하는 것을 권장합니다.</span></div>`,
      foot: `<button class="btn" data-close>취소</button><button class="btn pri" id="c-ok">결재 상신</button>` });
    bindMoney(m.el);
    const calc = () => { const r = calcBox(p.orderAmt, unmoney(m.$('#c-amt').value)); m.$('#c-calc').innerHTML = `${r.rate} / ${r.diff}<small>자동계산</small>`; };
    m.$('#c-amt').addEventListener('input', calc); calc();
    m.$('#c-ok').onclick = () => {
      const o = { date: m.$('#c-date').value, vendor: m.$('#c-vendor').value.trim(), start: m.$('#c-s').value, end: m.$('#c-e').value, amt: unmoney(m.$('#c-amt').value) };
      const reason = m.$('#c-reason').value.trim();
      if (!reason) { m.$('#c-reason').closest('.f').classList.add('err'); A.toast('변경 사유를 입력하세요.', 'bad'); return; }
      const L = { date: '계약일', vendor: '계약업체', start: '계약 시작일', end: '계약 종료일', amt: '계약금액' };
      const changes = Object.keys(o).filter(k => String(o[k]) !== String(c[k])).map(k => ({ path: k === 'amt' ? 'contractAmt' : 'contract.' + k, label: L[k], bv: c[k], av: o[k], b: k === 'amt' ? won(c[k]) : c[k], a: k === 'amt' ? won(o[k]) : o[k] }));
      if (o.end !== c.end) changes.push({ path: 'endDate', label: '사업 종료일', bv: p.endDate, av: o.end, b: p.endDate, a: o.end });
      if (o.vendor !== c.vendor) changes.push({ path: 'implementer', label: '수행기관', bv: p.implementer, av: o.vendor, b: p.implementer, a: o.vendor });
      if (!changes.length) { A.toast('변경된 항목이 없습니다.'); return; }
      const ap = A.submit({ type: 'CONTRACT', pid: p.id, title: '계약정보 변경', changes, note: reason });
      if (o.end !== c.end || o.start !== c.start) ap.payload = { contractHist: { field: '계약기간', before: `${c.start}~${c.end}`, after: `${o.start}~${o.end}`, reason } };
      A.save(); m.close(); A.toast(`결재 상신 완료 (${ap.id})`, 'ok'); refresh();
    };
  }

  R.exec = (p, host, edit) => {
    if (!p.contract) { host.innerHTML = `<div class="card"><div class="empty">계약 체결 후 집행금액을 등록할 수 있습니다.</div></div>`; return; }
    const f = (A.state.ex = A.state.ex && A.state.ex.pid === p.id ? A.state.ex : { pid: p.id, y: '', item: '' });
    const total = A.execOf(p), ca = p.contractAmt || 0, rate = ca ? (total / ca) * 100 : 0;
    const years = A.uniq(p.execs, 'y');
    const items = K.CONST.EXEC_ITEMS;
    const cell = (it, y) => p.execs.filter(e => e.item === it && (y == null || e.y === y)).reduce((s, e) => s + e.amt, 0);
    const rows = p.execs.filter(e => (!f.y || e.y === +f.y) && (!f.item || e.item === f.item)).sort((a, b) => (a.date < b.date ? 1 : -1));
    host.innerHTML = `
      <div class="kpis">
        <div class="kpi"><span class="k">계약금액</span><span class="v mono" style="font-size:19px">${num(ca)}</span><span class="d">원</span></div>
        <div class="kpi"><span class="k">집행금액 합계</span><span class="v mono" style="font-size:19px">${num(total)}</span><span class="d">${p.execs.length}건</span></div>
        <div class="kpi"><span class="k">집행 잔액 (자동계산)</span><span class="v mono" style="font-size:19px">${num(ca - total)}</span><span class="d">계약금액 − 집행금액</span></div>
        <div class="kpi"><span class="k">집행률</span><span class="v">${pct(rate)}</span><div class="prog ${rate >= 100 ? 'ok' : ''}"><i style="width:${Math.min(100, rate)}%"></i></div></div>
      </div>
      <div class="card"><div class="hd"><h3>항목별 · 연도별 집행 현황</h3><div class="row">${edit ? '<button class="btn sm" id="bc-req">예산변경 요청</button>' : ''}</div></div><div class="tw"><table class="tbl"><thead><tr><th>집행항목</th>${years.map(y => `<th class="num">${y}</th>`).join('')}<th class="num">합계</th><th class="num">구성비</th></tr></thead><tbody>
        ${items.map(it => `<tr><td class="ink">${it}</td>${years.map(y => `<td class="num">${num(cell(it, y))}</td>`).join('')}<td class="num">${num(cell(it))}</td><td class="num">${pct((cell(it) / Math.max(1, total)) * 100)}</td></tr>`).join('')}
      </tbody><tfoot><tr><td>합계</td>${years.map(y => `<td class="num">${num(p.execs.filter(e => e.y === y).reduce((s, e) => s + e.amt, 0))}</td>`).join('')}<td class="num">${num(total)}</td><td class="num">100.0%</td></tr></tfoot></table></div></div>
      <div class="card"><div class="hd"><h3>집행 내역</h3><div class="row">
        <select id="ex-y" class="btn sm">${A.opts(years, f.y, '전체 연도')}</select><select id="ex-i" class="btn sm">${A.opts(items, f.item, '전체 항목')}</select>
        <button class="btn sm" id="ex-xls">${A.ICON.dl}엑셀</button>${edit ? '<button class="btn sm pri" id="ex-add">집행 등록</button>' : ''}</div></div>
        <div class="tw" style="max-height:420px"><table class="tbl"><thead><tr><th>집행일</th><th>연도</th><th>항목</th><th class="num">금액(원)</th><th>집행내역</th><th>업체</th><th>증빙</th>${edit ? '<th></th>' : ''}</tr></thead><tbody>
        ${rows.map(e => `<tr><td class="mono small">${e.date}</td><td class="mono small">${e.y}</td><td>${e.item}</td><td class="num">${num(e.amt)}</td><td>${esc(e.desc)}</td><td class="small">${esc(e.vendor || '')}</td><td class="small">${e.file ? `<a href="javascript:void 0" data-file>${esc(e.file)}</a>` : '<span class="muted">-</span>'}</td>${edit ? `<td class="nowrap"><button class="btn sm" data-ex="${e.id}">수정</button></td>` : ''}</tr>`).join('') || '<tr><td colspan="8" class="empty">집행 내역이 없습니다.</td></tr>'}
        </tbody></table></div></div>`;
    A.$('#ex-y', host).onchange = e => { f.y = e.target.value; R.exec(p, host, edit); };
    A.$('#ex-i', host).onchange = e => { f.item = e.target.value; R.exec(p, host, edit); };
    A.$$('[data-file]', host).forEach(a => (a.onclick = () => A.toast('프로토타입: 첨부파일 다운로드는 시연에서 생략됩니다.')));
    A.$('#ex-xls', host).onclick = () => A.downloadCSV(`집행내역_${p.id}`, ['집행일', '연도', '항목', '금액', '집행내역', '업체'], rows.map(e => [e.date, e.y, e.item, e.amt, e.desc, e.vendor]), ['합계', '', '', rows.reduce((s, e) => s + e.amt, 0), '', '']);
    const exModal = e => {
      const isNew = !e; e = e || { date: U.today(), y: new Date().getFullYear(), item: '인건비', amt: '', desc: '', vendor: p.contract.vendor, file: '' };
      const md = A.modal({ title: isNew ? '집행금액 등록' : '집행 내역 수정', body: `<div class="form" style="grid-template-columns:1fr 1fr">
        <div class="f req"><label>집행일</label><input type="date" id="e-date" value="${e.date}"></div>
        <div class="f req"><label>회계연도</label><input id="e-y" inputmode="numeric" value="${e.y}"></div>
        <div class="f req"><label>집행항목</label><select id="e-item">${A.opts(items, e.item, null)}</select></div>
        <div class="f req"><label>집행금액(원)</label><input class="money num" id="e-amt" value="${money(e.amt)}"></div>
        <div class="f req span2"><label>집행내역</label><input id="e-desc" value="${esc(e.desc)}" placeholder="예) 2026년 2차 기성"></div>
        <div class="f span2"><label>증빙자료</label><input type="file" id="e-file"><span class="hint">${esc(e.file || '')}</span></div>
        <div class="f span2"><label>집행 후 잔액</label><div class="calc" id="e-calc"></div></div></div>`,
        foot: `${isNew ? '' : '<button class="btn danger" id="e-del">삭제</button><span class="sp"></span>'}<button class="btn" data-close>취소</button><button class="btn pri" id="e-ok">저장</button>` });
      bindMoney(md.el);
      const calc = () => { const v = unmoney(md.$('#e-amt').value) || 0; md.$('#e-calc').innerHTML = `${num(ca - total + (isNew ? 0 : e.amt) - v)}원<small>계약금액 − 집행합계</small>`; };
      md.$('#e-amt').addEventListener('input', calc); calc();
      md.$('#e-ok').onclick = () => {
        const o = { date: md.$('#e-date').value, y: +md.$('#e-y').value, item: md.$('#e-item').value, amt: unmoney(md.$('#e-amt').value), desc: md.$('#e-desc').value.trim() };
        const fl = md.$('#e-file').files[0]; if (fl) o.file = fl.name;
        if (!o.date || !o.y || !o.amt || !o.desc) { A.toast('필수 항목(*)을 입력하세요.', 'bad'); return; }
        if (isNew) { p.execs.push({ id: 'E' + String(A.db.seq.ex++).padStart(4, '0'), vendor: p.contract.vendor, file: '', ...o }); A.hist(p.id, '예산집행', `${o.item} 집행 등록`, '', `${o.date} ${num(o.amt)}원`); }
        else { const b = `${e.item} ${num(e.amt)}원`; Object.assign(e, o); A.hist(p.id, '예산집행', `${o.item} 집행 수정`, b, `${o.item} ${num(o.amt)}원`); }
        A.save(); md.close(); A.toast('저장했습니다. 변경 이력에 자동 기록됩니다.', 'ok'); refresh();
      };
      md.$('#e-del') && (md.$('#e-del').onclick = async () => { if (!(await A.confirm('이 집행 내역을 삭제할까요? 삭제 이력이 기록됩니다.', { danger: true, ok: '삭제' }))) return; p.execs = p.execs.filter(x => x !== e); A.hist(p.id, '예산집행', `${e.item} 집행 삭제`, `${e.date} ${num(e.amt)}원`, '삭제'); A.save(); md.close(); refresh(); });
    };
    A.$('#ex-add', host) && (A.$('#ex-add', host).onclick = () => exModal());
    A.$$('[data-ex]', host).forEach(b => (b.onclick = () => exModal(p.execs.find(e => e.id === b.dataset.ex))));
    A.$('#bc-req', host) && (A.$('#bc-req', host).onclick = () => A.budgetModal(p, refresh));
  };

  A.budgetModal = (p, done) => {
    const m = A.modal({ title: '예산변경 요청', body: `<div class="form" style="grid-template-columns:1fr 1fr">
      <div class="f"><label>사업</label><div class="ro small">${p.id} ${esc(p.name)}</div></div><div class="f"><label>결재선</label><div class="ro small">${A.resolveLine(p.id, A.me().id).map(s => A.uname(s.uid)).join(' → ')}</div></div>
      <div class="f"><label>변경 전 계약금액</label><div class="ro mono">${won(p.contractAmt)}</div></div>
      <div class="f req"><label>변경 후 계약금액(원)</label><input class="money num" id="g-amt" value="${money(p.contractAmt)}"></div>
      <div class="f span2"><label>증감</label><div class="calc" id="g-calc">-</div></div>
      <div class="f req span2"><label>변경 사유</label><textarea id="g-reason" placeholder="예) 수원국 요청에 따른 과업 범위 확대"></textarea></div>
      <div class="f span2"><label>관련 문서</label><input type="file" id="g-file" multiple></div></div>`,
      foot: `<button class="btn" data-close>취소</button><button class="btn pri" id="g-ok">결재 상신</button>` });
    bindMoney(m.el);
    const calc = () => { const v = unmoney(m.$('#g-amt').value) || 0; const d = v - p.contractAmt; m.$('#g-calc').innerHTML = `${d >= 0 ? '+' : ''}${num(d)}원 (${pct((d / p.contractAmt) * 100, 2)})<small>낙찰률 ${pct((v / (p.orderAmt || v)) * 100, 2)}</small>`; };
    m.$('#g-amt').addEventListener('input', calc); calc();
    m.$('#g-ok').onclick = () => {
      const v = unmoney(m.$('#g-amt').value), reason = m.$('#g-reason').value.trim();
      if (!v || v === p.contractAmt) { A.toast('변경 후 금액을 입력하세요.', 'bad'); return; }
      if (!reason) { m.$('#g-reason').closest('.f').classList.add('err'); A.toast('변경 사유는 필수입니다.', 'bad'); return; }
      const ap = A.submit({ type: 'BUDGET', pid: p.id, title: `계약금액 ${v > p.contractAmt ? '증액' : '감액'}(예산변경)`, note: reason, attach: [...m.$('#g-file').files].map(f => f.name), changes: [{ path: 'contractAmt', label: '계약금액', bv: p.contractAmt, av: v, b: won(p.contractAmt), a: won(v) }] });
      m.close(); A.toast(`예산변경 결재 상신 (${ap.id}) — 승인 시 계약금액에 자동 반영됩니다.`, 'ok'); done && done();
    };
  };

  R.surplus = (p, host, edit) => {
    const sur = A.surplusOf(p);
    if (sur == null) { host.innerHTML = `<div class="card"><div class="empty">발주금액과 계약금액이 확정되면 낙찰차액이 자동 산출됩니다.</div></div>`; return; }
    const plan = p.surplus.map(x => ({ ...x }));
    host.innerHTML = `
      <div class="kpis">
        <div class="kpi"><span class="k">발주금액</span><span class="v mono" style="font-size:19px">${num(p.orderAmt)}</span></div>
        <div class="kpi"><span class="k">계약금액</span><span class="v mono" style="font-size:19px">${num(p.contractAmt)}</span></div>
        <div class="kpi"><span class="k">낙찰차액 (발주 − 계약)</span><span class="v mono" style="font-size:19px">${num(sur)}</span><span class="d">낙찰률 ${pct(A.rateOf(p), 2)}</span></div>
        <div class="kpi" id="k-rem"><span class="k">잔여 낙찰차액</span><span class="v mono" style="font-size:19px">-</span></div>
      </div>
      <div class="g-7-5">
        <div class="card"><div class="hd"><h3>낙찰차액 활용계획</h3><div class="row"><span class="note">비율 입력 시 금액 자동 계산</span>${edit ? '<button class="btn sm" id="s-add">항목 추가</button><button class="btn sm pri" id="s-save">저장</button>' : ''}<button class="btn sm" id="s-xls">${A.ICON.dl}엑셀</button></div></div>
          <div class="tw"><table class="tbl"><thead><tr><th>활용 항목</th><th class="num" style="width:90px">비율(%)</th><th class="num">계획 금액</th><th class="num" style="width:150px">집행 실적</th><th class="num">실적률</th><th>활용 사유</th>${edit ? '<th></th>' : ''}</tr></thead><tbody id="s-rows"></tbody><tfoot id="s-foot"></tfoot></table></div></div>
        <div class="card"><div class="hd"><h3>계획 대비 실적</h3><div class="legend"><span><i style="background:${A.sc(0)}"></i>계획</span><span><i style="background:${A.sc(1)}"></i>실적</span></div></div><div class="bd"><div class="chart short" id="s-ch" role="img" aria-label="낙찰차액 활용 계획 대비 실적"></div></div></div>
      </div>`;
    const draw = () => {
      plan.forEach(x => (x.amt = Math.round((sur * (+x.ratio || 0)) / 100)));
      const tr = plan.reduce((s, x) => s + (+x.ratio || 0), 0), ta = plan.reduce((s, x) => s + x.amt, 0), tact = plan.reduce((s, x) => s + (+x.actual || 0), 0);
      A.$('#s-rows', host).innerHTML = plan.map((x, i) => edit ? `<tr><td><select data-i="${i}" data-f="item">${A.opts(A.code('surplusItem'), x.item, null)}</select></td><td><input class="num" data-i="${i}" data-f="ratio" value="${x.ratio}"></td><td class="num">${num(x.amt)}</td><td><input class="num money" data-i="${i}" data-f="actual" value="${money(x.actual)}"></td><td class="num">${pct(x.amt ? ((+x.actual || 0) / x.amt) * 100 : 0)}</td><td><input data-i="${i}" data-f="reason" value="${esc(x.reason)}"></td><td><button class="btn sm ghost" data-rm="${i}" aria-label="삭제">×</button></td></tr>`
        : `<tr><td class="ink">${esc(x.item)}</td><td class="num">${x.ratio}</td><td class="num">${num(x.amt)}</td><td class="num">${num(x.actual)}</td><td class="num">${pct(x.amt ? (x.actual / x.amt) * 100 : 0)}</td><td>${esc(x.reason)}</td></tr>`).join('') || `<tr><td colspan="7" class="empty">활용계획이 없습니다.${edit ? ' 항목을 추가하세요.' : ''}</td></tr>`;
      A.$('#s-foot', host).innerHTML = `<tr><td>합계</td><td class="num" style="${tr > 100 ? 'color:var(--bad)' : ''}">${tr}%</td><td class="num">${num(ta)}</td><td class="num">${num(tact)}</td><td class="num">${pct(ta ? (tact / ta) * 100 : 0)}</td><td colspan="2">${tr > 100 ? '<span class="b bad">비율 합계가 100%를 초과합니다</span>' : ''}</td></tr>`;
      A.$('#k-rem', host).innerHTML = `<span class="k">잔여 낙찰차액 (자동계산)</span><span class="v mono" style="font-size:19px">${num(sur - ta)}</span><span class="d">미활용 ${pct(((sur - ta) / sur) * 100)} · 실적 기준 ${num(sur - tact)}</span>`;
      A.$$('#s-rows [data-f]', host).forEach(el => (el.onchange = () => { const x = plan[+el.dataset.i]; x[el.dataset.f] = el.dataset.f === 'actual' ? unmoney(el.value) || 0 : el.dataset.f === 'ratio' ? +el.value || 0 : el.value; draw(); }));
      bindMoney(host);
      A.$$('[data-rm]', host).forEach(b => (b.onclick = () => { plan.splice(+b.dataset.rm, 1); draw(); }));
      A._charts.forEach(c => c.dispose()); A._charts = [];
      A.chart(A.$('#s-ch', host), {
        grid: { left: 8, right: 8, top: 10, bottom: 4, containLabel: true }, tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: v => num(v) + '원' },
        xAxis: { type: 'category', data: plan.map(x => x.item), ...A.axis({ splitLine: { show: false } }) }, yAxis: { type: 'value', ...A.axis({ axisLabel: { color: A.cv('--muted'), formatter: v => (v / 1e6).toFixed(0) + '백만' } }) },
        series: [A.bar({ name: '계획', data: plan.map(x => x.amt), itemStyle: { color: A.sc(0), borderRadius: [4, 4, 0, 0] } }), A.bar({ name: '실적', data: plan.map(x => +x.actual || 0), itemStyle: { color: A.sc(1), borderRadius: [4, 4, 0, 0] } })],
      });
    };
    draw();
    A.$('#s-add', host) && (A.$('#s-add', host).onclick = () => { plan.push({ item: '예비비', ratio: 0, amt: 0, actual: 0, reason: '' }); draw(); });
    A.$('#s-save', host) && (A.$('#s-save', host).onclick = () => {
      if (plan.reduce((s, x) => s + (+x.ratio || 0), 0) > 100) { A.toast('비율 합계는 100%를 넘을 수 없습니다.', 'bad'); return; }
      const sum = arr => arr.map(x => `${x.item} ${x.ratio}%`).join(', ') || '-';
      A.hist(p.id, '낙찰차액', '활용계획', sum(p.surplus), sum(plan));
      p.surplus = plan.map(x => ({ item: x.item, ratio: +x.ratio || 0, amt: x.amt, actual: +x.actual || 0, reason: x.reason }));
      A.save(); A.toast('낙찰차액 활용계획을 저장했습니다. 변경 이력에 기록됩니다.', 'ok'); refresh();
    });
    A.$('#s-xls', host).onclick = () => A.downloadCSV(`낙찰차액활용_${p.id}`, ['활용항목', '비율(%)', '계획금액', '집행실적', '활용사유'], plan.map(x => [x.item, x.ratio, x.amt, x.actual, x.reason]), ['합계', plan.reduce((s, x) => s + (+x.ratio || 0), 0), plan.reduce((s, x) => s + x.amt, 0), plan.reduce((s, x) => s + (+x.actual || 0), 0), `잔여 ${sur - plan.reduce((s, x) => s + x.amt, 0)}`]);
  };

  R.docs = (p, host, edit) => {
    const f = (A.state.dc = A.state.dc && A.state.dc.pid === p.id ? A.state.dc : { pid: p.id, stage: '', type: '' });
    const rows = p.docs.filter(d => (!f.stage || d.stage === f.stage) && (!f.type || d.type === f.type)).sort((a, b) => (a.at < b.at ? 1 : -1));
    host.innerHTML = `<div class="card"><div class="hd"><h3>사업 문서</h3><div class="row">
      <select class="btn sm" id="d-st">${A.opts(K.STAGES.map(s => [s.k, s.n]), f.stage, '전체 단계')}</select><select class="btn sm" id="d-ty">${A.opts(A.uniq(p.docs, 'type'), f.type, '전체 유형')}</select>
      <button class="btn sm" id="d-all">${A.ICON.dl}일괄 다운로드</button>${edit ? `<button class="btn sm pri" id="d-up">${A.ICON.up}문서 등록</button>` : ''}</div></div>
      <div class="tw"><table class="tbl"><thead><tr><th>문서유형</th><th>파일명</th><th>단계</th><th class="num">크기</th><th>홈페이지 공개</th><th>등록자</th><th>등록일</th><th>수정일</th><th></th></tr></thead><tbody>
      ${rows.map(d => `<tr><td class="nowrap">${esc(d.type)}</td><td class="ink">${esc(d.name)}</td><td class="nowrap">${K.stageName(d.stage)}</td><td class="num small">${A.size(d.size)}</td><td>${edit ? `<label class="row small"><input type="checkbox" data-pub="${d.id}" ${d.pub ? 'checked' : ''}>${d.pub ? '공개' : '비공개'}</label>` : d.pub ? '<span class="b info">공개</span>' : '<span class="muted small">비공개</span>'}</td><td class="nowrap">${A.uname(d.by)}</td><td class="mono small nowrap">${d.at}</td><td class="mono small nowrap">${d.mod || '-'}</td><td class="nowrap"><button class="btn sm" data-dl="${d.id}">다운로드</button></td></tr>`).join('') || '<tr><td colspan="9" class="empty">등록된 문서가 없습니다.</td></tr>'}
      </tbody></table></div></div>
      <div class="notice info"><span>ⓘ</span><span class="grow">공개로 지정한 산출물(최종보고서·요약보고서 등)은 홈페이지 <b>사업산출물</b> 메뉴에 자동 연계됩니다. 등록자·등록일·수정일은 자동 기록됩니다.</span></div>`;
    A.$('#d-st', host).onchange = e => { f.stage = e.target.value; R.docs(p, host, edit); };
    A.$('#d-ty', host).onchange = e => { f.type = e.target.value; R.docs(p, host, edit); };
    A.$('#d-all', host).onclick = () => A.toast(`프로토타입: ${rows.length}개 문서 일괄 다운로드(ZIP)는 본 구축 시 제공됩니다.`);
    A.$$('[data-dl]', host).forEach(b => (b.onclick = () => { A.log('기능', '문서 다운로드', p.id); A.toast('프로토타입: 파일 다운로드는 시연에서 생략됩니다. (다운로드 로그 기록됨)'); }));
    A.$$('[data-pub]', host).forEach(c => (c.onchange = () => { const d = p.docs.find(x => x.id === c.dataset.pub); d.pub = c.checked; d.mod = U.nowStamp(); A.hist(p.id, '문서', `${d.type} 공개여부`, c.checked ? '비공개' : '공개', c.checked ? '공개' : '비공개'); A.save(); R.docs(p, host, edit); }));
    A.$('#d-up', host) && (A.$('#d-up', host).onclick = () => {
      const m = A.modal({ title: '문서 등록', body: `<div class="form" style="grid-template-columns:1fr 1fr">
        <div class="f req"><label>문서유형</label><select id="u-type">${A.opts(A.code('docType'), '', '선택')}</select></div>
        <div class="f req"><label>사업단계</label><select id="u-stage">${A.opts(K.STAGES.map(s => [s.k, s.n]), p.stage, null)}</select></div>
        <div class="f req span2"><label>파일</label><input type="file" id="u-file" multiple></div>
        <div class="f span2"><label class="row"><input type="checkbox" id="u-pub">홈페이지 공개 산출물로 지정</label></div></div>`,
        foot: `<button class="btn" data-close>취소</button><button class="btn pri" id="u-ok">등록</button>` });
      m.$('#u-ok').onclick = () => {
        const type = m.$('#u-type').value, files = [...m.$('#u-file').files];
        if (!type || !files.length) { A.toast('문서유형과 파일을 선택하세요.', 'bad'); return; }
        files.forEach(fl => { p.docs.push({ id: 'D' + String(A.db.seq.doc++).padStart(4, '0'), type, stage: m.$('#u-stage').value, name: fl.name, size: fl.size, by: A.me().id, at: U.nowStamp(), mod: null, pub: m.$('#u-pub').checked }); A.hist(p.id, '문서', type, '', `등록: ${fl.name}`); });
        A.save(); m.close(); A.toast(`${files.length}개 문서를 등록했습니다.`, 'ok'); refresh();
      };
    });
  };

  const LV = { Impact: ['목표', 'Impact'], Outcome: ['성과', 'Outcome'], Output: ['산출물', 'Output'] };
  const VER = [['제안 PDM', '공모 제안서'], ['수정 PDM', '고도화'], ['확정 PDM', '계약 후 · 결재 승인'], ['종료', '종료선 조사']];
  const sym = v => (v === '●' ? '<span class="b ok"><span class="ic">●</span>유지</span>' : v === '◐' ? '<span class="b warn"><span class="ic">◐</span>부분</span>' : v === '○' ? '<span class="b bad"><span class="ic">○</span>미흡</span>' : esc(v));
  const trBadge = r => (r.status === '제출' ? '<span class="b ok"><span class="ic">✓</span>제출</span>' : r.status === '미제출' ? '<span class="b bad"><span class="ic">▲</span>미제출</span>' : r.status === '면제' ? '<span class="b mute">면제</span>' : `<span class="b ${U.diffD(U.today(), r.due) <= 120 ? 'warn' : 'mute'}">예정 D-${U.diffD(U.today(), r.due)}</span>`);

  R.perf = (p, host, edit) => {
    const pf = p.perf;
    const canPdm = edit && !['REJECTED'].includes(p.stage);
    const pdmPend = A.db.approvals.find(a => a.pid === p.id && a.type === 'PDM' && a.status === 'PENDING');
    if (!pf) {
      host.innerHTML = `<div class="card"><div class="empty">${pdmPend ? `PDM 등록 결재가 진행중입니다 (${pdmPend.id}).<br><button class="btn sm" id="pp">결재 문서 보기</button>` : `등록된 성과관리 계획(PDM)이 없습니다.<br><span class="small">PDM은 공모 제안서(제안) → 고도화(수정) → 계약 후 결재 승인(확정) → 종료선 조사(종료) 순으로 관리합니다.</span>${canPdm ? '<br><br><button class="btn pri" id="pdm-new">PDM 등록</button>' : ''}`}</div></div>`;
      A.$('#pdm-new', host) && (A.$('#pdm-new', host).onclick = () => pdmModal(p));
      A.$('#pp', host) && (A.$('#pp', host).onclick = () => A.openApproval(pdmPend.id));
      return;
    }
    const closed = ['CLOSED', 'FOLLOWUP'].includes(p.stage);
    const have = Object.fromEntries(pf.versions.map(v => [v.v, v]));
    const st = (A.state.pdmv = A.state.pdmv && A.state.pdmv.pid === p.id ? A.state.pdmv : { pid: p.id, v: pf.versions[pf.versions.length - 1].v });
    const showEnd = st.v === '종료';
    const tgt = i => (st.v === '제안 PDM' && i.targets && i.targets['제안 PDM'] != null ? i.targets['제안 PDM'] : i.target);
    const missing = pf.indicators.filter(i => !i.baseDoc);
    let lastLv = null;
    const rows = pf.indicators.map(i => {
      const first = i.level !== lastLv; lastLv = i.level;
      const a = A.achv({ ...i, target: tgt(i), end: showEnd ? i.end : null });
      const imp = i.level === 'Impact';
      const chg = st.v !== '제안 PDM' && i.targets && i.targets['제안 PDM'] != null && i.targets['제안 PDM'] !== i.target;
      return `<tr class="${first ? 'lvtop' : ''}"><td class="lvl">${first ? `<b>${LV[i.level][0]}</b><small>${LV[i.level][1]}</small>` : ''}</td><td>${esc(i.narr || '')}</td><td class="ink">${esc(i.name)} <span class="muted small">(${esc(i.unit)})</span></td><td class="num">${i.base}</td><td class="num">${tgt(i)}${chg ? `<div class="small" style="color:var(--accentText)">← ${i.targets['제안 PDM']} (제안)</div>` : ''}</td>
        <td class="num">${imp ? '<span class="muted small">추적조사</span>' : showEnd ? (i.end ?? '-') : '-'}</td><td class="num">${!imp && showEnd && a.r != null ? pct(a.r, 0) : '-'}</td><td>${imp ? '<span class="muted small">종료 후 매년 2월</span>' : showEnd ? A.achvBadge(a) : '<span class="muted small">-</span>'}</td>
        <td class="small">${esc(i.mov)}<div>기초선 ${i.baseDoc ? '✓' : '<span style="color:var(--bad)">보고서 없음 ⚠</span>'}${closed ? ` · 종료선 ${i.endDoc ? '✓' : '-'}` : ''}</div></td><td class="small">${esc(i.assume || '')}</td></tr>`;
    }).join('');
    const tp = A.trackPlan(p);
    const subm = tp.filter(r => r.t && r.status === '제출');
    const openRound = tp.find(r => ['미제출', '예정'].includes(r.status) && r.due <= `${new Date().getFullYear() + 1}-02-28`);
    const ev = pf.eval;
    const avg = ev ? ev.items.reduce((s, x) => s + x.s, 0) / ev.items.length : 0;
    const grade = avg >= 3.5 ? '매우 성공적' : avg >= 2.5 ? '성공적' : avg >= 1.5 ? '다소 미흡' : '미흡';
    host.innerHTML = `
      ${missing.length ? `<div class="notice warn"><span>⚠</span><span class="grow"><b>근거 없는 성과 값 ${missing.length}건</b> — ${missing.map(i => esc(i.name)).join(', ')}: 기초선 조사보고서가 첨부되지 않았습니다. 지표 값마다 수집 방법·조사보고서 첨부 여부를 확인합니다 <span class="tag">♥ 추가 제안</span></span></div>` : ''}
      <div class="card"><div class="hd"><h3>성과관리 계획서 (PDM)</h3><div class="row">${canPdm ? `<button class="btn sm" id="pdm-edit">PDM ${p.contract ? '수정' : '보완'}</button>` : ''}${edit && closed ? `<button class="btn sm" id="end-reg">종료선 조사 ${pf.endline ? '수정' : '등록'}</button>` : ''}</div></div>
        <div class="bd stack" style="gap:10px">
          <div class="pdmv">${VER.map(([v, src], k) => `${k ? '<i>›</i>' : ''}<button data-pv="${v}" class="${st.v === v ? 'on' : ''}" ${have[v] ? '' : 'disabled'}>${v}<small>${have[v] ? `${src} · ${have[v].at}` : p.migrated && k < 2 ? '이관 자료 없음' : '예정'}</small></button>`).join('')}</div>
          <div><span class="small muted">사업목표</span> <b class="ink">${esc(pf.goal)}</b></div>
        </div>
        <div class="tw"><table class="tbl pdm"><thead><tr><th>수준</th><th>정의<small>Narrative</small></th><th>지표<small>OVI</small></th><th class="num">기초선</th><th class="num">목표</th><th class="num">종료선</th><th class="num">달성률</th><th>상태</th><th>검증수단 · 조사보고서<small>MoV</small></th><th>가정<small>Assumptions</small></th></tr></thead><tbody>
          ${rows}
          <tr class="lvtop"><td class="lvl"><b>활동</b><small>Activities</small></td><td>${esc(pf.act || '')}</td><td class="muted small">(산출물 지표로 확인)</td><td></td><td></td><td></td><td></td><td></td><td class="small">월간공정보고서</td><td></td></tr>
          <tr class="lvtop"><td class="lvl"><b>투입</b><small>Inputs</small></td><td>사업비 · 전문가 파견</td><td class="ink">${p.contractAmt ? `계약금액 ${eok(p.contractAmt)}원` : `제안 사업비 ${eok(p.planAmt)}원`} <span class="tag">♥ 자동 연결</span></td><td></td><td></td><td></td><td></td><td></td><td class="small">입찰·계약 탭 값 자동 연결</td><td></td></tr>
        </tbody></table></div>
        <div class="bd small muted" style="padding-top:8px">PDM 양식: 정의 · 지표(OVI) · 검증수단(MoV) · 가정 4열 × 목표 · 성과 · 산출물 · 활동 · 투입 5단. 버전은 제안 → 수정(고도화) → 확정(계약 후 결재) → 종료 순으로 보관하고 성과평가는 확정 PDM 기준으로 비교합니다. 달성률 = (종료선 − 기초선) ÷ (목표 − 기초선).</div></div>
      <div class="grid2">
        <div class="card"><div class="hd"><h3>기초선 조사</h3></div>${pf.baseline ? `<dl class="dl" style="margin:0;grid-template-columns:repeat(2,minmax(0,1fr))">${kv('조사일', `<span class="mono">${pf.baseline.date}</span>`)}${kv('조사기관', esc(pf.baseline.agency))}${kv('주요 내용', esc(pf.baseline.summary), 'w4')}${kv('첨부', `<a href="javascript:void 0" data-f>${esc(pf.baseline.file || pf.file)}</a>`, 'w4')}</dl>` : '<div class="empty">계약 후 착수 시점에 기초선 조사를 등록합니다.</div>'}</div>
        <div class="card"><div class="hd"><h3>종료선 조사</h3><span class="note">기초선 목표값 대비 실적 비교</span></div>${pf.endline ? `<dl class="dl" style="margin:0;grid-template-columns:repeat(2,minmax(0,1fr))">${kv('조사일', `<span class="mono">${pf.endline.date}</span>`)}${kv('조사기관', esc(pf.endline.agency))}${kv('주요 내용', esc(pf.endline.summary), 'w4')}${kv('첨부', `<a href="javascript:void 0" data-f>${esc(pf.endline.file || '')}</a>`, 'w4')}</dl>` : '<div class="empty">사업 종료 후 등록합니다.</div>'}</div>
      </div>
      <div class="card"><div class="hd"><h3>추적조사 <span class="muted small">종료 후 매년 2월 · ${esc(p.type)} ${K.TRACK(p.type)}년 · 성과관리 지침 제26조</span></h3>${edit && openRound ? `<button class="btn sm pri" id="tr-add">${openRound.round}차 보고 등록</button>` : ''}</div>
        ${tp.length ? `<div class="tw"><table class="tbl"><thead><tr><th class="c">차수</th><th>보고 기한</th><th>상태</th><th>제출일</th><th>작성 (수행기관)</th><th>주요 내용 · 면제 사유</th><th>보고서</th></tr></thead><tbody>
          ${tp.map(r => `<tr><td class="c mono nowrap">${r.round}차</td><td class="mono small">${r.due}</td><td>${trBadge(r)}</td><td class="mono small">${r.t && r.t.date ? r.t.date : '-'}</td><td class="small">${r.t && r.t.agency ? esc(r.t.agency) : '-'}</td><td class="small" style="min-width:220px">${r.t ? esc(r.t.summary || r.t.exemptReason || '') : ''}</td><td>${r.t && r.t.file ? `<a href="javascript:void 0" data-f class="small">${esc(r.t.file)}</a>` : '-'}</td></tr>`).join('')}
        </tbody></table></div>
        ${subm.length ? `<div class="tw"><table class="tbl"><thead><tr><th>표준 항목 (제안요청서 기대효과)</th>${subm.map(r => `<th>${r.round}차 ’${String(r.due).slice(2, 4)}.2</th>`).join('')}</tr></thead><tbody>
          ${K.TRACK_ITEMS.map(([k, n, ref]) => `<tr><td class="ink">${n}${ref ? ` <span class="tagx fact">${ref}</span>` : ''}</td>${subm.map(r => `<td>${k === 'orders' ? `${r.t.items.orders}건` : k === 'side' ? esc(r.t.items.side) : sym(r.t.items[k])}</td>`).join('')}</tr>`).join('')}
        </tbody></table></div>` : ''}` : `<div class="empty">${p.endYear < 2023 && closed ? '2022년 이전 종료 사업 — 추적조사 적용 여부 확인 필요' : '사업 종료 후 매년 2월 추적조사 보고서를 차수별로 등록합니다.'}</div>`}</div>
      <div class="card"><div class="hd"><h3>자체평가</h3><div class="row">${ev ? `<span class="note">${ev.date} · ${A.uname(ev.by)}</span>` : ''}${edit && closed ? `<button class="btn sm" id="ev-edit">${ev ? '수정' : '자체평가 등록'}</button>` : ''}</div></div>
        ${ev ? `<div class="bd"><div class="g-7-5"><table class="tbl"><thead><tr><th>평가항목 (OECD DAC)</th><th class="num">점수(4점)</th><th style="width:45%"></th></tr></thead><tbody>${ev.items.map(x => `<tr><td class="ink">${x.n}</td><td class="num">${x.s}</td><td><div class="prog"><i style="width:${(x.s / 4) * 100}%"></i></div></td></tr>`).join('')}</tbody><tfoot><tr><td>평균 · 종합등급</td><td class="num">${avg.toFixed(2)}</td><td>${grade}</td></tr></tfoot></table>
          <div><div class="small muted">종합 의견</div><p class="ink" style="margin:4px 0 0;line-height:1.7">${esc(ev.opinion)}</p></div></div></div>` : `<div class="empty">${closed ? '자체평가 결과가 없습니다.' : '사업 종료 후 자체평가를 입력합니다.'}</div>`}</div>`;
    A.$$('[data-f]', host).forEach(a => (a.onclick = () => A.toast('프로토타입: 첨부파일 다운로드는 시연에서 생략됩니다.')));
    A.$$('[data-pv]', host).forEach(b => (b.onclick = () => { st.v = b.dataset.pv; R.perf(p, host, edit); }));
    A.$('#pdm-edit', host) && (A.$('#pdm-edit', host).onclick = () => pdmModal(p));
    A.$('#end-reg', host) && (A.$('#end-reg', host).onclick = () => endModal(p));
    A.$('#tr-add', host) && (A.$('#tr-add', host).onclick = () => trackModal(p, openRound));
    A.$('#ev-edit', host) && (A.$('#ev-edit', host).onclick = () => evalModal(p));
  };
  function pdmModal(p) {
    const lib = K.PDM_LIB[p.field] || K.PDM_LIB['기타'];
    const tpl = p.perf ? JSON.parse(JSON.stringify(p.perf)) : { goal: `${p.country} ${lib.goal}`, act: lib.act, versions: [], indicators: [], baseline: null, endline: null, tracking: [], eval: null, file: '' };
    const ver = p.contract ? '확정 PDM' : p.perf ? '수정 PDM' : '제안 PDM';
    const m = A.modal({ title: `PDM ${p.perf ? '수정' : '등록'} — ${ver}`, cls: 'xwide', body: `
      <div class="form"><div class="f req span3"><label>사업목표</label><input id="g-goal" value="${esc(tpl.goal)}"></div><div class="f"><label>저장 버전</label><div class="ro">${ver}</div></div><div class="f span4"><label>활동 (Activities)</label><input id="g-act" value="${esc(tpl.act || '')}"></div></div>
      <div class="row"><span class="small muted">지표 라이브러리 <span class="tag">♥</span></span><select class="btn sm" id="g-libf">${A.opts(Object.keys(K.PDM_LIB), p.field, null)}</select><select class="btn sm" id="g-lib"></select><button class="btn sm" id="g-libadd">라이브러리 지표 추가</button><span class="sp"></span><button class="btn sm" id="g-add">빈 지표 추가</button></div>
      <div class="tw"><table class="tbl"><thead><tr><th style="width:100px">수준</th><th>정의</th><th>지표</th><th style="width:64px">단위</th><th style="width:76px" class="num">기초선</th><th style="width:76px" class="num">목표</th><th>검증수단</th><th>가정</th><th></th></tr></thead><tbody id="g-rows"></tbody></table></div>`,
      foot: `<span class="small muted">결재 상신 후 승인되면 ${ver} 버전으로 보관됩니다</span><span class="sp"></span><button class="btn" data-close>취소</button><button class="btn pri" id="g-ok">결재 상신</button>` });
    const libOpts = () => { const L2 = K.PDM_LIB[m.$('#g-libf').value]; m.$('#g-lib').innerHTML = L2.rows.map((r, i) => `<option value="${i}">[${r.level}] ${esc(r.name)}</option>`).join(''); };
    libOpts(); m.$('#g-libf').onchange = libOpts;
    const rows = () => {
      m.$('#g-rows').innerHTML = tpl.indicators.map((x, i) => `<tr><td><select data-i="${i}" data-f="level">${A.opts(['Impact', 'Outcome', 'Output'], x.level, null)}</select></td>${['narr', 'name', 'unit', 'base', 'target', 'mov', 'assume'].map(f => `<td><input ${['base', 'target'].includes(f) ? 'class="num"' : ''} data-i="${i}" data-f="${f}" value="${esc(x[f] ?? '')}"></td>`).join('')}<td><button class="btn sm ghost" data-rm="${i}" aria-label="삭제">×</button></td></tr>`).join('');
      m.$$('#g-rows [data-f]').forEach(el => (el.onchange = () => { tpl.indicators[+el.dataset.i][el.dataset.f] = ['base', 'target'].includes(el.dataset.f) ? +el.value : el.value; }));
      m.$$('[data-rm]').forEach(b => (b.onclick = () => { tpl.indicators.splice(+b.dataset.rm, 1); rows(); }));
    };
    rows();
    m.$('#g-add').onclick = () => { tpl.indicators.push({ id: 'I' + (tpl.indicators.length + 1), level: 'Output', narr: '', name: '', unit: '', base: 0, target: 0, mov: '', assume: '', end: null, baseDoc: false, endDoc: false }); rows(); };
    m.$('#g-libadd').onclick = () => { const r = K.PDM_LIB[m.$('#g-libf').value].rows[+m.$('#g-lib').value]; tpl.indicators.push({ id: 'I' + (tpl.indicators.length + 1), ...JSON.parse(JSON.stringify(r)), end: null, baseDoc: false, endDoc: false }); rows(); A.toast('라이브러리 지표를 추가했습니다. 기초선·목표값을 사업에 맞게 조정하세요.'); };
    m.$('#g-ok').onclick = () => {
      tpl.goal = m.$('#g-goal').value.trim(); tpl.act = m.$('#g-act').value.trim();
      if (!tpl.goal || !tpl.indicators.length || tpl.indicators.some(i => !i.name || !i.unit)) { A.toast('사업목표와 지표명·단위를 입력하세요.', 'bad'); return; }
      tpl.versions = [...(tpl.versions || []).filter(v => v.v !== ver), { v: ver, src: VER.find(x => x[0] === ver)[1], at: U.today() }];
      tpl.confirmed = ver === '확정 PDM';
      const old = p.perf ? Object.fromEntries(p.perf.indicators.map(i => [i.name, i])) : {};
      const ap = A.submit({ type: 'PDM', pid: p.id, title: `PDM ${p.perf ? '수정' : '등록'} (${ver})`, payload: { pdm: tpl },
        changes: tpl.indicators.map(i => ({ path: 'perf', label: `[${i.level}] ${i.name}`, b: old[i.name] ? `기준 ${old[i.name].base} → 목표 ${old[i.name].target}${i.unit}` : '-', a: `기준 ${i.base} → 목표 ${i.target}${i.unit}` })) });
      m.close(); A.toast(`결재 상신 완료 (${ap.id})`, 'ok'); refresh();
    };
  }
  function endModal(p) {
    const pf = p.perf; const e = pf.endline || { date: U.today(), agency: '', summary: '', file: '' };
    const ms = pf.indicators.filter(i => i.level !== 'Impact');
    const m = A.modal({ title: '종료선 조사보고서 등록', cls: 'wide', body: `<div class="form"><div class="f req"><label>조사일</label><input type="date" id="n-d" value="${e.date}"></div><div class="f req span3"><label>조사기관</label><input id="n-a" value="${esc(e.agency)}"></div><div class="f req span4"><label>조사 결과 주요 내용</label><textarea id="n-s">${esc(e.summary)}</textarea></div><div class="f span4"><label>보고서 파일</label><input type="file" id="n-f"></div></div>
      <table class="tbl"><thead><tr><th>성과지표</th><th class="num">기초선</th><th class="num">목표</th><th class="num" style="width:120px">종료선 실적</th></tr></thead><tbody>${ms.map(i => `<tr><td>[${i.level}] ${esc(i.name)} (${esc(i.unit)})</td><td class="num">${i.base}</td><td class="num">${i.target}</td><td><input class="num" data-k="${i.id}" value="${i.end ?? ''}"></td></tr>`).join('')}</tbody></table>`,
      foot: `<button class="btn" data-close>취소</button><button class="btn pri" id="n-ok">저장</button>` });
    m.$('#n-ok').onclick = () => {
      const o = { date: m.$('#n-d').value, agency: m.$('#n-a').value.trim(), summary: m.$('#n-s').value.trim(), file: (m.$('#n-f').files[0] || {}).name || e.file };
      if (!o.date || !o.agency || !o.summary) { A.toast('필수 항목을 입력하세요.', 'bad'); return; }
      m.$$('[data-k]').forEach(inp => { const i = pf.indicators.find(x => x.id === inp.dataset.k); i.end = inp.value === '' ? null : +inp.value; i.endDoc = !!o.file; });
      A.hist(p.id, '성과', '종료선 조사', pf.endline ? pf.endline.date : '', `${o.date} ${o.agency}`);
      pf.endline = o; pf.versions = [...pf.versions.filter(v => v.v !== '종료'), { v: '종료', src: '종료선 조사', at: o.date }];
      A.save(); m.close(); A.toast('종료선 조사 결과를 저장했습니다.', 'ok'); refresh();
    };
  }
  function trackModal(p, r) {
    const pf = p.perf; const n = r.round;
    const sel = (k, arr) => `<select data-it="${k}">${A.opts(arr, arr[0], null)}</select>`;
    const m = A.modal({ title: `추적조사 ${n}차 보고 등록 — 보고 기한 ${r.due}`, cls: 'wide', body: `
      <div class="seg" id="t-mode"><button data-m="submit" class="on">보고서 제출</button><button data-m="exempt">면제 (센터 판단)</button></div>
      <div id="t-sub"><div class="form">
        <div class="f req"><label>조사기준일</label><input type="date" id="t-b" value="${r.due.slice(0, 4) - 1}-12-31"></div><div class="f req"><label>제출일</label><input type="date" id="t-d" value="${U.today()}"></div><div class="f req span2"><label>작성 (수행기관)</label><input id="t-a" value="${esc(p.implementer || '')}"></div></div>
        <table class="tbl" style="margin-top:10px"><thead><tr><th>표준 항목</th><th style="width:180px">결과</th></tr></thead><tbody>
        ${K.TRACK_ITEMS.map(([k, nm]) => `<tr><td>${nm}</td><td>${k === 'orders' ? '<input class="num" data-it="orders" value="0">' : k === 'side' ? sel('side', ['없음', '긍정 1', '부정 1']) : sel(k, ['●', '◐', '○', '-'])}</td></tr>`).join('')}</tbody></table>
        <div class="f req" style="margin-top:10px"><label>주요 내용 (성과 정착도 · 지원 필요사항)</label><textarea id="t-s"></textarea></div><div class="f"><label>보고서 파일</label><input type="file" id="t-f"></div>
        <div class="small muted">● 유지·양호 · ◐ 부분 · ○ 미흡 · - 해당 없음</div></div>
      <div id="t-ex" hidden><div class="f req"><label>면제 사유</label><textarea id="t-why" placeholder="예) 수원국 정세 불안으로 현지조사 불가"></textarea></div></div>`,
      foot: `<button class="btn" data-close>취소</button><button class="btn pri" id="t-ok">등록</button>` });
    let mode = 'submit';
    m.$$('#t-mode button').forEach(b => (b.onclick = () => { mode = b.dataset.m; m.$$('#t-mode button').forEach(x => x.classList.toggle('on', x === b)); m.$('#t-sub').hidden = mode !== 'submit'; m.$('#t-ex').hidden = mode === 'submit'; }));
    m.$('#t-ok').onclick = () => {
      let o;
      if (mode === 'exempt') { const why = m.$('#t-why').value.trim(); if (!why) { A.toast('면제 사유를 입력하세요.', 'bad'); return; } o = { round: n, due: r.due, status: '면제', exemptReason: why }; }
      else {
        const items = Object.fromEntries(m.$$('[data-it]').map(el => [el.dataset.it, el.dataset.it === 'orders' ? +el.value || 0 : el.value]));
        o = { round: n, due: r.due, status: '제출', date: m.$('#t-d').value, baseDate: m.$('#t-b').value, agency: m.$('#t-a').value.trim(), items, summary: m.$('#t-s').value.trim(), file: (m.$('#t-f').files[0] || {}).name || '' };
        if (!o.agency || !o.summary) { A.toast('작성기관과 주요 내용을 입력하세요.', 'bad'); return; }
      }
      const ex = pf.tracking.find(t => t.round === n);
      if (ex) { Object.keys(ex).forEach(k => k !== 'id' && delete ex[k]); Object.assign(ex, o); } else pf.tracking.push({ id: 'T' + String(A.db.seq.tr++).padStart(4, '0'), ...o });
      const ms = p.schedule.find(s => s.name === `추적조사 ${n}차 보고서 제출`);
      if (ms) Object.assign(ms, { done: o.date || U.today(), reason: '', action: o.status === '면제' ? '면제 (센터 판단)' : '' });
      if (o.file) p.docs.push({ id: 'D' + String(A.db.seq.doc++).padStart(4, '0'), type: '추적조사 보고서', stage: 'FOLLOWUP', name: o.file, size: 1.2e6, by: A.me().id, at: U.nowStamp(), mod: null, pub: false });
      A.hist(p.id, '성과', `추적조사 ${n}차`, r.status, o.status);
      A.save(); m.close(); A.toast(`추적조사 ${n}차 ${o.status} 처리했습니다.`, 'ok'); refresh();
    };
  }
  function evalModal(p) {
    const ev = p.perf.eval ? JSON.parse(JSON.stringify(p.perf.eval)) : { items: K.CONST.EVAL_ITEMS.map(n => ({ n, s: 3, c: '' })), opinion: '' };
    const m = A.modal({ title: '자체평가 결과 입력', cls: 'wide', body: `<table class="tbl"><thead><tr><th>평가항목</th><th>점수 (1 미흡 · 2 보통 · 3 우수 · 4 매우 우수)</th><th>평가 의견</th></tr></thead><tbody>${ev.items.map((x, i) => `<tr><td class="ink">${x.n}</td><td><div class="score" data-i="${i}">${[1, 2, 3, 4].map(s => `<button type="button" data-s="${s}" class="${x.s === s ? 'on' : ''}">${s}</button>`).join('')}</div></td><td><input data-c="${i}" value="${esc(x.c || '')}"></td></tr>`).join('')}</tbody></table>
      <div class="f req"><label>종합 의견</label><textarea id="v-op">${esc(ev.opinion)}</textarea></div><div class="f"><label>자체평가서 첨부</label><input type="file"></div>`,
      foot: `<button class="btn" data-close>취소</button><button class="btn pri" id="v-ok">결재 상신</button>` });
    m.$$('.score').forEach(g => g.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; ev.items[+g.dataset.i].s = +b.dataset.s; A.$$('button', g).forEach(x => x.classList.toggle('on', x === b)); }));
    m.$('#v-ok').onclick = () => {
      ev.opinion = m.$('#v-op').value.trim(); m.$$('[data-c]').forEach(i => (ev.items[+i.dataset.c].c = i.value));
      if (!ev.opinion) { A.toast('종합 의견을 입력하세요.', 'bad'); return; }
      ev.date = U.today(); ev.by = A.me().id;
      const old = p.perf.eval;
      const ap = A.submit({ type: 'EVAL', pid: p.id, title: '자체평가 결과 ' + (old ? '수정' : '등록'), payload: { eval: ev }, changes: ev.items.map((x, i) => ({ path: 'perf', label: x.n, b: old ? String(old.items[i].s) : '-', a: String(x.s) })) });
      m.close(); A.toast(`결재 상신 완료 (${ap.id})`, 'ok'); refresh();
    };
  }

  R.approval = (p, host) => {
    const list = A.db.approvals.filter(a => a.pid === p.id);
    host.innerHTML = `<div class="card"><div class="hd"><h3>결재 진행 현황 및 이력</h3><span class="note">결재선 ${A.resolveLine(p.id, p.owner).map(s => `${s.label} ${A.uname(s.uid)}`).join(' → ')}${A.db.approvalLines.byProject[p.id] ? ' (사업별 결재선)' : ' (기본 결재선)'}</span></div>
      <div class="tw"><table class="tbl"><thead><tr><th>결재번호</th><th>구분</th><th>제목</th><th>기안자</th><th>상신일시</th><th>결재 진행</th><th>상태</th></tr></thead><tbody>
      ${list.map(a => `<tr class="click" data-ap="${a.id}"><td class="mono small">${a.id}</td><td class="nowrap">${A.AP_T[a.type]}</td><td class="ink">${esc(a.title)}</td><td>${A.uname(a.drafter)}</td><td class="mono small nowrap">${a.createdAt}</td><td class="small nowrap">${a.line.map(s => `<span class="${s.status === 'APPROVED' ? '' : 'muted'}">${A.uname(s.uid)}${s.status === 'APPROVED' ? '✓' : s.status === 'PENDING' ? '…' : ['RETURNED', 'SUPPLEMENT'].includes(s.status) ? '✕' : ''}</span>`).join(' → ')}</td><td>${A.apBadge(a.status)}</td></tr>`).join('') || '<tr><td colspan="7" class="empty">결재 이력이 없습니다.</td></tr>'}
      </tbody></table></div></div>`;
    A.$$('[data-ap]', host).forEach(tr => (tr.onclick = () => A.openApproval(tr.dataset.ap)));
  };

  R.hist = (p, host) => {
    const f = (A.state.hf = A.state.hf && A.state.hf.pid === p.id ? A.state.hf : { pid: p.id, cat: '', from: '', to: '' });
    const all = A.db.history.filter(h => h.pid === p.id);
    const rows = all.filter(h => (!f.cat || h.cat === f.cat) && (!f.from || h.at.slice(0, 10) >= f.from) && (!f.to || h.at.slice(0, 10) <= f.to));
    const fmt = v => typeof v === 'number' ? num(v) : esc(v);
    const unc = A.db.approvals.filter(a => a.pid === p.id && ['PENDING', 'SUPPLEMENT', 'RETURNED'].includes(a.status));
    host.innerHTML = `${unc.length ? `<div class="card"><div class="hd"><h3>확정되지 않은 변경 <span class="tag">♥ 추가 제안</span></h3><span class="note">결재 대기·보완·반려 — 사업정보·통계·홈페이지 공개에 반영 안 됨</span></div>
      <div class="tw"><table class="tbl diff"><thead><tr><th>결재번호</th><th>상태</th><th>항목</th><th>현재 값</th><th>요청 값</th><th>비고</th></tr></thead><tbody>
      ${unc.flatMap(a => a.changes.map((c, k) => `<tr>${k ? '<td></td><td></td>' : `<td class="mono small"><a href="javascript:void 0" data-ap="${a.id}">${a.id}</a></td><td>${A.apBadge(a.status)}</td>`}<td class="nowrap">${esc(c.label)}</td><td>${esc(c.b)}</td><td style="color:var(--muted)">${esc(c.a)}</td><td class="small">${k ? '' : a.status === 'PENDING' ? `${A.uname((a.line.find(x => x.status === 'PENDING') || {}).uid)} 결재 대기` : esc((a.line.find(x => ['RETURNED', 'SUPPLEMENT'].includes(x.status)) || {}).comment || '')}</td></tr>`)).join('')}
      </tbody></table></div></div>` : ''}<div class="notice info"><span>🔒</span><span class="grow">변경 이력은 시스템이 자동 기록하며 <b>수정·삭제할 수 없습니다(Read Only)</b>. 결재 대상 항목은 최종 승인 시점에 확정 이력으로 기록됩니다.</span></div>
      <div class="card"><div class="hd"><h3>확정 이력 <span class="muted small">${rows.length}건</span></h3><div class="row">
        <select class="btn sm" id="h-cat">${A.opts(A.uniq(all, 'cat'), f.cat, '전체 구분')}</select><input type="date" class="btn sm" id="h-from" value="${f.from}" aria-label="시작일"><span class="muted">~</span><input type="date" class="btn sm" id="h-to" value="${f.to}" aria-label="종료일">
        <button class="btn sm" id="h-xls">${A.ICON.dl}엑셀</button></div></div>
      <div class="tw" style="max-height:560px"><table class="tbl diff"><thead><tr><th>변경일시</th><th>구분</th><th>변경 항목</th><th>변경 전</th><th>변경 후</th><th>수정자</th><th>결재번호</th></tr></thead><tbody>
      ${rows.map(h => `<tr><td class="mono small nowrap">${h.at}</td><td class="nowrap">${esc(h.cat)}</td><td class="ink nowrap">${esc(h.label)}</td><td class="${h.b !== '' && h.b != null ? 'bf' : ''}" style="max-width:280px">${fmt(h.b) || '<span class="muted">-</span>'}</td><td class="af" style="max-width:320px">${fmt(h.a)}</td><td class="nowrap">${A.uname(h.by)}</td><td>${h.ap ? `<a href="javascript:void 0" data-ap="${h.ap}" class="mono small">${h.ap}</a>` : '<span class="muted small">-</span>'}</td></tr>`).join('') || '<tr><td colspan="7" class="empty">조건에 맞는 이력이 없습니다.</td></tr>'}
      </tbody></table></div></div>`;
    ['cat', 'from', 'to'].forEach(k => (A.$('#h-' + k, host).onchange = e => { f[k] = e.target.value; R.hist(p, host); }));
    A.$$('[data-ap]', host).forEach(a => (a.onclick = () => A.openApproval(a.dataset.ap)));
    A.$('#h-xls', host).onclick = () => A.downloadCSV(`변경이력_${p.id}`, ['변경일시', '구분', '변경항목', '변경전', '변경후', '수정자', '결재번호'], rows.map(h => [h.at, h.cat, h.label, h.b, h.a, A.uname(h.by), h.ap || '']));
  };

  R.acl = (p, host) => {
    const me = A.me();
    const manage = me.role === 'ADMIN' || me.role === 'MANAGER' || p.owner === me.id;
    const others = A.db.users.filter(u => ![p.owner, p.subOwner].includes(u.id));
    const lst = (key, label) => `<div class="card"><div class="hd"><h3>${label}</h3>${manage ? `<div class="row"><select class="btn sm" id="add-${key}">${A.opts(others.filter(u => !p.acl[key].includes(u.id)).map(u => [u.id, `${u.name} ${u.title} (${u.team})`]), '', '사용자 선택')}</select><button class="btn sm pri" data-add="${key}">부여</button></div>` : ''}</div>
      <div class="tw"><table class="tbl"><tbody>${p.acl[key].map(uid => `<tr><td class="ink">${A.ulabel(uid)}</td><td>${esc(A.user(uid).team)}</td><td>${K.ROLES[A.user(uid).role]}</td><td class="c">${manage ? `<button class="btn sm danger" data-rm="${key}:${uid}">회수</button>` : ''}</td></tr>`).join('') || '<tr><td class="empty">지정된 사용자가 없습니다.</td></tr>'}</tbody></table></div></div>`;
    host.innerHTML = `
      <div class="notice info"><span>ⓘ</span><span class="grow">사업 단위 접근권한은 <b>역할 권한(메뉴·기능) × 사업 권한(데이터)</b>으로 이중 통제됩니다. 담당자는 지정된 사업만 조회·수정할 수 있고, 조회권한자는 상세 열람만 가능합니다.</span></div>
      <div class="card"><div class="hd"><h3>담당 지정</h3><span class="note">변경은 기본정보 수정(결재)으로 처리</span></div><dl class="dl" style="margin:0">${kv('주담당자', A.ulabel(p.owner))}${kv('부담당자', A.ulabel(p.subOwner))}${kv('담당팀', esc(p.team))}${kv('결재선', A.resolveLine(p.id, p.owner).map(s => `${s.label} ${A.uname(s.uid)}`).join(' → ') + (A.db.approvalLines.byProject[p.id] ? ' <span class="b acc">사업별</span>' : ' <span class="b mute">기본</span>'))}</dl></div>
      <div class="grid2">${lst('viewers', '조회 권한자')}${lst('editors', '수정 권한자')}</div>
      <div class="card"><div class="hd"><h3>권한 변경 이력</h3></div><div class="tw"><table class="tbl"><thead><tr><th>일시</th><th>대상자</th><th>권한</th><th>처리</th><th>처리자</th></tr></thead><tbody>
        ${p.aclHist.map(h => `<tr><td class="mono small">${h.at}</td><td>${A.ulabel(h.uid)}</td><td>${h.kind}</td><td>${h.act}</td><td>${A.uname(h.by)}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">권한 변경 이력이 없습니다.</td></tr>'}
      </tbody></table></div></div>`;
    const KN = { viewers: '조회', editors: '수정' };
    A.$$('[data-add]', host).forEach(b => (b.onclick = () => {
      const k = b.dataset.add, uid = A.$('#add-' + k, host).value; if (!uid) { A.toast('사용자를 선택하세요.', 'bad'); return; }
      p.acl[k].push(uid); p.aclHist.unshift({ at: U.nowStamp(), uid, kind: KN[k], act: '부여', by: me.id });
      A.hist(p.id, '권한', `${KN[k]} 권한`, '', `${A.uname(uid)} 부여`); A.notify(uid, '권한', `[권한 부여] ${p.name} — ${KN[k]} 권한이 부여되었습니다`, `#/projects/${p.id}`);
      A.save(); A.toast(`${A.uname(uid)}님에게 ${KN[k]} 권한을 부여했습니다.`, 'ok'); R.acl(p, host);
    }));
    A.$$('[data-rm]', host).forEach(b => (b.onclick = () => {
      const [k, uid] = b.dataset.rm.split(':'); p.acl[k] = p.acl[k].filter(x => x !== uid); p.aclHist.unshift({ at: U.nowStamp(), uid, kind: KN[k], act: '회수', by: me.id });
      A.hist(p.id, '권한', `${KN[k]} 권한`, `${A.uname(uid)}`, '회수'); A.save(); R.acl(p, host);
    }));
  };

  /* ── 단계 변경 (센터 내부 처리 · 결재) ──────────── */
  function stageModal(p) {
    const opts = (K.INT[p.stage] || []).filter(o => o.when(p));
    const m = A.modal({ title: '단계 변경 (결재)', body: `<div class="form" style="grid-template-columns:1fr 1fr">
      <div class="f"><label>현재 단계</label><div class="ro">${A.stageBadge(p.stage, p)}</div></div>
      <div class="f req"><label>변경 내용</label><select id="s-next">${opts.map((o, i) => `<option value="${i}">${esc(o.label)}</option>`).join('')}</select></div>
      <div class="f req span2"><label>변경 사유 · 근거</label><textarea id="s-why" placeholder="예) 착수계 접수 (공문 제2026-○○호)"></textarea></div></div>
      <div class="notice info"><span>ⓘ</span><span class="grow">예비사업 편입·심의 상정·착수·종료처럼 <b>센터가 처리하는 단계 변경</b>은 결재 승인 후 반영됩니다. 위원회 의결·국토부 결정 같은 <b>외부 결정</b>은 '외부 결정 기록'으로 근거만 남깁니다.</span></div>`,
      foot: `<button class="btn" data-close>취소</button><button class="btn pri" id="s-ok">결재 상신</button>` });
    m.$('#s-ok').onclick = () => {
      const o = opts[+m.$('#s-next').value], why = m.$('#s-why').value.trim();
      if (!why) { m.$('#s-why').closest('.f').classList.add('err'); A.toast('변경 사유를 입력하세요.', 'bad'); return; }
      const after = K.stageName(o.to) + (o.sub ? ` · ${o.sub}` : '');
      const changes = [{ path: 'stage', label: '추진단계', bv: p.stage, av: o.to, b: A.stageLabel(p), a: after }];
      if (o.sub) changes.push({ path: 'sub', label: '세부상태', bv: p.sub, av: o.sub, b: p.sub || '-', a: o.sub });
      const ap = A.submit({ type: 'STAGE', pid: p.id, title: o.label, note: why, changes });
      m.close(); A.toast(`결재 상신 완료 (${ap.id})`, 'ok'); refresh();
    };
  }

  /* ── 외부 결정 기록 (결재 없음 · ♥ 이중 결재 방지) ──── */
  A.decisionModal = (p, done) => {
    const opts = (K.EXT[p.stage] || []).filter(o => o.when(p));
    if (!opts.length) { A.toast('이 단계에서 기록할 외부 결정이 없습니다.'); return; }
    const m = A.modal({ title: '외부 결정 기록', cls: 'wide', body: `<div class="form">
      <div class="f"><label>사업</label><div class="ro small">${A.pid(p)}</div></div><div class="f span3"><label>현재 단계</label><div class="ro">${A.stageBadge(p.stage, p)} <span class="small">${esc(p.name)}</span></div></div>
      <div class="f req span2"><label>결정 내용</label><select id="d-o">${opts.map((o, i) => `<option value="${i}">${esc(o.label)}</option>`).join('')}</select></div>
      <div class="f req span2"><label>결정기관</label><input id="d-body" value="${esc(opts[0].body)}"></div>
      <div class="f req"><label>결정일</label><input type="date" id="d-date" value="${U.today()}"></div>
      <div class="f span3"><label>회의 · 문서번호</label><input id="d-no" placeholder="예) 2026년 제4차 국토교통 국제개발협력위원회"></div>
      <div class="f span4" id="d-rw"><label>사유</label><textarea id="d-why" placeholder="보류·미선정 사유 (다음 공모 재제안 시 보완 근거로 활용)"></textarea></div>
      <div class="f span4"><label>근거 문서 (의결서·결과 통보 공문)</label><input type="file" id="d-file"></div></div>
      <div class="notice info"><span>♥</span><span class="grow">위원회 의결·국토부 결정 등 <b>센터 밖에서 결정된 결과</b>는 센터 결재 없이 결정기관·일자·근거 문서와 함께 바로 반영합니다. 처리 이력과 변경이력에 '외부 결정'으로 표시됩니다.</span></div>`,
      foot: `<button class="btn" data-close>취소</button><button class="btn pri" id="d-ok">기록</button>` });
    const sync = () => { const o = opts[+m.$('#d-o').value]; m.$('#d-body').value = o.body; m.$('#d-rw').classList.toggle('req', !!o.reason); };
    m.$('#d-o').onchange = sync; sync();
    m.$('#d-ok').onclick = () => {
      const o = opts[+m.$('#d-o').value], fl = m.$('#d-file').files[0];
      const f = { body: m.$('#d-body').value.trim(), date: m.$('#d-date').value, no: m.$('#d-no').value.trim(), reason: m.$('#d-why').value.trim(), doc: fl ? fl.name : '', size: fl ? fl.size : 0 };
      if (!f.body || !f.date) { A.toast('결정기관과 결정일을 입력하세요.', 'bad'); return; }
      if (o.reason && !f.reason) { m.$('#d-rw').classList.add('err'); A.toast('보류·미선정은 사유를 입력하세요.', 'bad'); return; }
      A.recordDecision(p, o, f);
      m.close(); A.toast(`외부 결정을 기록했습니다 — ${A.stageLabel(p)}`, 'ok'); done && done();
    };
  };

  /* ── 재제안 접수 (같은 사업ID · 다음 차수) ──────── */
  A.rePending = p => A.db.approvals.find(a => a.pid === p.id && a.type === 'REPROPOSE' && ['PENDING', 'SUPPLEMENT'].includes(a.status));
  A.reLabel = p => (A.rePending(p) ? `재제안 결재중 (${(p.round || 1) + 1}차)` : `재제안 접수 (${(p.round || 1) + 1}차)`);
  A.reproposeModal = (p, done) => {
    const pend = A.rePending(p);
    if (pend) { A.toast(`재제안 결재가 진행중입니다 (${pend.id}) — 결재 문서를 엽니다.`); A.openApproval(pend.id); return; }
    const now = new Date(), year = now.getMonth() >= 4 ? now.getFullYear() + 1 : now.getFullYear();
    const dur = p.type === '프로젝트' ? 3 : p.type === '연수' ? 0 : 1;
    const last = [...p.stageHist].reverse().find(h => ['HELD', 'REJECTED'].includes(h.k));
    const nr = (p.round || 1) + 1;
    const f0 = { name: p.name.replace(/\(\d+차\)$/, ''), desc: p.desc, planAmt: p.planAmt, type: p.type, mode: (p.prop && p.prop.mode) || '', evidence: (p.prop && p.prop.evidence) || '', startYear: year + 2, endYear: year + 2 + dur };
    const m = A.modal({ title: `재제안 접수 — ${p.id} · ${nr}차`, cls: 'wide', body: `
      <div class="notice warn"><span>↺</span><span class="grow"><b>${p.round || 1}차 결과: ${esc(A.stageLabel(p))}</b>${last ? ` — ${esc(last.reason)}` : ''}<br><span class="small">새 번호 없이 같은 사업ID의 ${nr}차로 ${year}년 공모에 접수합니다. 이전 차수와의 변경사항은 자동 비교됩니다.</span></span></div>
      <div class="form">
        <div class="f req span4"><label>사업명</label><input id="r-name" value="${esc(f0.name)}"></div>
        <div class="f req"><label>사업유형</label><select id="r-type">${A.opts(A.code('type'), f0.type, null)}</select></div>
        <div class="f req"><label>제안 사업비(원)</label><input id="r-amt" class="num money" value="${money(f0.planAmt)}"></div>
        <div class="f req"><label>시행 시작연도</label><input id="r-s" inputmode="numeric" value="${f0.startYear}"></div>
        <div class="f req"><label>종료연도</label><input id="r-e" inputmode="numeric" value="${f0.endYear}"></div>
        <div class="f req span2"><label>추진방식</label><input id="r-mode" value="${esc(f0.mode)}" placeholder="예) 수원기관 공동 기획"></div>
        <div class="f req span2"><label>근거 서류</label><input id="r-ev" value="${esc(f0.evidence)}" placeholder="예) LOI 확보 · 수원국 요청공문"></div>
        <div class="f req span4"><label>사업내용</label><textarea id="r-desc">${esc(f0.desc)}</textarea></div>
        <div class="f req span4"><label>보완 내용 (이전 차수 미선정·보류 사유 대응)</label><textarea id="r-note" placeholder="예) LOI 확보, 차량 기자재 제외로 사업범위 조정"></textarea></div>
        <div class="f span4"><label>첨부 (공모 제안서 · 근거 서류)</label><input type="file" id="r-file" multiple></div></div>`,
      foot: `<button class="btn" data-close>취소</button><button class="btn pri" id="r-ok">결재 상신</button>` });
    bindMoney(m.el);
    m.$('#r-ok').onclick = () => {
      const f = { name: m.$('#r-name').value.trim(), type: m.$('#r-type').value, planAmt: unmoney(m.$('#r-amt').value), startYear: +m.$('#r-s').value, endYear: +m.$('#r-e').value, mode: m.$('#r-mode').value.trim(), evidence: m.$('#r-ev').value.trim(), desc: m.$('#r-desc').value.trim() };
      const note = m.$('#r-note').value.trim();
      if (Object.values(f).some(v => v == null || v === '') || !note) { A.toast('필수 항목(*)을 모두 입력하세요.', 'bad'); return; }
      const L = { name: '사업명', type: '사업유형', planAmt: '제안 사업비', startYear: '시행 시작연도', endYear: '종료연도', mode: '추진방식', evidence: '근거 서류', desc: '사업내용' };
      const cur = { ...f0, name: p.name, startYear: p.startYear, endYear: p.endYear };
      const changes = Object.keys(f).filter(k => String(f[k]) !== String(cur[k])).map(k => ({ path: k, label: L[k], bv: cur[k], av: f[k], b: k === 'planAmt' ? won(cur[k]) : String(cur[k] ?? '-'), a: k === 'planAmt' ? won(f[k]) : String(f[k]) }));
      const ap = A.submit({ type: 'REPROPOSE', pid: p.id, title: `재제안 접수 (${nr}차) — ${year}년 공모`, note, attach: [...m.$('#r-file').files].map(x => x.name), changes, payload: { fields: f, year } });
      m.close(); A.toast(`재제안 결재 상신 (${ap.id}) — 승인 시 ${p.id} · ${nr}차로 접수됩니다.`, 'ok'); done && done();
    };
  };

  function exportModal(p) {
    const m = A.modal({ title: '사업정보 내보내기', body: `<div class="small muted">사업카드(기본정보·계약·집행·성과 요약)를 문서로 변환합니다.</div>
      <div class="grid2" style="gap:8px">
        <button class="btn" data-x="pdf" style="justify-content:center;padding:14px">${A.ICON.print}PDF (인쇄)</button>
        <button class="btn" data-x="doc" style="justify-content:center;padding:14px">워드 (.doc)</button>
        <button class="btn" data-x="xls" style="justify-content:center;padding:14px">엑셀 (.csv)</button>
        <button class="btn" data-x="hwp" style="justify-content:center;padding:14px">한글 (.hwp)</button>
      </div><div class="notice info small"><span>ⓘ</span><span class="grow">한글(HWP) 변환은 본 구축 시 서버 측 문서 변환 모듈로 제공합니다 (프로토타입에서는 미구현).</span></div>` });
    const card = print => `<html><head><meta charset="utf-8"><title>${esc(p.name)}</title><style>${print ? `@font-face{font-family:'Pretendard Variable';font-weight:45 920;src:url('${new URL('assets/fonts/pretendard/PretendardVariable.woff2', location.href).href}') format('woff2')}` : ''}body{font-family:'Pretendard Variable',Pretendard,'Malgun Gothic',sans-serif;font-size:10.5pt}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:4px 6px;text-align:left}th{background:#eee;width:22%}h1{font-size:15pt}</style></head><body><h1>${esc(p.name)}</h1><p>${p.id} · ${A.stageName(p.stage)} · 출력일 ${U.today()}</p><table>
      ${[['국가/지역', `${p.country} / ${p.region}`], ['분야/공종', `${p.field} / ${p.workType}`], ['사업유형', p.type], ['사업기간', `${p.startYear} ~ ${p.endYear}`], ['발주처', p.orderer], ['제안기관', p.proposer], ['수행기관', p.implementer || '-'], ['시행계획 예산', won(p.planAmt)], ['발주금액', won(p.orderAmt)], ['계약금액', won(p.contractAmt)], ['낙찰차액/낙찰률', `${won(A.surplusOf(p))} / ${pct(A.rateOf(p), 2)}`], ['집행금액', won(A.execOf(p))], ['담당자', A.ulabel(p.owner)], ['사업개요', p.desc]].map(([k, v]) => `<tr><th>${k}</th><td>${esc(v)}</td></tr>`).join('')}
      </table>${p.perf ? `<h2 style="font-size:12pt">성과지표</h2><table><tr><th>지표</th><th>기준</th><th>목표</th><th>실적</th></tr>${p.perf.indicators.map(i => `<tr><td>${esc(i.name)}</td><td>${i.base}</td><td>${i.target}</td><td>${i.end ?? '-'}</td></tr>`).join('')}</table>` : ''}</body></html>`;
    m.$$('[data-x]').forEach(b => (b.onclick = () => {
      const x = b.dataset.x;
      if (x === 'hwp') { A.toast('한글 변환은 본 구축 범위입니다 (프로토타입 미구현).'); return; }
      if (x === 'doc') A.downloadText(`${p.id}_사업카드.doc`, card(), 'application/msword');
      if (x === 'xls') A.downloadCSV(`${p.id}_사업카드`, ['항목', '내용'], [['사업번호', p.id], ['사업명', p.name], ['국가', p.country], ['분야', p.field], ['유형', p.type], ['기간', `${p.startYear}~${p.endYear}`], ['계약금액', p.contractAmt ?? ''], ['집행금액', A.execOf(p)], ['담당자', A.uname(p.owner)]]);
      if (x === 'pdf') { const w = window.open('', '_blank'); if (w) { w.document.write(card(true)); w.document.close(); w.focus(); w.print(); } else A.toast('팝업이 차단되었습니다.', 'bad'); }
      A.log('기능', `사업정보 내보내기(${x})`, p.id); m.close();
    }));
  }
})(window.App);
