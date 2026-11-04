/* 성과 환류 — 추적조사 → 평가·분석 → 환류과제 → 다음 사업 (로드맵 시안 ⑧, 제안요청서 필요성 ③④ · 기대효과) */
(function (A) {
  const { esc, pct, U, K } = A;
  const sym = v => (v === '●' ? '<span class="b ok"><span class="ic">●</span>유지</span>' : v === '◐' ? '<span class="b warn"><span class="ic">◐</span>부분</span>' : v === '○' ? '<span class="b bad"><span class="ic">○</span>미흡</span>' : esc(v));
  const USES = ['사업관리 개선', '시행기관 환류', '신규사업 기획', '수행체계 보완'];
  const TASK_ST = ['수립', '이행 중', '후보 등록 대기', '결과 보고', '완료'];

  A.page('/feedback', { menu: 'feedback', title: '성과 환류' }, (view, _, q) => {
    const T = U.today(), TY = +T.slice(0, 4);
    const all = A.visibleProjects();
    const st = (A.state.fb = A.state.fb || { pid: null });
    if (q.pid) { st.pid = q.pid; history.replaceState(null, '', '#/feedback'); }
    const curY = T >= `${TY}-02-28` ? TY : TY - 1, nextY = curY + 1;
    const dueCur = all.flatMap(p => A.trackPlan(p).filter(r => r.due.startsWith(String(curY))).map(r => ({ p, r })));
    const dueNext = all.filter(p => A.isDue(p, nextY));
    const c = s => dueCur.filter(x => x.r.status === s).length;
    const withRep = all.filter(p => p.perf && p.perf.tracking.some(t => t.status === '제출'));
    const sel = (st.pid && A.P(st.pid)) || withRep[0];
    const subm = sel ? A.trackPlan(sel).filter(r => r.status === '제출') : [];
    /* 시행기관별 성과 비교 (기대효과 원문 5개 지표) */
    const agencies = A.uniq(all.filter(p => p.migrated), 'proposer').map(ag => {
      const pp = all.filter(p => p.migrated && p.proposer === ag);
      const reps = pp.flatMap(p => (p.perf ? p.perf.tracking.filter(t => t.status === '제출') : []));
      const ms = pp.flatMap(p => p.schedule.filter(m => m.done));
      const share = k => (reps.length ? (reps.filter(t => t.items[k] === '●').length / reps.length) * 100 : null);
      return { ag, n: pp.length, ontime: ms.length ? (ms.filter(m => m.done <= m.plan).length / ms.length) * 100 : null, keep: share('keep'), use: share('use'), care: share('aftercare'), next: pp.reduce((s, p) => s + p.nextIds.length, 0), orders: reps.reduce((s, t) => s + (t.items.orders || 0), 0), reps: reps.length };
    }).sort((a, b) => (b.keep ?? -1) - (a.keep ?? -1));
    const cell = v => (v == null ? '<span class="muted">-</span>' : v < 70 ? `<span class="b warn"><span class="ic">▲</span>${pct(v, 0)}</span>` : pct(v, 0));
    /* 후속·연계 발굴 후보: 최근 추적조사에서 후속·연계 필요성 '●' & 아직 후속사업 없음 */
    const cand = withRep.filter(p => !p.nextIds.length && (p.perf.tracking.filter(t => t.status === '제출').slice(-1)[0] || {}).items?.need === '●');
    view.innerHTML = `
      ${A.ph('성과 환류', '추적조사 결과를 표준 항목으로 쌓고, 시행기관별로 비교하고, 환류과제와 다음 사업 발굴로 잇습니다', '', '필요성 ③④ · SFR-047·049')}
      <div class="fbflow">${[['추적조사', '매년 2월 · 차수별 누적'], ['평가 · 분석', '표준 항목 · 시행기관별'], ['환류과제', '수립 → 이행 → 결과 보고'], ['다음 사업', '후속·연계 발굴']].map((x, i) => `${i ? '<i>→</i>' : ''}<div class="fbn ${i === 3 ? 'on' : ''}"><b>${x[0]}</b><small>${x[1]}</small></div>`).join('')}<i class="fbloop">↺</i></div>
      <div class="notice info"><span>ⓘ</span><span class="grow"><b>SFR 공백을 채우는 화면</b> — 제안요청서 필요성과 기대효과는 "정량적 성과평가 및 환류체계 마련", "축적된 평가자료를 사업관리 개선, 시행기관 환류, 신규사업 기획 및 수행체계 보완 등에 활용"을 요구하지만 기능 요구사항(SFR-045~049)은 달성현황 조회에서 끝납니다.</span></div>
      <div class="grid2">
        <div class="card"><div class="hd"><h3>① ’${String(curY).slice(2)}.2 추적조사 제출 현황 <span class="tag">♥ 추가 제안</span></h3><span class="note">성과관리 지침 제26조</span></div><div class="bd stack" style="gap:10px">
          <div class="kpis"><div class="kpi"><span class="k">보고 대상</span><span class="v">${dueCur.length}<small>건</small></span></div><div class="kpi"><span class="k"><span class="b ok"><span class="ic">✓</span>제출</span></span><span class="v">${c('제출')}</span></div><div class="kpi ${c('미제출') ? 'alert' : ''}"><span class="k"><span class="b bad"><span class="ic">▲</span>미제출</span></span><span class="v">${c('미제출')}</span></div><div class="kpi"><span class="k"><span class="b mute">면제</span></span><span class="v">${c('면제')}</span></div></div>
          ${dueCur.filter(x => x.r.status !== '제출').map(x => `<div class="notice ${x.r.status === '미제출' ? 'bad' : ''}"><span>${x.r.status === '미제출' ? '▲' : '–'}</span><span class="grow"><a href="#/projects/${x.p.id}?tab=perf">${x.p.id} ${esc(x.p.name)}</a> · ${x.r.round}차 ${x.r.status}${x.r.t && x.r.t.exemptReason ? ` — ${esc(x.r.t.exemptReason)}` : ` (기한 ${x.r.due}, ${-U.diffD(T, x.r.due)}일 경과) · 담당 ${A.uname(x.p.owner)}`}</span></div>`).join('')}
          <div class="notice warn"><span>⏱</span><span class="grow"><b>’${String(nextY).slice(2)}.2 보고 대상 ${dueNext.length}건 · D-${U.diffD(T, `${nextY}-02-28`)}</b> — 1월 15일·2월 15일 수행기관·담당자 알림 예정 <a href="#/roadmap?due=1">로드맵에서 보기 →</a></span></div>
        </div></div>
        <div class="card"><div class="hd"><h3>② 추적조사 표준 항목 · 차수별</h3><select class="btn sm" id="fb-p" aria-label="사업 선택">${withRep.map(p => `<option value="${p.id}" ${sel && p.id === sel.id ? 'selected' : ''}>${p.id} ${esc(p.name.slice(0, 26))}</option>`).join('')}</select></div>
          ${sel ? `<div class="bd" style="padding-bottom:6px"><span class="small muted">${esc(sel.type)} · ${sel.endYear} 종료 · ${K.TRACK(sel.type)}년 · 매년 2월</span> <a class="small" href="#/projects/${sel.id}?tab=perf">사업 성과관리 →</a></div>
          <div class="tw"><table class="tbl"><thead><tr><th>표준 항목 (제안요청서 기대효과)</th>${subm.map(r => `<th>${r.round}차 ’${String(r.due).slice(2, 4)}.2</th>`).join('')}</tr></thead><tbody>
          ${K.TRACK_ITEMS.map(([k, n, ref]) => `<tr><td class="ink">${n}${ref ? ` <span class="tagx fact">${ref}</span>` : ''}</td>${subm.map(r => `<td>${k === 'orders' ? `${r.t.items.orders}건` : k === 'side' ? esc(r.t.items.side) : sym(r.t.items[k])}</td>`).join('')}</tr>`).join('')}
          </tbody></table></div>` : '<div class="empty">제출된 추적조사 보고서가 없습니다.</div>'}</div>
      </div>
      <div class="card"><div class="hd"><h3>③ 시행기관별 성과 비교</h3><span class="note">기대효과 "시행기관별·연도별·사업유형별 수행실적을 객관적으로 비교·분석" · 70% 미만 ▲ 표시 · 산식은 착수 후 센터와 확정</span></div>
        <div class="tw"><table class="tbl"><thead><tr><th>시행기관</th><th class="num">사업</th><th class="num">추적보고</th><th class="num">일정 준수율</th><th class="num">성과 달성·유지율</th><th class="num">산출물 활용률</th><th class="num">사후관리 이행률</th><th class="num">후속·연계 창출</th><th class="num">국내기업 수주</th></tr></thead><tbody>
        ${agencies.map(a => `<tr><td class="ink nowrap">${esc(a.ag)}</td><td class="num">${a.n}</td><td class="num">${a.reps}</td><td class="num">${cell(a.ontime)}</td><td class="num">${cell(a.keep)}</td><td class="num">${cell(a.use)}</td><td class="num">${cell(a.care)}</td><td class="num">${a.next}건</td><td class="num">${a.orders}건</td></tr>`).join('')}
        </tbody></table></div><div class="bd small muted" style="padding-top:8px">시행기관 환류: 성과평가 우수 → 기술평가 가점, 경고·제재 → 기술평가 감점 (성과평가위원회 지침 제8조⑤, 기술평가 별표4). 값은 시연용 생성 데이터 기준.</div></div>
      <div class="g-7-5">
        <div class="card"><div class="hd"><h3>④ 평가환류과제</h3><div class="row"><span class="note">성과관리 지침 제18조</span>${A.can('feedback', 'c') ? '<button class="btn sm pri" id="fb-add">과제 등록</button>' : ''}</div></div>
          <div class="tw"><table class="tbl"><thead><tr><th>과제</th><th>관련 사업</th><th>활용처</th><th>상태</th><th>등록</th></tr></thead><tbody>
          ${A.db.fbTasks.map(t => `<tr><td class="ink">${esc(t.task)}</td><td class="small">${t.pid ? `<a href="#/projects/${t.pid}?tab=perf">${t.pid}</a>` : '-'}</td><td><span class="b info">${esc(t.use)}</span></td><td>${A.can('feedback', 'u') ? `<select class="btn sm" data-tk="${t.id}">${A.opts(TASK_ST, t.status, null)}</select>` : esc(t.status)}</td><td class="small mono nowrap">${t.at.slice(0, 10)} · ${A.uname(t.by)}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">등록된 환류과제가 없습니다.</td></tr>'}
          </tbody></table></div><div class="bd small muted" style="padding-top:8px">활용처 4개는 제안요청서 기대효과 원문: 사업관리 개선 · 시행기관 환류 · 신규사업 기획 · 수행체계 보완</div></div>
        <div class="card"><div class="hd"><h3>⑤ 다음 사업 — 후속·연계 발굴 후보</h3><span class="note">최근 추적조사 '후속·연계 필요성' ●</span></div>
          <div class="tw"><table class="tbl"><tbody>${cand.map(p => `<tr><td><a href="#/projects/${p.id}?tab=perf">${p.id}</a><div class="small">${esc(p.name)}</div></td><td class="nowrap">${A.can('projects', 'c') ? `<a class="btn sm pri" href="#/projects/new?prev=${p.id}">후속·연계 발굴 등록</a>` : ''}</td></tr>`).join('') || '<tr><td class="empty">후보가 없습니다.</td></tr>'}</tbody></table></div>
          <div class="bd small muted" style="padding-top:8px">등록하면 원사업이 연결된 채로 발굴 등록 화면이 열리고, 원사업의 '환류 → 다음 발굴' 단계에 후속 사업ID가 기록됩니다 (전 주기가 다음 사업으로 이어짐).</div></div>
      </div>`;
    A.$('#fb-p', view) && (A.$('#fb-p', view).onchange = e => { st.pid = e.target.value; A.render(); });
    A.$$('[data-tk]', view).forEach(s => (s.onchange = () => { const t = A.db.fbTasks.find(x => x.id === s.dataset.tk); const b = t.status; t.status = s.value; if (t.pid) A.hist(t.pid, '성과', '환류과제', `${t.task.slice(0, 20)}… ${b}`, s.value); A.save(); A.toast('환류과제 상태를 변경했습니다.', 'ok'); }));
    A.$('#fb-add', view) && (A.$('#fb-add', view).onclick = () => {
      const m = A.modal({ title: '평가환류과제 등록', body: `<div class="f req"><label>과제</label><textarea id="t-t" placeholder="예) 운영인력 이직으로 산출물 활용 저하 → 사후관리 계획에 인력 유지 조건 추가"></textarea></div>
        <div class="form" style="grid-template-columns:1fr 1fr"><div class="f req"><label>활용처</label><select id="t-u">${A.opts(USES, USES[0], null)}</select></div><div class="f"><label>관련 사업</label><select id="t-p">${A.opts(withRep.map(p => [p.id, `${p.id} ${p.name.slice(0, 20)}`]), sel ? sel.id : '', '없음')}</select></div></div>`, foot: '<button class="btn" data-close>취소</button><button class="btn pri" id="t-ok">등록</button>' });
      m.$('#t-ok').onclick = () => {
        const task = m.$('#t-t').value.trim(); if (!task) { A.toast('과제를 입력하세요.', 'bad'); return; }
        const t = { id: 'F' + String(A.db.seq.fb++).padStart(4, '0'), pid: m.$('#t-p').value || null, task, use: m.$('#t-u').value, status: '수립', by: A.me().id, at: U.nowStamp() };
        A.db.fbTasks.unshift(t); if (t.pid) A.hist(t.pid, '성과', '환류과제', '', task);
        A.save(); m.close(); A.toast('환류과제를 등록했습니다.', 'ok'); A.render();
      };
    });
  });
})(window.App);
