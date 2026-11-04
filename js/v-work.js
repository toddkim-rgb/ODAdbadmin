/* 결재함 · 결재라인 · 예산변경 · 낙찰차액 현황 · 일정관리 · 성과지표 달성현황 */
(function (A) {
  const { esc, num, eok, won, pct, U, K } = A;

  /* ── 결재 문서 (모달) ─────────────────────── */
  A.openApproval = id => {
    const ap = A.db.approvals.find(a => a.id === id);
    if (!ap) { A.toast('결재 문서를 찾을 수 없습니다.', 'bad'); return; }
    const me = A.me();
    const p = ap.pid && A.db.projects.find(x => x.id === ap.pid);
    const cur = ap.line[ap.step];
    const isMyTurn = ap.status === 'PENDING' && cur && cur.uid === me.id && A.can('approvals', 'a');
    const canWithdraw = ap.status === 'PENDING' && ap.drafter === me.id && ap.step === 0;
    const canResubmit = ['RETURNED', 'SUPPLEMENT'].includes(ap.status) && ap.drafter === me.id;
    const SN = { WAIT: '대기', PENDING: '결재 대기', APPROVED: '승인', RETURNED: '반려', SUPPLEMENT: '보완요청' };
    const steps = `<div class="aline"><div class="as APPROVED"><span class="r">기안</span><span class="n">${A.ulabel(ap.drafter)}</span><span class="s mono">${ap.createdAt}</span></div>${ap.line.map(s => `<div class="arrow">→</div><div class="as ${s.status === 'PENDING' ? 'CURRENT' : s.status}"><span class="r">${esc(s.label)}</span><span class="n">${A.ulabel(s.uid)}</span><span class="s">${SN[s.status]}${s.at ? ` · <span class="mono">${s.at}</span>` : ''}</span>${s.comment ? `<span class="s" style="color:var(--ink)">“${esc(s.comment)}”</span>` : ''}</div>`).join('')}</div>`;
    const np = ap.type === 'NEW' && ap.payload && ap.payload.project;
    const m = A.modal({ title: `결재 문서 <span class="mono muted small" style="font-weight:400">${ap.id}</span>`, cls: 'wide', body: `
      <div class="row"><span class="b info">${A.AP_T[ap.type]}</span>${A.apBadge(ap.status)}${isMyTurn ? '<span class="b acc">내 결재 차례</span>' : ''}</div>
      <div style="font-size:15px;font-weight:600;color:var(--ink)">${esc(ap.title)}</div>
      <dl class="dl" style="margin:0;grid-template-columns:repeat(2,minmax(0,1fr))">
        <div><dt>대상 사업</dt><dd>${p ? `<a href="#/projects/${p.id}" data-close>${p.id} ${esc(p.name)}</a>` : np ? `(신규) ${esc(np.name)}` : '-'}</dd></div>
        <div><dt>기안자 · 상신일시</dt><dd>${A.ulabel(ap.drafter)} · <span class="mono">${ap.createdAt}</span></dd></div>
        <div class="w4"><dt>상신 의견</dt><dd>${esc(ap.note) || '<span class="muted">-</span>'}</dd></div>
        <div class="w4"><dt>첨부</dt><dd>${ap.attach.length ? ap.attach.map(f => `<span class="b mute">📎 ${esc(f)}</span>`).join(' ') : '<span class="muted">-</span>'}</dd></div>
      </dl>
      <div><div class="small muted" style="margin-bottom:6px">결재선</div>${steps}</div>
      <div><div class="small muted" style="margin-bottom:6px">변경 내용 (변경 전 · 후)</div>${A.diffTable(ap.changes)}</div>
      ${ap.status === 'PENDING' ? '<div class="notice info small"><span>ⓘ</span><span class="grow">최종 승인 전까지 원본 사업정보에는 반영되지 않습니다. 승인 완료 시 자동 반영되고 변경 이력이 확정 기록됩니다.</span></div>' : ''}`,
      foot: `${p ? `<a class="btn ghost" href="#/projects/${p.id}?tab=approval" data-close>사업 상세</a>` : ''}<span class="sp"></span>
        ${canWithdraw ? '<button class="btn" id="a-wd">회수</button>' : ''}
        ${canResubmit ? '<button class="btn pri" id="a-re">보완 후 재상신</button>' : ''}
        ${isMyTurn ? '<button class="btn danger" id="a-rj">반려</button><button class="btn" id="a-sp">보완요청</button><button class="btn ok" id="a-ok">승인</button>' : ''}
        <button class="btn" data-close>닫기</button>` });
    const after = msg => { m.close(); A.toast(msg, 'ok'); A.render(); };
    m.$('#a-ok') && (m.$('#a-ok').onclick = async () => {
      const last = ap.step === ap.line.length - 1;
      const c = await A.ask('승인', '결재 의견 (선택)', { required: false, ok: '승인', hint: last ? '최종 승인 시 사업정보에 즉시 반영됩니다.' : `다음 결재자: ${A.ulabel(ap.line[ap.step + 1].uid)}` });
      if (c === null) return; A.act(ap, 'approve', c); after(last ? '최종 승인 — 사업정보에 반영되고 변경 이력이 기록되었습니다.' : '승인했습니다. 다음 결재자에게 알림을 보냈습니다.');
    });
    m.$('#a-rj') && (m.$('#a-rj').onclick = async () => { const c = await A.ask('반려', '반려 사유', { ok: '반려', hint: '반려 사유는 필수이며 기안자에게 이메일로 통보됩니다.' }); if (!c) return; A.act(ap, 'reject', c); after('반려 처리했습니다. 기안자에게 알림을 보냈습니다.'); });
    m.$('#a-sp') && (m.$('#a-sp').onclick = async () => { const c = await A.ask('보완요청', '보완 요청 사항', { ok: '보완요청' }); if (!c) return; A.act(ap, 'supplement', c); after('보완을 요청했습니다.'); });
    m.$('#a-wd') && (m.$('#a-wd').onclick = async () => { if (!(await A.confirm('결재를 회수할까요? 결재권자가 승인하기 전에만 회수할 수 있습니다.', { ok: '회수' }))) return; A.act(ap, 'withdraw'); after('결재를 회수했습니다.'); });
    m.$('#a-re') && (m.$('#a-re').onclick = () => {
      const r = A.modal({ title: '보완 후 재상신', body: `<div class="notice warn small"><span>↩</span><span class="grow">${esc((ap.line.find(s => ['RETURNED', 'SUPPLEMENT'].includes(s.status)) || {}).comment || '')}</span></div><div class="f req"><label>보완 내용</label><textarea id="r-note">${esc(ap.note)}</textarea></div><div class="f"><label>보완 첨부</label><input type="file" id="r-file" multiple></div>`, foot: '<button class="btn" data-close>취소</button><button class="btn pri" id="r-ok">재상신</button>' });
      r.$('#r-ok').onclick = () => { const note = r.$('#r-note').value.trim(); if (!note) { A.toast('보완 내용을 입력하세요.', 'bad'); return; } A.resubmit(ap, { note, attach: [...ap.attach, ...[...r.$('#r-file').files].map(f => f.name)] }); r.close(); after('재상신했습니다.'); };
    });
  };

  /* ── 결재함 (SFR-027) ─────────────────────── */
  A.page('/approvals', { menu: 'approvals', title: '결재함' }, (view, _, q) => {
    const me = A.me();
    const seeAll = ['ADMIN', 'MANAGER'].includes(me.role);
    const vis = A.db.approvals.filter(a => seeAll || a.drafter === me.id || (a.pid && A.P(a.pid) && A.canSee(A.P(a.pid))));
    const T = {
      todo: ['결재 대기', A.myQueue()], sent: ['상신함', vis.filter(a => a.drafter === me.id)], ing: ['진행중', vis.filter(a => a.status === 'PENDING')],
      done: ['승인완료', vis.filter(a => a.status === 'APPROVED')], ret: ['반려·보완', vis.filter(a => ['RETURNED', 'SUPPLEMENT', 'WITHDRAWN'].includes(a.status))], all: ['전체', vis],
    };
    const tab = (A.state.apt = q.tab || A.state.apt || (T.todo[1].length ? 'todo' : 'sent'));
    const f = (A.state.apf = A.state.apf || { type: '' });
    const rows = T[tab][1].filter(a => !f.type || a.type === f.type);
    view.innerHTML = `
      ${A.ph('결재함', '사업정보 등록·수정·삭제, 예산변경, 추진단계 변경, 성과자료 등록의 결재를 처리합니다', '', 'SFR-027')}
      <div class="tabs">${Object.entries(T).map(([k, [n, l]]) => `<button data-t="${k}" class="${k === tab ? 'on' : ''}">${n}<span class="cnt">${l.length}</span></button>`).join('')}</div>
      <div class="bar"><div class="fl"><span>결재 구분</span><select id="a-type">${A.opts(Object.entries(A.AP_T), f.type)}</select></div><span class="sp"></span><span class="muted small">결재 상태 변경 시 기안자·다음 결재자에게 이메일 알림이 발송됩니다</span></div>
      <div class="card"><div class="tw"><table class="tbl"><thead><tr><th>결재번호</th><th>구분</th><th>제목</th><th>기안자</th><th>상신일시</th><th>결재 진행</th><th>상태</th></tr></thead><tbody>
      ${rows.map(a => { const p = a.pid && A.db.projects.find(x => x.id === a.pid); const cur = a.line[a.step]; return `<tr class="click" data-ap="${a.id}"><td class="mono small nowrap">${a.id}</td><td class="nowrap">${A.AP_T[a.type]}</td><td class="nm"><span class="t">${esc(a.title)}</span><span class="m muted small">${p ? `${p.id} · ${esc(p.name)}` : '신규 사업'}</span></td><td class="nowrap">${A.uname(a.drafter)}</td><td class="mono small nowrap">${a.createdAt}</td><td class="small nowrap">${a.line.map((s, i) => `<span style="${s.status === 'APPROVED' ? 'color:var(--ok)' : s.status === 'PENDING' ? 'color:var(--kick);font-weight:600' : ['RETURNED', 'SUPPLEMENT'].includes(s.status) ? 'color:var(--bad)' : 'color:var(--muted)'}">${A.uname(s.uid)}</span>`).join(' → ')}</td><td>${a.status === 'PENDING' && cur && cur.uid === me.id ? '<span class="b acc">내 차례</span>' : A.apBadge(a.status)}</td></tr>`; }).join('') || '<tr><td colspan="7" class="empty">해당하는 결재 문서가 없습니다.</td></tr>'}
      </tbody></table></div></div>`;
    A.$$('.tabs button', view).forEach(b => (b.onclick = () => { A.state.apt = b.dataset.t; A.go('/approvals'); A.render(); }));
    A.$('#a-type', view).onchange = e => { f.type = e.target.value; A.render(); };
    A.$$('[data-ap]', view).forEach(tr => (tr.onclick = () => A.openApproval(tr.dataset.ap)));
    if (q.open) { history.replaceState(null, '', '#/approvals'); setTimeout(() => A.openApproval(q.open), 0); }
  });

  /* ── 결재라인 설정 (SFR-026) ──────────────── */
  A.page('/approval-lines', { menu: 'approvalLines', title: '결재라인 설정' }, view => {
    const L = A.db.approvalLines;
    const canEdit = A.can('approvalLines', 'u');
    const draft = L.def.map(s => ({ ...s }));
    const KIND = { TEAM_LEAD: '기안자 소속 팀장', HEAD: '센터장', USER: '지정 사용자' };
    const mgrs = A.db.users.filter(u => u.role === 'MANAGER');
    view.innerHTML = `
      ${A.ph('결재라인 설정', '사업정보 등록·수정 등 주요 행위의 결재선을 관리합니다 · 설정은 관리자 권한에 한함', '', 'SFR-026')}
      ${canEdit ? '' : '<div class="notice info"><span>ⓘ</span><span class="grow">조회 전용입니다. 결재라인 변경은 시스템관리자만 가능합니다.</span></div>'}
      <div class="g-7-5">
        <div class="card"><div class="hd"><h3>기본 결재라인</h3>${canEdit ? '<div class="row"><button class="btn sm" id="l-add">단계 추가</button><button class="btn sm pri" id="l-save">저장</button></div>' : ''}</div>
          <div class="bd stack"><div class="aline" id="l-prev"></div>
          <table class="tbl"><thead><tr><th class="c">순서</th><th>결재 단계명</th><th>결재권자 지정 방식</th><th></th></tr></thead><tbody id="l-rows"></tbody></table>
          <div class="small muted">예) 사업1팀 담당자 기안 시: ${A.resolveLine(null, 'u04').map(s => A.ulabel(s.uid)).join(' → ')} · 기안자가 결재권자와 같으면 해당 단계는 자동 생략</div></div></div>
        <div class="card"><div class="hd"><h3>결재라인 변경 이력</h3></div><div class="tw"><table class="tbl"><thead><tr><th>일시</th><th>대상</th><th>변경 전</th><th>변경 후</th><th>처리자</th></tr></thead><tbody>
          ${L.hist.map(h => `<tr><td class="mono small nowrap">${h.at}</td><td>${esc(h.target)}</td><td class="small muted">${esc(h.b)}</td><td class="small">${esc(h.a)}</td><td>${A.uname(h.by)}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">변경 이력이 없습니다.</td></tr>'}
        </tbody></table></div></div>
      </div>
      <div class="card"><div class="hd"><h3>사업별 개별 결재라인</h3>${canEdit ? '<button class="btn sm pri" id="o-add">사업별 결재선 지정</button>' : ''}</div><div class="tw"><table class="tbl"><thead><tr><th>사업</th><th>결재선</th><th></th></tr></thead><tbody>
        ${Object.entries(L.byProject).map(([pid, steps]) => `<tr><td class="ink">${pid} ${esc((A.P(pid) || {}).name || '')}</td><td>${steps.map(s => `${esc(s.label)} ${A.uname(s.uid)}`).join(' → ')}</td><td class="c">${canEdit ? `<button class="btn sm danger" data-rm="${pid}">해제</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="3" class="empty">사업별로 지정된 결재선이 없습니다. 모든 사업에 기본 결재라인이 적용됩니다.</td></tr>'}
      </tbody></table></div></div>`;
    const draw = () => {
      A.$('#l-prev', view).innerHTML = `<div class="as APPROVED"><span class="r">기안</span><span class="n">담당자</span></div>` + draft.map(s => `<div class="arrow">→</div><div class="as"><span class="r">${esc(s.label)}</span><span class="n">${s.kind === 'USER' ? A.ulabel(s.uid) : KIND[s.kind]}</span></div>`).join('');
      A.$('#l-rows', view).innerHTML = draft.map((s, i) => `<tr><td class="c mono">${i + 1}</td><td>${canEdit ? `<input data-i="${i}" data-f="label" value="${esc(s.label)}">` : esc(s.label)}</td><td>${canEdit ? `<select data-i="${i}" data-f="kind">${A.opts(Object.entries(KIND), s.kind, null)}</select>${s.kind === 'USER' ? `<select data-i="${i}" data-f="uid" style="margin-top:4px">${A.opts(mgrs.map(u => [u.id, A.ulabel(u.id)]), s.uid, '선택')}</select>` : ''}` : (s.kind === 'USER' ? A.ulabel(s.uid) : KIND[s.kind])}</td><td class="nowrap">${canEdit ? `<button class="btn sm ghost" data-up="${i}" ${i === 0 ? 'disabled' : ''}>▲</button><button class="btn sm ghost" data-rm2="${i}">×</button>` : ''}</td></tr>`).join('');
      A.$$('#l-rows [data-f]', view).forEach(el => (el.onchange = () => { draft[+el.dataset.i][el.dataset.f] = el.value; draw(); }));
      A.$$('[data-up]', view).forEach(b => (b.onclick = () => { const i = +b.dataset.up; [draft[i - 1], draft[i]] = [draft[i], draft[i - 1]]; draw(); }));
      A.$$('[data-rm2]', view).forEach(b => (b.onclick = () => { draft.splice(+b.dataset.rm2, 1); draw(); }));
    };
    draw();
    const txt = arr => arr.map(s => `${s.label}(${s.kind === 'USER' ? A.uname(s.uid) : KIND[s.kind]})`).join(' → ');
    A.$('#l-add', view) && (A.$('#l-add', view).onclick = () => { draft.push({ kind: 'USER', label: '검토', uid: '' }); draw(); });
    A.$('#l-save', view) && (A.$('#l-save', view).onclick = () => {
      if (!draft.length || draft.some(s => !s.label || (s.kind === 'USER' && !s.uid))) { A.toast('결재 단계명과 결재권자를 확인하세요.', 'bad'); return; }
      L.hist.unshift({ at: U.nowStamp(), target: '기본 결재라인', b: txt(L.def), a: txt(draft), by: A.me().id });
      L.def = draft.map(s => ({ ...s })); A.save(); A.toast('기본 결재라인을 저장했습니다.', 'ok'); A.render();
    });
    A.$$('[data-rm]', view).forEach(b => (b.onclick = () => { const pid = b.dataset.rm; L.hist.unshift({ at: U.nowStamp(), target: pid, b: L.byProject[pid].map(s => A.uname(s.uid)).join(' → '), a: '기본 결재라인 적용', by: A.me().id }); delete L.byProject[pid]; A.save(); A.render(); }));
    A.$('#o-add', view) && (A.$('#o-add', view).onclick = () => {
      const m = A.modal({ title: '사업별 결재선 지정', body: `<div class="f req"><label>사업</label><select id="o-p">${A.opts(A.projects().filter(p => !L.byProject[p.id]).map(p => [p.id, `${p.id} ${p.name}`]), '', '선택')}</select></div>
        <div class="f req"><label>1차 결재</label><select id="o-1">${A.opts(mgrs.map(u => [u.id, A.ulabel(u.id)]), 'u02', null)}</select></div>
        <div class="f"><label>2차 결재</label><select id="o-2">${A.opts(mgrs.map(u => [u.id, A.ulabel(u.id)]), 'u03', '없음')}</select></div>
        <div class="f req"><label>최종 결재</label><select id="o-3">${A.opts(mgrs.map(u => [u.id, A.ulabel(u.id)]), 'u01', null)}</select></div>
        <div class="small muted">예) 교통·도시 복합사업은 두 팀장 합의 후 센터장 결재</div>`, foot: '<button class="btn" data-close>취소</button><button class="btn pri" id="o-ok">저장</button>' });
      m.$('#o-ok').onclick = () => {
        const pid = m.$('#o-p').value; if (!pid) { A.toast('사업을 선택하세요.', 'bad'); return; }
        const steps = [['1차 검토', m.$('#o-1').value], ['2차 검토', m.$('#o-2').value], ['최종 결재', m.$('#o-3').value]].filter(x => x[1]).map(([label, uid]) => ({ kind: 'USER', label, uid }));
        L.byProject[pid] = steps; L.hist.unshift({ at: U.nowStamp(), target: pid, b: '기본 결재라인', a: steps.map(s => A.uname(s.uid)).join(' → '), by: A.me().id });
        A.hist(pid, '결재', '결재선', '기본 결재라인', steps.map(s => A.uname(s.uid)).join(' → '));
        A.save(); m.close(); A.toast('사업별 결재선을 지정했습니다.', 'ok'); A.render();
      };
    });
  });

  /* ── 예산변경 요청 (SFR-023) ──────────────── */
  A.page('/budget-changes', { menu: 'budgetChanges', title: '예산변경 요청' }, view => {
    const f = (A.state.bcf = A.state.bcf || { st: '' });
    const list = A.db.approvals.filter(a => a.type === 'BUDGET' && (!a.pid || !A.P(a.pid) || A.canSee(A.P(a.pid))));
    const ST = [['', '전체'], ['PENDING', '진행중'], ['APPROVED', '승인완료'], ['RETURNED', '반려·보완']];
    const rows = list.filter(a => !f.st || a.status === f.st || (f.st === 'RETURNED' && ['RETURNED', 'SUPPLEMENT', 'WITHDRAWN'].includes(a.status)));
    const mine = A.projects().filter(p => p.contract && A.canEdit(p));
    view.innerHTML = `
      ${A.ph('예산변경 요청', '변경 사유·변경 전후 금액을 등록하면 결재라인이 자동 연동되며, 승인 시 계약금액에 자동 반영됩니다', A.can('budgetChanges', 'c') ? '<button class="btn pri" id="bc-new">예산변경 요청 등록</button>' : '', 'SFR-023')}
      <div class="tabs">${ST.map(([k, n]) => `<button data-st="${k}" class="${k === f.st ? 'on' : ''}">${n}<span class="cnt">${k ? list.filter(a => a.status === k || (k === 'RETURNED' && ['RETURNED', 'SUPPLEMENT', 'WITHDRAWN'].includes(a.status))).length : list.length}</span></button>`).join('')}</div>
      <div class="card"><div class="tw"><table class="tbl"><thead><tr><th>결재번호</th><th>사업</th><th class="num">변경 전</th><th class="num">변경 후</th><th class="num">증감</th><th>변경 사유</th><th>요청자</th><th>요청일</th><th>상태</th></tr></thead><tbody>
      ${rows.map(a => { const c = a.changes[0] || {}; const d = (c.av || 0) - (c.bv || 0); const p = A.db.projects.find(x => x.id === a.pid) || {}; return `<tr class="click" data-ap="${a.id}"><td class="mono small">${a.id}</td><td class="nm"><span class="t">${esc(p.name || '')}</span><span class="m mono small muted">${a.pid}</span></td><td class="num">${num(c.bv)}</td><td class="num">${num(c.av)}</td><td class="num" style="color:${d >= 0 ? 'var(--accentText)' : 'var(--tobeText)'}">${d >= 0 ? '+' : ''}${num(d)}</td><td class="small" style="max-width:280px">${esc(a.note)}</td><td>${A.uname(a.drafter)}</td><td class="mono small">${a.createdAt.slice(0, 10)}</td><td>${A.apBadge(a.status)}</td></tr>`; }).join('') || '<tr><td colspan="9" class="empty">예산변경 요청이 없습니다.</td></tr>'}
      </tbody></table></div></div>`;
    A.$$('.tabs button', view).forEach(b => (b.onclick = () => { f.st = b.dataset.st; A.render(); }));
    A.$$('[data-ap]', view).forEach(tr => (tr.onclick = () => A.openApproval(tr.dataset.ap)));
    A.$('#bc-new', view) && (A.$('#bc-new', view).onclick = () => {
      if (!mine.length) { A.toast('예산변경을 요청할 수 있는 계약 사업이 없습니다.', 'bad'); return; }
      const m = A.modal({ title: '대상 사업 선택', body: `<div class="f req"><label>사업 (계약 체결 · 수정 권한 보유)</label><select id="bp">${A.opts(mine.map(p => [p.id, `${p.id} ${p.name}`]), '', '선택')}</select></div>`, foot: '<button class="btn" data-close>취소</button><button class="btn pri" id="bp-ok">다음</button>' });
      m.$('#bp-ok').onclick = () => { const p = A.P(m.$('#bp').value); if (!p) return; m.close(); A.budgetModal(p, () => A.render()); };
    });
  });

  /* ── 낙찰차액 현황 (SFR-024) ──────────────── */
  A.page('/surplus', { menu: 'surplus', title: '낙찰차액 현황' }, view => {
    const f = (A.state.sf = A.state.sf || { q: '', y: '', ct: '', sort: { k: 'sur', d: -1 } });
    const base = A.visibleProjects().filter(p => A.surplusOf(p) != null);
    const rowsF = () => base.filter(p => (!f.q || p.name.includes(f.q) || p.id.includes(f.q)) && (!f.y || p.startYear === +f.y) && (!f.ct || p.country === f.ct));
    const plan = p => p.surplus.reduce((s, x) => s + x.amt, 0), act = p => p.surplus.reduce((s, x) => s + x.actual, 0);
    const get = (p, k) => ({ sur: A.surplusOf(p), rate: A.rateOf(p), plan: plan(p), act: act(p), rem: A.surplusOf(p) - plan(p) }[k] ?? p[k]);
    view.innerHTML = `
      ${A.ph('낙찰차액 현황', '사업별 발주금액·계약금액·낙찰차액·낙찰률 및 활용계획 대비 실적', A.xlsBtn(), 'SFR-024·025')}
      <div class="kpis" id="sk"></div>
      <div class="g-7-5">
        <div class="card"><div class="hd"><h3>연도별 낙찰차액 합계</h3><span class="note">계약 시작연도 기준 · 억원</span></div><div class="bd"><div class="chart short" id="sch" role="img" aria-label="연도별 낙찰차액"></div></div></div>
        <div class="card"><div class="hd"><h3>연도별 집계</h3></div><div class="tw" style="max-height:262px"><table class="tbl"><thead><tr><th>연도</th><th class="num">사업 수</th><th class="num">낙찰차액</th><th class="num">평균 낙찰률</th></tr></thead><tbody id="syt"></tbody></table></div></div>
      </div>
      <div class="bar"><div class="fl"><span>검색어</span><input type="search" id="s-q" value="${esc(f.q)}" placeholder="사업명·사업번호"></div><div class="fl"><span>연도</span><select id="s-y">${A.opts(A.uniq(base, 'startYear').reverse(), f.y)}</select></div><div class="fl"><span>국가</span><select id="s-ct">${A.opts(A.uniq(base, 'country'), f.ct)}</select></div></div>
      <div class="card"><div class="tw" style="max-height:560px"><table class="tbl"><thead id="sth"></thead><tbody id="stb"></tbody><tfoot id="stf"></tfoot></table></div></div>`;
    const cols = [{ k: 'id', n: '사업번호' }, { k: 'name', n: '사업명' }, { k: 'startYear', n: '연도' }, { k: 'country', n: '국가' }, { k: 'orderAmt', n: '발주금액', cls: 'num' }, { k: 'contractAmt', n: '계약금액', cls: 'num' }, { k: 'sur', n: '낙찰차액', cls: 'num' }, { k: 'rate', n: '낙찰률', cls: 'num' }, { k: 'plan', n: '활용계획', cls: 'num' }, { k: 'act', n: '활용실적', cls: 'num' }, { k: 'rem', n: '잔여', cls: 'num' }];
    const draw = () => {
      const rows = rowsF().sort(A.sorter(f.sort, get));
      const S = k => rows.reduce((s, p) => s + (get(p, k) || 0), 0);
      A.$('#sk', view).innerHTML = `<div class="kpi"><span class="k">대상 사업</span><span class="v">${rows.length}<small>건</small></span></div><div class="kpi"><span class="k">낙찰차액 합계</span><span class="v">${eok(S('sur'))}<small>원</small></span><span class="d">${num(S('sur'))}원</span></div><div class="kpi"><span class="k">평균 낙찰률</span><span class="v">${pct(S('contractAmt') / Math.max(1, S('orderAmt')) * 100, 2)}</span><span class="d">계약금액 합 ÷ 발주금액 합</span></div><div class="kpi"><span class="k">활용계획 / 실적</span><span class="v">${eok(S('plan'))} / ${eok(S('act'))}</span><span class="d">잔여 ${eok(S('rem'))}원</span></div>`;
      A.sortHead(cols, f.sort, A.$('#sth', view), s => { f.sort = s; draw(); });
      A.$('#stb', view).innerHTML = rows.map(p => `<tr class="click" data-id="${p.id}"><td class="mono small">${p.id}</td><td class="nm"><span class="t">${esc(p.name)}</span></td><td class="mono small">${p.startYear}</td><td>${esc(p.country)}</td><td class="num">${num(p.orderAmt)}</td><td class="num">${num(p.contractAmt)}</td><td class="num ink">${num(A.surplusOf(p))}</td><td class="num">${pct(A.rateOf(p), 2)}</td><td class="num">${num(plan(p))}</td><td class="num">${num(act(p))}</td><td class="num">${num(get(p, 'rem'))}</td></tr>`).join('') || '<tr><td colspan="11" class="empty">조건에 맞는 사업이 없습니다.</td></tr>';
      A.$('#stf', view).innerHTML = `<tr><td colspan="4">합계 (${rows.length}건)</td><td class="num">${num(S('orderAmt'))}</td><td class="num">${num(S('contractAmt'))}</td><td class="num">${num(S('sur'))}</td><td class="num">${pct(S('contractAmt') / Math.max(1, S('orderAmt')) * 100, 2)}</td><td class="num">${num(S('plan'))}</td><td class="num">${num(S('act'))}</td><td class="num">${num(S('rem'))}</td></tr>`;
      A.$$('#stb [data-id]', view).forEach(tr => (tr.onclick = () => A.go(`/projects/${tr.dataset.id}?tab=surplus`)));
      const ys = A.uniq(rows, 'startYear');
      A.$('#syt', view).innerHTML = ys.slice().reverse().map(y => { const r = rows.filter(p => p.startYear === y); const o = r.reduce((s, p) => s + p.orderAmt, 0), c = r.reduce((s, p) => s + p.contractAmt, 0); return `<tr><td class="mono">${y}</td><td class="num">${r.length}</td><td class="num">${num(o - c)}</td><td class="num">${pct((c / o) * 100, 2)}</td></tr>`; }).join('');
      A._charts.forEach(c => c.dispose()); A._charts = [];
      A.chart(A.$('#sch', view), { grid: { left: 8, right: 8, top: 10, bottom: 4, containLabel: true }, tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: v => v.toFixed(2) + '억원' }, xAxis: { type: 'category', data: ys.map(String), ...A.axis({ splitLine: { show: false } }) }, yAxis: { type: 'value', ...A.axis() }, series: [A.bar({ name: '낙찰차액', data: ys.map(y => rows.filter(p => p.startYear === y).reduce((s, p) => s + A.surplusOf(p), 0) / 1e8), itemStyle: { color: A.sc(0), borderRadius: [4, 4, 0, 0] } })] });
    };
    A.$('#s-q', view).oninput = e => { f.q = e.target.value; draw(); };
    A.$('#s-y', view).onchange = e => { f.y = e.target.value; draw(); };
    A.$('#s-ct', view).onchange = e => { f.ct = e.target.value; draw(); };
    A.$('#btn-xls', view).onclick = () => { const rows = rowsF().sort(A.sorter(f.sort, get)); A.downloadCSV('낙찰차액현황', ['사업번호', '사업명', '연도', '국가', '발주금액', '계약금액', '낙찰차액', '낙찰률(%)', '활용계획', '활용실적', '잔여'], rows.map(p => [p.id, p.name, p.startYear, p.country, p.orderAmt, p.contractAmt, A.surplusOf(p), A.rateOf(p).toFixed(2), plan(p), act(p), get(p, 'rem')]), ['합계', `${rows.length}건`, '', '', rows.reduce((s, p) => s + p.orderAmt, 0), rows.reduce((s, p) => s + p.contractAmt, 0), rows.reduce((s, p) => s + A.surplusOf(p), 0), '', rows.reduce((s, p) => s + plan(p), 0), rows.reduce((s, p) => s + act(p), 0), '']); };
    draw();
  });

  /* ── 일정 관리 (SFR-006 알림 연계) ────────── */
  A.page('/schedule', { menu: 'schedule', title: '일정 관리' }, (view, _, q) => {
    const me = A.me();
    const T = U.today();
    const f = (A.state.sch = A.state.sch || { st: '', owner: me.role === 'STAFF' ? me.id : '', mode: 'list', ym: T.slice(0, 7) });
    if (q.st) { f.st = q.st; history.replaceState(null, '', '#/schedule'); }
    const all = A.visibleProjects().flatMap(p => p.schedule.map(m => ({ m, p, dd: U.diffD(T, m.plan) })));
    const stOf = x => (x.m.done ? 'done' : x.dd < 0 ? 'late' : x.dd <= 7 ? 'd7' : x.dd <= 30 ? 'd30' : 'later');
    const base = all.filter(x => !f.owner || x.p.owner === f.owner || x.p.subOwner === f.owner);
    const rows = base.filter(x => !f.st || stOf(x) === f.st || (f.st === 'd30' && stOf(x) === 'd7')).sort((a, b) => (a.m.plan < b.m.plan ? -1 : 1));
    const cnt = k => base.filter(x => stOf(x) === k).length;
    view.innerHTML = `
      ${A.ph('일정 관리', '사업별 예정일·완료일·지연 여부·지연 사유·향후 조치사항 · 일정 도래 시 담당자에게 D-7, D-1 이메일 알림', `<div class="seg"><button data-mode="list" class="${f.mode === 'list' ? 'on' : ''}">목록</button><button data-mode="cal" class="${f.mode === 'cal' ? 'on' : ''}">캘린더</button></div>${A.xlsBtn()}`, 'SFR-006')}
      <div class="kpis">
        <button class="kpi ${f.st === 'late' ? 'alert' : ''}" data-st="late"><span class="k"><span class="b bad"><span class="ic">▲</span>지연</span></span><span class="v">${cnt('late')}<small>건</small></span><span class="d">예정일 경과 · 미완료</span></button>
        <button class="kpi" data-st="d7"><span class="k"><span class="b warn">D-7 이내</span></span><span class="v">${cnt('d7')}<small>건</small></span><span class="d">알림 발송 대상</span></button>
        <button class="kpi" data-st="d30"><span class="k">30일 이내</span><span class="v">${cnt('d7') + cnt('d30')}<small>건</small></span></button>
        <button class="kpi" data-st="done"><span class="k"><span class="b ok">완료</span></span><span class="v">${cnt('done')}<small>건</small></span></button>
        <button class="kpi" data-st=""><span class="k">전체</span><span class="v">${base.length}<small>건</small></span></button>
      </div>
      <div class="bar"><div class="fl"><span>담당자</span><select id="s-owner">${A.opts(A.db.users.filter(u => u.role === 'STAFF').map(u => [u.id, u.name]), f.owner, '전체 담당자')}</select></div><div class="fl"><span>상태</span><select id="s-st">${A.opts([['late', '지연'], ['d7', 'D-7 이내'], ['d30', '30일 이내'], ['later', '30일 이후'], ['done', '완료']], f.st)}</select></div><span class="sp"></span><span class="small muted">알림 기준일(D-7, D-1)은 발주기관 협의 후 확정</span></div>
      <div id="sbody"></div>`;
    const body = A.$('#sbody', view);
    if (f.mode === 'list') {
      body.innerHTML = `<div class="card"><div class="tw" style="max-height:620px"><table class="tbl"><thead><tr><th>상태</th><th>일정</th><th>사업</th><th>단계</th><th>예정일</th><th>완료일</th><th>지연 사유 · 향후 조치</th><th>담당</th></tr></thead><tbody>
        ${rows.slice(0, 300).map(x => { const s = stOf(x); return `<tr class="click" data-id="${x.p.id}"><td class="nowrap">${s === 'done' ? '<span class="b ok">완료</span>' : s === 'late' ? `<span class="b bad">지연 ${-x.dd}일</span>` : s === 'd7' ? `<span class="b warn">D-${x.dd}</span>` : `<span class="b mute">D-${x.dd}</span>`}</td><td class="ink nowrap">${esc(x.m.name)}</td><td class="nm"><span class="t">${esc(x.p.name)}</span></td><td class="nowrap">${K.stageName(x.m.stage)}</td><td class="mono small">${x.m.plan}</td><td class="mono small">${x.m.done || '-'}</td><td class="small">${x.m.reason ? `<span style="color:var(--bad)">${esc(x.m.reason)}</span>` : ''}${x.m.action ? `<div class="muted">→ ${esc(x.m.action)}</div>` : ''}</td><td class="nowrap">${A.uname(x.p.owner)}</td></tr>`; }).join('') || '<tr><td colspan="8" class="empty">해당 일정이 없습니다.</td></tr>'}
        </tbody></table></div>${rows.length > 300 ? `<div class="pager">상위 300건 표시 (전체 ${rows.length}건) — 엑셀로 전체 다운로드</div>` : ''}</div>`;
    } else {
      const [y, mo] = f.ym.split('-').map(Number);
      const first = new Date(y, mo - 1, 1); const start = new Date(first); start.setDate(1 - first.getDay());
      const cells = []; for (let i = 0; i < 42; i++) { const d = new Date(start); d.setDate(start.getDate() + i); cells.push(U.ymd(d)); }
      const byDay = {}; base.forEach(x => (byDay[x.m.plan] = byDay[x.m.plan] || []).push(x));
      body.innerHTML = `<div class="card"><div class="hd"><div class="row"><button class="btn sm" id="c-prev">‹</button><h3 class="mono">${y}. ${String(mo).padStart(2, '0')}</h3><button class="btn sm" id="c-next">›</button><button class="btn sm ghost" id="c-today">오늘</button></div><div class="legend"><span><i style="background:var(--badSoft);border:1px solid var(--bad)"></i>지연</span><span><i style="background:var(--kickSoft);border:1px solid var(--kick)"></i>D-7</span><span><i style="background:var(--line2)"></i>예정</span></div></div>
        <div class="cal">${['일', '월', '화', '수', '목', '금', '토'].map(d => `<div class="dh">${d}</div>`).join('')}${cells.map(d => `<div class="dc ${d.slice(0, 7) !== f.ym ? 'out' : ''} ${d === T ? 'today' : ''}"><span class="n">${+d.slice(8)}</span>${(byDay[d] || []).slice(0, 4).map(x => { const s = stOf(x); return `<span class="ev ${s === 'done' ? 'done' : s === 'late' ? 'late' : s === 'd7' ? 'soon' : ''}" data-id="${x.p.id}" title="${esc(x.m.name + ' — ' + x.p.name)}">${esc(x.m.name)} · ${esc(x.p.country)}</span>`; }).join('')}${(byDay[d] || []).length > 4 ? `<span class="small muted">+${byDay[d].length - 4}건</span>` : ''}</div>`).join('')}</div></div>`;
      const mv = n => { const d = new Date(y, mo - 1 + n, 1); f.ym = U.ymd(d).slice(0, 7); A.render(); };
      A.$('#c-prev', view).onclick = () => mv(-1); A.$('#c-next', view).onclick = () => mv(1); A.$('#c-today', view).onclick = () => { f.ym = T.slice(0, 7); A.render(); };
    }
    A.$$('[data-id]', body).forEach(el => (el.onclick = () => A.go(`/projects/${el.dataset.id}?tab=schedule`)));
    A.$$('[data-mode]', view).forEach(b => (b.onclick = () => { f.mode = b.dataset.mode; A.render(); }));
    A.$$('button[data-st]', view).forEach(b => (b.onclick = () => { f.st = b.dataset.st; A.render(); }));
    A.$('#s-owner', view).onchange = e => { f.owner = e.target.value; A.render(); };
    A.$('#s-st', view).onchange = e => { f.st = e.target.value; A.render(); };
    A.$('#btn-xls', view).onclick = () => A.downloadCSV('일정현황', ['상태', '일정', '사업번호', '사업명', '단계', '예정일', '완료일', '지연사유', '향후조치', '담당자'], rows.map(x => [{ done: '완료', late: '지연', d7: 'D-7이내', d30: '30일이내', later: '예정' }[stOf(x)], x.m.name, x.p.id, x.p.name, K.stageName(x.m.stage), x.m.plan, x.m.done || '', x.m.reason, x.m.action, A.uname(x.p.owner)]));
  });

  /* ── 성과지표 달성현황 (SFR-049) ──────────── */
  A.page('/performance', { menu: 'performance', title: '성과지표 달성현황' }, view => {
    const f = (A.state.pf = A.state.pf || { y: '', field: '', ct: '', st: '', lv: '', sort: { k: 'r', d: -1 } });
    const ps = A.visibleProjects().filter(p => p.perf);
    const all = ps.flatMap(p => A.measured(p).map(i => ({ p, i, a: A.achv(i) })));
    const rows = all.filter(x => (!f.y || x.p.endYear === +f.y) && (!f.field || x.p.field === f.field) && (!f.ct || x.p.country === f.ct) && (!f.st || x.a.k === f.st) && (!f.lv || x.i.level === f.lv));
    const get = (x, k) => ({ r: x.a.r, id: x.p.id, name: x.p.name, ind: x.i.name, y: x.p.endYear }[k]);
    const c = k => rows.filter(x => x.a.k === k).length;
    /* 추적조사 보고 현황 (2월) */
    const T = U.today(), TY = +T.slice(0, 4), curY = T >= `${TY}-02-28` ? TY : TY - 1;
    const trk = A.visibleProjects().flatMap(p => A.trackPlan(p).map(r => ({ p, r })));
    const tc = (y, s2) => trk.filter(x => x.r.due.startsWith(String(y)) && (!s2 || x.r.status === s2)).length;
    view.innerHTML = `
      ${A.ph('성과지표 달성현황', '사업별 성과(Outcome)·산출물(Output) 지표의 기준값·목표값·실적값·달성률 통합 조회 · 목표(Impact) 지표는 추적조사에서 측정', `<button class="btn" id="p-docs">${A.ICON.dl}성과문서 일괄 다운로드</button>${A.xlsBtn()}`, 'SFR-049')}
      <div class="kpis">
        <div class="kpi"><span class="k">성과관리 사업</span><span class="v">${ps.length}<small>건</small></span><span class="d">지표 ${all.length}개</span></div>
        <button class="kpi" data-st="ok"><span class="k"><span class="b ok"><span class="ic">●</span>달성</span></span><span class="v">${c('ok')}</span><span class="d">${pct((c('ok') / Math.max(1, c('ok') + c('bad'))) * 100)} (측정 완료 지표 기준)</span></button>
        <button class="kpi" data-st="bad"><span class="k"><span class="b bad"><span class="ic">▲</span>미달성</span></span><span class="v">${c('bad')}</span></button>
        <button class="kpi" data-st="ing"><span class="k"><span class="b mute"><span class="ic">○</span>진행중</span></span><span class="v">${c('ing')}</span><span class="d">종료선 조사 전</span></button>
      </div>
      <div class="g-7-5">
        <div class="card"><div class="hd"><h3>분야별 지표 달성 현황</h3><div class="legend"><span><i style="background:var(--stGood)"></i>달성</span><span><i style="background:var(--stCrit)"></i>미달성</span><span><i style="background:var(--pre)"></i>진행중</span></div></div><div class="bd"><div class="chart" id="pch" role="img" aria-label="분야별 성과지표 달성 현황 누적 막대"></div></div></div>
        <div class="card"><div class="hd"><h3>추적조사 보고 현황 (매년 2월)</h3><a class="small" href="#/feedback">성과 환류 →</a></div><div class="tw"><table class="tbl"><thead><tr><th>보고 연도</th><th class="num">대상</th><th class="num">제출</th><th class="num">미제출</th><th class="num">면제</th><th class="num">예정</th></tr></thead><tbody>
          ${[curY - 2, curY - 1, curY, curY + 1].map(y => `<tr><td class="mono">’${String(y).slice(2)}.2</td><td class="num">${tc(y)}</td><td class="num">${tc(y, '제출')}</td><td class="num">${tc(y, '미제출') ? `<span class="b bad"><span class="ic">▲</span>${tc(y, '미제출')}</span>` : 0}</td><td class="num">${tc(y, '면제')}</td><td class="num">${tc(y, '예정')}</td></tr>`).join('')}
        </tbody></table></div><div class="bd small muted" style="padding-top:8px">종료 후 프로젝트 5년 · 연수 1년 · 그 외 3년 · 2023년 이후 종료분 (성과관리 지침 제26조). 시행기관별 비교·환류과제는 성과 환류 화면에서 관리합니다.</div></div>
      </div>
      <div class="bar">
        <div class="fl"><span>종료연도</span><select id="p-y">${A.opts(A.uniq(ps, 'endYear').reverse(), f.y)}</select></div>
        <div class="fl"><span>분야</span><select id="p-field">${A.opts(A.uniq(ps, 'field'), f.field)}</select></div>
        <div class="fl"><span>국가</span><select id="p-ct">${A.opts(A.uniq(ps, 'country'), f.ct)}</select></div>
        <div class="fl"><span>구분</span><select id="p-lv">${A.opts(['Outcome', 'Output'], f.lv)}</select></div>
        <div class="fl"><span>달성여부</span><select id="p-st">${A.opts([['ok', '달성'], ['bad', '미달성'], ['ing', '진행중']], f.st)}</select></div>
        <span class="sp"></span><span class="summary">조회 <b>${rows.length}</b>개 지표</span>
      </div>
      <div class="card"><div class="tw" style="max-height:600px"><table class="tbl"><thead id="pth"></thead><tbody id="ptb"></tbody></table></div></div>`;
    const cols = [{ k: 'id', n: '사업번호' }, { k: 'name', n: '사업명' }, { k: 'y', n: '종료' }, { n: '구분' }, { k: 'ind', n: '성과지표' }, { n: '기준값', cls: 'num' }, { n: '목표값', cls: 'num' }, { n: '실적값', cls: 'num' }, { k: 'r', n: '달성률', cls: 'num' }, { n: '달성여부' }];
    const draw = () => {
      const r = rows.slice().sort(A.sorter(f.sort, get));
      A.sortHead(cols, f.sort, A.$('#pth', view), s => { f.sort = s; draw(); });
      A.$('#ptb', view).innerHTML = r.map(x => `<tr class="click" data-id="${x.p.id}"><td class="mono small">${x.p.id}</td><td class="nm"><span class="t">${esc(x.p.name)}</span></td><td class="mono small">${x.p.endYear}</td><td><span class="b ${x.i.level === 'Outcome' ? 'info' : 'mute'}">${x.i.level}</span></td><td class="ink">${esc(x.i.name)} <span class="muted small">(${esc(x.i.unit)})</span></td><td class="num">${x.i.base}</td><td class="num">${x.i.target}</td><td class="num">${x.i.end ?? '-'}</td><td class="num">${x.a.r == null ? '-' : pct(x.a.r, 0)}</td><td>${A.achvBadge(x.a)}</td></tr>`).join('') || '<tr><td colspan="10" class="empty">조건에 맞는 지표가 없습니다.</td></tr>';
      A.$$('#ptb [data-id]', view).forEach(tr => (tr.onclick = () => A.go(`/projects/${tr.dataset.id}?tab=perf`)));
    };
    draw();
    const fields = A.uniq(all, x => x.p.field);
    A.chart(A.$('#pch', view), {
      grid: { left: 8, right: 16, top: 8, bottom: 4, containLabel: true }, tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      yAxis: { type: 'category', data: fields, inverse: true, ...A.axis({ splitLine: { show: false } }) }, xAxis: { type: 'value', ...A.axis({ axisLabel: { color: A.cv('--muted') } }) },
      series: [['ok', '달성', '--stGood'], ['bad', '미달성', '--stCrit'], ['ing', '진행중', '--pre']].map(([k, n, col], i, arr) => ({ type: 'bar', name: n, stack: 's', barMaxWidth: 18, data: fields.map(fl => all.filter(x => x.p.field === fl && x.a.k === k).length), itemStyle: { color: A.cv(col), borderColor: A.cv('--chartSurface'), borderWidth: 1, borderRadius: i === arr.length - 1 ? [0, 4, 4, 0] : 0 } })),
    });
    [['y', 'p-y'], ['field', 'p-field'], ['ct', 'p-ct'], ['lv', 'p-lv'], ['st', 'p-st']].forEach(([k, id]) => (A.$('#' + id, view).onchange = e => { f[k] = e.target.value; A.render(); }));
    A.$$('button[data-st]', view).forEach(b => (b.onclick = () => { f.st = f.st === b.dataset.st ? '' : b.dataset.st; A.render(); }));
    A.$('#btn-xls', view).onclick = () => A.downloadCSV('성과지표달성현황', ['사업번호', '사업명', '국가', '분야', '종료연도', '구분', '성과지표', '단위', '기준값', '목표값', '실적값', '달성률(%)', '달성여부'], rows.map(x => [x.p.id, x.p.name, x.p.country, x.p.field, x.p.endYear, x.i.level, x.i.name, x.i.unit, x.i.base, x.i.target, x.i.end ?? '', x.a.r == null ? '' : x.a.r.toFixed(1), x.a.n]));
    A.$('#p-docs', view).onclick = () => { const n = A.uniq(rows, x => x.p.id).length; A.toast(`프로토타입: 조회된 ${n}개 사업의 PDM·조사보고서·자체평가서 일괄 다운로드(ZIP)는 본 구축 시 제공됩니다.`); };
  });
})(window.App);
