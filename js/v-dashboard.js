/* 전 주기 현황판 (대시보드) */
(function (A) {
  const { esc, num, eok, U, K } = A;

  A.page('/dashboard', { menu: 'dashboard', title: '전 주기 현황판' }, view => {
    const me = A.me();
    const T = U.today(), TY = +T.slice(0, 4);
    const scope = me.role === 'STAFF' ? A.visibleProjects() : A.projects();
    const queue = A.myQueue();
    const mine = A.db.approvals.filter(a => a.drafter === me.id && ['PENDING', 'RETURNED', 'SUPPLEMENT'].includes(a.status));
    const ms = scope.flatMap(p => p.schedule.filter(m => !m.done).map(m => ({ ...m, p, dd: U.diffD(T, m.plan) })));
    const late = ms.filter(m => m.dd < 0);
    const soon = ms.filter(m => m.dd >= 0 && m.dd <= 30).sort((a, b) => a.dd - b.dd);
    const ongoing = scope.filter(p => p.stage === 'ONGOING');
    const qc = scope.filter(p => p.qc.length);
    const curY = T >= `${TY}-02-28` ? TY : TY - 1, nextY = curY + 1;
    const dueNext = scope.filter(p => A.isDue(p, nextY));
    const dueCur = scope.flatMap(p => A.trackPlan(p).filter(r => r.due.startsWith(String(curY))));
    const pipe = scope.filter(p => ['DISCOVERED', 'PRELIM', 'HELD'].includes(p.stage));
    const subCnt = (k, s) => scope.filter(p => p.stage === k && p.sub === s).length;

    view.innerHTML = `
      ${A.ph(`${esc(me.name)} ${esc(me.title)}님, 안녕하세요`, `전 주기 현황판 · ${me.role === 'STAFF' ? '담당 사업 기준' : '센터 전체 사업 기준'} · ${T} 현재`, `
        ${A.can('projects', 'c') ? `<a class="btn pri" href="#/projects/new">${A.ICON.plus}사업 등록 (발굴)</a>` : ''}
        <a class="btn" href="#/roadmap">전 주기 로드맵</a>`)}
      <div class="kpis">
        <a class="kpi" href="#/projects"><span class="k">${me.role === 'STAFF' ? '내 담당 사업' : '등록 사업'}</span><span class="v">${num(scope.length)}<small>건</small></span><span class="d">계약금액 합계 ${eok(scope.reduce((s, p) => s + (p.contractAmt || 0), 0))}원</span></a>
        <a class="kpi" href="#/projects?stage=ONGOING"><span class="k">수행</span><span class="v">${num(ongoing.length)}<small>건</small></span><span class="d">집행률 ${A.pct(ongoing.reduce((s, p) => s + A.execOf(p), 0) / Math.max(1, ongoing.reduce((s, p) => s + (p.contractAmt || 0), 0)) * 100)}</span></a>
        <a class="kpi ${queue.length ? 'alert' : ''}" href="#/approvals"><span class="k">내 결재 대기</span><span class="v">${queue.length}<small>건</small></span><span class="d">내가 상신·진행 ${mine.length}건</span></a>
        <a class="kpi ${late.length ? 'alert' : ''}" href="#/schedule?st=late"><span class="k">일정 지연</span><span class="v">${late.length}<small>건</small></span><span class="d">30일 내 도래 ${soon.length}건</span></a>
        <a class="kpi" href="#/proposals"><span class="k">공모·심의 진행</span><span class="v">${pipe.length}<small>건</small></span><span class="d">발굴 선정 ${subCnt('DISCOVERED', '선정')} · 예비 의결 ${subCnt('PRELIM', '의결')} · 보류 ${scope.filter(p => p.stage === 'HELD').length}</span></a>
        <a class="kpi" href="#/roadmap?due=1"><span class="k">’${String(nextY).slice(2)}.2 추적조사 보고 대상 <span class="tag">♥</span></span><span class="v">${dueNext.length}<small>건</small></span><span class="d">D-${U.diffD(T, `${nextY}-02-28`)} · ’${String(curY).slice(2)}.2 미제출 ${dueCur.filter(r => r.status === '미제출').length}건</span></a>
        <a class="kpi" href="#/projects?qc=1"><span class="k">이관자료 정비 필요</span><span class="v">${qc.length}<small>건</small></span><span class="d">필수항목 공란·코드 불일치</span></a>
      </div>
      <div class="card"><div class="hd"><h2>단계별 추진현황</h2><span class="note">발굴(N-2) → 예비(N-1) → 확정(N) → 계약 → 수행 → 종료 → 추적조사 · 보류·미선정은 같은 사업ID로 재제안</span></div>
        <div class="bd"><div class="pipe">${K.STAGES.map(s => {
          const subs = K.SUBS[s.k] ? K.SUBS[s.k].map(x => [x, subCnt(s.k, x)]).filter(x => x[1]) : [];
          return `<a href="#/projects?stage=${s.k}"><span class="k">${A.stageBadge(s.k)}</span><span class="v">${scope.filter(p => p.stage === s.k).length}</span><span class="y">${subs.length ? subs.map(x => `${x[0]} ${x[1]}`).join(' · ') : s.y || '&nbsp;'}</span></a>`;
        }).join('')}</div></div></div>
      <div class="g-7-5">
        <div class="stack">
          <div class="card"><div class="hd"><h2>처리할 결재</h2><a class="small" href="#/approvals">결재함 →</a></div>
            <div class="tw"><table class="tbl"><thead><tr><th>구분</th><th>제목</th><th>기안자</th><th>상신일</th><th>상태</th></tr></thead><tbody>
            ${[...queue, ...mine.filter(a => !queue.includes(a))].slice(0, 6).map(a => `<tr class="click" data-ap="${a.id}"><td class="nowrap">${A.AP_T[a.type]}</td><td class="ink">${esc(a.title)}<div class="muted small">${a.pid ? esc((A.P(a.pid) || {}).name || a.pid) : '신규 사업'}</div></td><td class="nowrap">${A.uname(a.drafter)}</td><td class="mono small nowrap">${a.createdAt.slice(0, 10)}</td><td>${queue.includes(a) ? '<span class="b acc">내 차례</span>' : A.apBadge(a.status)}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">처리할 결재가 없습니다.</td></tr>'}
            </tbody></table></div></div>
          <div class="card"><div class="hd"><h2>기한 도래 · 지연</h2><a class="small" href="#/schedule">일정 관리 →</a></div>
            <div class="tw"><table class="tbl"><thead><tr><th>D-day</th><th>일정</th><th>사업</th><th>예정일</th><th>담당</th></tr></thead><tbody>
            ${[...late.sort((a, b) => a.dd - b.dd), ...soon].slice(0, 8).map(m => `<tr class="click" data-href="#/projects/${m.p.id}?tab=schedule"><td>${m.dd < 0 ? `<span class="b bad">지연 ${-m.dd}일</span>` : m.dd <= 7 ? `<span class="b warn">D-${m.dd}</span>` : `<span class="b mute">D-${m.dd}</span>`}</td><td class="ink nowrap">${esc(m.name)}</td><td><span style="display:block;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(m.p.name)}</span></td><td class="mono small">${m.plan}</td><td class="nowrap">${A.uname(m.p.owner)}</td></tr>`).join('')}
            <tr class="click" data-href="#/feedback"><td><span class="b ${U.diffD(T, `${nextY}-02-28`) <= 120 ? 'warn' : 'mute'}">D-${U.diffD(T, `${nextY}-02-28`)}</span></td><td class="ink nowrap">’${String(nextY).slice(2)}.2 추적조사 보고 <span class="tag">♥ 추가</span></td><td>추적조사 대상 ${dueNext.length}건 (’${String(curY).slice(2)}.2 제출 ${dueCur.filter(r => r.status === '제출').length} · 미제출 ${dueCur.filter(r => r.status === '미제출').length} · 면제 ${dueCur.filter(r => r.status === '면제').length})</td><td class="mono small">${nextY}-02-28</td><td class="small">성과관리 지침 제26조</td></tr>
            </tbody></table></div></div>
        </div>
        <div class="stack">
          <div class="card"><div class="hd"><h2>연도별 계약금액</h2><span class="note">시작연도 기준 · 억원</span></div><div class="bd"><div class="chart short" id="ch-year" role="img" aria-label="연도별 계약금액 막대그래프"></div></div></div>
          <div class="card"><div class="hd"><h2>최근 확정 이력</h2><span class="note">결재 승인·외부 결정 확정분</span></div>
            <div class="bd" style="padding-top:8px"><ul class="tl">${A.db.history.filter(h => scope.some(p => p.id === h.pid) && h.cat !== '결재').slice(0, 7).map(h => `<li><div class="d">${h.at} · ${A.uname(h.by)}</div><div class="t">${esc(h.cat)} · ${esc(h.label)}</div><div class="x">${esc((A.P(h.pid) || {}).name || h.pid)}</div></li>`).join('')}</ul></div></div>
        </div>
      </div>`;

    A.$$('[data-ap]', view).forEach(tr => (tr.onclick = () => A.go('/approvals?open=' + tr.dataset.ap)));
    A.$$('[data-href]', view).forEach(tr => (tr.onclick = () => (location.hash = tr.dataset.href)));

    const years = A.uniq(scope.filter(p => p.contractAmt), 'startYear');
    A.chart(A.$('#ch-year', view), {
      grid: { left: 8, right: 8, top: 14, bottom: 4, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: v => v.toFixed(1) + '억원' },
      xAxis: { type: 'category', data: years.map(String), ...A.axis({ splitLine: { show: false } }) },
      yAxis: { type: 'value', ...A.axis({ axisLine: { show: false } }) },
      series: [A.bar({ name: '계약금액', data: years.map(y => scope.filter(p => p.startYear === y).reduce((s, p) => s + (p.contractAmt || 0), 0) / 1e8), itemStyle: { color: A.sc(0), borderRadius: [4, 4, 0, 0] } })],
    });
    /* 시스템 공지 팝업 — 세션당 한 번 */
    if (!A.state.popShown && A.showPopup) {
      A.state.popShown = true;
      const pop = (A.db.noti.popups || []).find(p => p.on && p.from <= T && T <= p.to);
      if (pop) setTimeout(() => A.showPopup(pop), 250);
    }
  });
})(window.App);
