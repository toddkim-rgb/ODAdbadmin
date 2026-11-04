/* 사업 전 주기 로드맵 · 연도별 추진현황판 · 공모·미선정 관리 — '사업 전 주기 로드맵' 제안 시안 반영 */
(function (A) {
  const { esc, num, eok, won, pct, U, K } = A;

  /* 제안요청서 요구사항 대응 근거 (로드맵 시안 표) */
  const REQ = [
    [1, '필수', true, '단계별 추진현황', '① 전 주기 분산 · ② 재제안 이력', '사업범위 나, SFR-017', '발굴(N-2)·예비(N-1)·의결·확정(N)·계약체결… 선정·보류·탈락·확정 상태 관리, "단계별 추진현황을 한눈에 확인할 수 있는 목록 및 시각화 화면"', '이 로드맵 · 사업 상세 전 주기 · 공모·미선정 관리'],
    [2, '필수', true, '확정 이력', '④ 표준 데이터 · ⑤ 업무 연속성 · 공개 사실 ① 문서마다 다른 값', 'SFR-028, 017', '"결재 승인 완료된 변경 이력만 확정 이력으로 기록", 이력 수정·삭제 불가(Read Only), 수정 시 결재 승인 후 반영', '상세 패널 ② 확정 상태 · 변경이력 탭'],
    [3, '필수', false, '일정·지연', '① 전 주기 분산 · ⑤ 업무 연속성', '사업범위 나, SFR-006', '예정일·완료일·지연 여부·지연 사유·향후 조치, 단계별 주요 일정, 일정 도래 시 담당자 알림', '상세 패널 ③ 다음 일정 · 2월 추적 보고 칩'],
    [4, '필수', false, '성과 이력', '③ 종료 후 성과 축적 · ④ 시행기관 정량 평가 · 공개 사실 ②③', 'SFR-045~049', 'PDM 기초선, 기초선 대비 종료선 비교, 추적조사 차수별 다건, 자체평가(결재 연동), 지표별 달성·미달성·진행중', '상세 패널 ④ 성과지표 · 추적 차수'],
    [5, '중요', false, '입찰·계약', '④ 시행기관 정량 평가 · ⑤ 통계 산출', 'SFR-018·019', '낙찰률·낙찰차액 자동 계산, 계약 변경 전·후 이력, 입찰 선정 지표(PCP·수원총괄기관 공문·사전타당성조사)', '상세 패널 ⑤ 계약·집행'],
    [6, '중요', false, '예산변경·집행', '④ 시행기관 정량 평가 · ⑤ 통계 산출', 'SFR-022·023·032', '항목별 집행금액, 결재 승인 시 계약금액 자동 반영, 계약금액 대비 집행률', '상세 패널 ⑤ 계약·집행'],
    [7, '보통', false, '낙찰차액 활용', '직접 연결 없음 (제안요청서 SFR에만 있음)', 'SFR-024·025', '활용 계획 대비 실적, 잔여 낙찰차액 자동 산출', '사업 상세 › 낙찰차액'],
  ];
  const MATCH = [
    ['발굴', '●◐◐····', 6, '중간', '사업범위 나 N-2 발굴·선정·보류·탈락, SFR-017', '점수는 중간이지만 ★ 잇다의 출발점 - 사업번호가 여기서 생김'],
    ['심의', '●·◐····', 4.5, '중간', '사업범위 나 N-1 예비사업', '위원회 의결은 외부 결정 기록'],
    ['확정', '●·◐····', 4.5, '중간', '사업범위 나 N 의결·확정', '국제개발협력위원회 확정 기록'],
    ['조달·계약', '●●◐·●·●', 10.5, '높음', '사업범위 나 계약체결, SFR-017·018·019·024·025·026~028', '낙찰률·낙찰차액 자동 계산, 계약 수정 결재'],
    ['수행', '●●●◐·●·', 12.5, '높음', 'SFR-017 수행, 사업범위 나 일정·문서, SFR-022·023·032, SFR-045 기초선', '일정·예산변경·집행·문서가 가장 많이 쌓이는 구간'],
    ['종료평가·정산·인계', '●◐◐●·◐·', 10, '높음', 'SFR-017 완료, SFR-046 종료선 비교', '기초선 대비 종료선 비교가 여기서 확정'],
    ['인계 후 운영', '···◐···', 1.5, '낮음', '(제안요청서 직접 요구 없음 - 지침·추적조사가 점검)', '사업DB 밖 구간'],
    ['추적조사', '◐·◐●···', 6, '중간', 'SFR-047 차수별 다건, 필요성 ③', "제안요청서는 '주기적', 지침은 '매년 2월'"],
    ['평가·환류', '·◐·●···', 4.5, '중간', 'SFR-048 자체평가(결재 연동)·049 달성현황, 필요성 ③④', '환류과제는 지침(성관 제18조)에만 있음'],
  ];

  /* ── 전 주기 로드맵 (간트) ───────────────────── */
  const Y0 = 2011, Y1 = 2036, YW = 34;
  const X = y => (y - Y0) * YW;
  /* 미선정·보류 표시 — 짧은 구간(몇 개월 = 수 px) 위에 글자가 겹치지 않도록 구간 끝 바로 뒤에 아이콘 배지로 표시 */
  const BADGE = {
    x: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3.8 3.8l4.4 4.4M8.2 3.8l-4.4 4.4"/></svg>',
    hold: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4.6 3.6v4.8M7.4 3.6v4.8"/></svg>',
  };
  A.rmBadge = (cls, extra = '') => `<b class="rm-badge ${cls} ${extra}">${BADGE[cls]}</b>`;
  const bars = (p, NOW) => {
    const out = [];
    const seg = (cls, a, b, t) => { const l = X(a) + 1, w = Math.max(X(b) - X(a) - 2, 6); out.push(`<i class="sg ${cls}" style="left:${l}px;width:${w}px" title="${esc(t)}"></i>`); return l + w; };
    const mk = (cls, at, ch, t) => out.push(`<b class="mk ${cls}" style="left:${X(at) - 5}px" title="${esc(t)}">${ch}</b>`);
    let taken = 0;
    const badge = (cls, px, t) => { out.push(`<b class="rm-badge ${cls}" style="left:${Math.round(px) + 2}px" title="${esc(t)}">${BADGE[cls]}</b>`); taken = Math.max(taken, px + 16); };
    p.rounds.forEach(r => {
      const hs = p.stageHist.filter(h => (h.round || 1) === r.round);
      if (!hs.length) return;
      const end = seg('pre', U.yfrac(hs[0].d), U.yfrac(hs[hs.length - 1].d), `${r.round}차 제안 · ${r.result}(${r.at})`);
      badge(r.result === '보류' ? 'hold' : 'x', end, `${r.round}차 ${r.result} — ${r.reason}`);
    });
    const cur = p.stageHist.filter(h => (h.round || 1) === (p.round || 1));
    const d0 = cur.find(h => h.k === 'DISCOVERED'), conf = cur.find(h => h.k === 'CONFIRMED'), con = cur.find(h => h.k === 'CONTRACTED');
    const last = cur[cur.length - 1];
    const preEnd = conf ? U.yfrac(conf.d) : con ? U.yfrac(con.d) : ['REJECTED', 'HELD'].includes(p.stage) ? U.yfrac(last.d) : NOW;
    const preX = d0 ? seg(d0.calc ? 'pre est' : 'pre', U.yfrac(d0.d), Math.max(preEnd, U.yfrac(d0.d) + 0.1), d0.calc ? '발굴·예비 (공개 자료에 일자 없음 · 계산)' : `발굴·예비 ${d0.d} ~ ${last.d} (실제 일자)`) : X(preEnd);
    if (p.stage === 'REJECTED') badge('x', preX, `미선정(${p.sub}) ${last.d} — ${last.reason}`);
    if (p.stage === 'HELD') badge('hold', preX, `보류(${p.sub}) ${last.d} — ${last.reason}`);
    if (['DISCOVERED', 'PRELIM', 'CONFIRMED', 'HELD'].includes(p.stage)) seg('plan', Math.max(p.startYear, Y0 + (taken + 2) / YW), p.endYear + 1, `수행 예정 ${p.startYear}–${p.endYear}`);
    if (p.startDate) seg('run', U.yfrac(p.startDate), U.yfrac(p.endDate), `수행 ${p.startDate} ~ ${p.endDate}`);
    const tp = A.trackPlan(p);
    if (tp.length) {
      const tEnd = p.endYear + K.TRACK(p.type) + 2 / 12;
      seg('trk', p.endYear + 1, tEnd, `추적조사 ${K.TRACK(p.type)}년 (매년 2월 보고 · 지침 제26조 · 계산)`);
      tp.forEach(r => out.push(`<i class="tk ${r.status === '제출' ? 'ok' : r.status === '미제출' ? 'late' : r.status === '면제' ? 'ex' : ''}" style="left:${X(p.endYear + r.round + 2 / 12) - 1}px" title="${r.round}차 ’${String(r.due).slice(2, 4)}.2 ${r.status}"></i>`));
      if (p.nextIds.length) mk('loop on', tEnd + 0.15, '↺', `환류 → 후속·연계 ${p.nextIds.join(', ')}`);
      else mk('loop', tEnd + 0.15, '↺', '환류 (후속·연계사업 → 다음 발굴 후보)');
    } else if (p.nextIds.length && p.endDate) mk('loop on', U.yfrac(p.endDate) + 0.3, '↺', `환류 → 후속·연계 ${p.nextIds.join(', ')}`);
    if (p.endDate && ['CLOSED', 'FOLLOWUP'].includes(p.stage)) out.push(`<i class="hand" style="left:${X(U.yfrac(p.endDate))}px" title="수원국 인계 ${p.endDate}"></i>`);
    return out.join('');
  };
  const drawerHtml = p => {
    const T = U.today();
    const unc = A.db.approvals.filter(a => a.pid === p.id && ['PENDING', 'SUPPLEMENT', 'RETURNED'].includes(a.status));
    const conf = A.db.history.find(h => h.pid === p.id && (h.ap || h.cat === '외부 결정'));
    const open = p.schedule.filter(m => !m.done).sort((a, b) => (a.plan < b.plan ? -1 : 1));
    const late = open.filter(m => m.plan < T);
    const ms = A.measured(p);
    const tp = A.trackPlan(p);
    const ex = A.execOf(p);
    return `<div class="dmeta"><span class="mono">${A.pid(p)}</span><span>${esc(p.region)} ${esc(p.country)}</span><span>${esc(p.type)}</span>${A.stageBadge(p.stage, p)}</div>
      <h2>${esc(p.name)}</h2>
      <div class="row"><a class="btn sm pri" href="#/projects/${p.id}">사업 상세 열기</a><a class="btn sm" href="#/projects/${p.id}?tab=schedule">일정·처리 이력</a></div>
      ${p.qc.length ? `<div class="notice warn small"><span>⚠</span><span class="grow"><b>데이터 점검</b> ${p.qc.map(esc).join(' · ')}</span></div>` : ''}
      <div class="small muted">① 단계 타임라인 · 아래 칸은 제안요청서 요구사항 중요도 순서</div>
      ${A.lifeHtml(p)}
      <div class="blk"><h3>② 확정 상태 <span class="lv must">필수</span></h3><dl class="kv"><dt>최근 확정</dt><dd>${conf ? `${conf.at.slice(0, 10)} · ${esc(conf.cat)} · ${esc(conf.label)}${conf.ap ? ` <span class="mono small">${conf.ap}</span>` : ''}` : '공개 사업DB 이관값 · 결재 확정 이력 없음'}</dd><dt>미확정 변경</dt><dd>${unc.length ? unc.map(a => `${esc(a.title)} ${A.apBadge(a.status)}`).join('<br>') : '없음'}</dd></dl></div>
      <div class="blk"><h3>③ 다음 일정 · 지연 <span class="lv must">필수</span></h3><dl class="kv"><dt>다음 일정</dt><dd>${open[0] ? `${esc(open[0].name)} · <span class="mono">${open[0].plan}</span> (${U.diffD(T, open[0].plan) < 0 ? `지연 ${-U.diffD(T, open[0].plan)}일` : `D-${U.diffD(T, open[0].plan)}`})` : '-'}</dd><dt>지연</dt><dd>${late.length ? late.map(m => `${esc(m.name)} — ${esc(m.reason || '사유 미입력')}${m.action ? ` → ${esc(m.action)}` : ''}`).join('<br>') : '없음'}</dd></dl></div>
      <div class="blk"><h3>④ 성과지표 (PDM) <span class="lv must">필수</span></h3>${ms.length ? `<table class="ind"><thead><tr><th>수준</th><th>지표</th><th>기초선</th><th>목표</th><th>종료선</th><th>상태</th></tr></thead><tbody>${ms.map(i => `<tr><td>${i.level}</td><td>${esc(i.name)}</td><td>${i.base}</td><td>${i.target}</td><td>${i.end ?? '-'}</td><td>${A.achvBadge(A.achv(i))}</td></tr>`).join('')}</tbody></table>` : '<div class="small muted">등록된 PDM 없음</div>'}
        <div class="small muted">${tp.length ? `추적조사 ${tp.length}회 (매년 2월) · 제출 ${tp.filter(r => r.status === '제출').length} · 미제출 ${tp.filter(r => r.status === '미제출').length} · 예정 ${tp.filter(r => r.status === '예정').length}` : p.endYear < 2023 && ['CLOSED'].includes(p.stage) ? '2022년 이전 종료 — 추적조사 적용 여부 확인' : '추적조사는 종료 후 생성'}${p.perf ? ` · PDM 버전 ${p.perf.versions.map(v => v.v).join(' → ')}` : ''}</div></div>
      <div class="blk"><h3>⑤ 계약 · 집행 <span class="lv mid">중요</span></h3><dl class="kv"><dt>계약액</dt><dd>${p.contractAmt ? won(p.contractAmt) : '-'}</dd><dt>발주·낙찰률</dt><dd>${p.orderAmt && p.contractAmt ? `${won(p.orderAmt)} · ${pct(A.rateOf(p), 2)} (자동 계산)` : '-'}</dd><dt>낙찰차액·활용</dt><dd>${A.surplusOf(p) != null ? `${won(A.surplusOf(p))} · 활용계획 ${p.surplus.length ? eok(p.surplus.reduce((s, x) => s + x.amt, 0)) + '원' : '없음'}` : '-'}</dd><dt>집행률</dt><dd>${p.contractAmt ? `${pct((ex / p.contractAmt) * 100)} (${eok(ex)}원)` : '-'}</dd></dl></div>
      <div class="rm-note">타임라인의 각 점은 실제 일자와 근거 문서가 있으면 <b>실제 값</b>, 공개 자료에 없어 규정으로 계산한 경우 <b>계산 값</b>으로 표시합니다. 재제안은 같은 사업ID의 차수로, 후속사업은 새 사업ID에 원사업을 연결해 표시합니다.</div>`;
  };

  A.page('/roadmap', { menu: 'roadmap', title: '전 주기 로드맵' }, (view, _, q) => {
    const f = (A.state.rm = A.state.rm || { q: '', rg: '', ct: '', tp: '', stg: '', fd: '', sp: '', qc: false, grp: '', sort: 'new', dir: 1, ph: '', due: false, sel: null, y: '' });
    if (Object.keys(q).length) { Object.assign(f, { ph: q.ph || '', y: q.y || '', due: q.due === '1' }); history.replaceState(null, '', '#/roadmap'); }
    const T = U.today(), TY = +T.slice(0, 4), NOW = U.yfrac(T), DUE = TY + 1;
    const all = A.visibleProjects();
    const cnt = k => all.filter(p => A.phaseOf(p) === k).length;
    const nDue = all.filter(p => A.isDue(p, DUE)).length;
    const dd = U.diffD(T, `${DUE}-02-28`);
    const idx = (arr, v) => { const i = arr.indexOf(v); return i < 0 ? 999 : i; };
    const STG_ORD = K.STAGES.map(s => s.k), TP_ORD = A.code('type'), PH_ORD = Object.values(A.PHASES);
    const subRank = p => idx(K.SUBS[p.stage] || [], p.sub);
    const SORTS = {
      new: (a, b) => b.startYear - a.startYear || b.endYear - a.endYear || a.id.localeCompare(b.id),
      old: (a, b) => a.startYear - b.startYear || a.endYear - b.endYear,
      end: (a, b) => b.endYear - a.endYear || b.startYear - a.startYear,
      nm: (a, b) => a.name.localeCompare(b.name, 'ko'),
      ct: (a, b) => a.country.localeCompare(b.country, 'ko'),
      tp: (a, b) => idx(TP_ORD, a.type) - idx(TP_ORD, b.type) || a.type.localeCompare(b.type, 'ko'),
      st: (a, b) => STG_ORD.indexOf(a.stage) - STG_ORD.indexOf(b.stage) || subRank(a) - subRank(b) || String(a.sub || '').localeCompare(String(b.sub || ''), 'ko'),
    };
    const SK = [['nm', '사업'], ['ct', '국가'], ['tp', '유형'], ['st', '현재 단계']];
    // 국가 목록은 고른 지역 안에서만 (건수 함께 표시)
    const ctOpts = () => {
      const L = all.filter(p => !f.rg || p.region === f.rg), cs = A.uniq(L, 'country');
      if (f.ct && !cs.includes(f.ct)) f.ct = '';
      return A.opts(cs.map(c => [c, `${c} (${L.filter(p => p.country === c).length})`]), f.ct);
    };
    // 현재 단계: 단계 전체 + 세부(발굴 · 선정, 보류(고도화) …), 진행 순서대로
    const stgLabel = (k, sb) => (['HELD', 'REJECTED'].includes(k) ? `${K.stageName(k)}(${sb})` : `${K.stageName(k)} · ${sb}`);
    const stgOpts = () => '<option value="">전체</option>' + K.STAGES.map(s => {
      const L = all.filter(p => p.stage === s.k);
      if (!L.length) return '';
      const subs = A.uniq(L, 'sub').sort((a, b) => idx(K.SUBS[s.k] || [], a) - idx(K.SUBS[s.k] || [], b));
      const head = `<option value="${s.k}" ${f.stg === s.k ? 'selected' : ''}>${s.n}${subs.length ? ' 전체' : ''} (${L.length})</option>`;
      if (!subs.length) return head;
      if (subs.length === 1 && L.every(p => p.sub === subs[0])) return `<option value="${s.k}" ${f.stg === s.k || f.stg === `${s.k}|${subs[0]}` ? 'selected' : ''}>${esc(stgLabel(s.k, subs[0]))} (${L.length})</option>`;
      return `<optgroup label="${s.n}">${head}${subs.map(sb => { const v = `${s.k}|${sb}`; return `<option value="${esc(v)}" ${f.stg === v ? 'selected' : ''}>${esc(stgLabel(s.k, sb))} (${L.filter(p => p.sub === sb).length})</option>`; }).join('')}</optgroup>`;
    }).join('');
    const stgOk = p => !f.stg || (f.stg.includes('|') ? `${p.stage}|${p.sub}` === f.stg : p.stage === f.stg);
    const active = () => !!(f.q || f.rg || f.ct || f.tp || f.stg || f.fd || f.sp || f.qc || f.ph || f.due || f.y);
    view.innerHTML = `
      ${A.ph('국토교통 ODA 사업 전 주기 로드맵', `발굴부터 추적조사·환류까지 사업 한 건의 전 주기를 연도 축으로 표시 · 기준 ${T} · 표시 사업 ${all.length}건 (공개 사업DB 119건 + 공모·심의 사업)`, A.can('projects', 'c') ? `<a class="btn pri" href="#/projects/new">${A.ICON.plus}신규 등록 (발굴)</a>` : '', '사업범위 나')}
      <div class="pipe rm">${['pre', 'drop', 'run', 'trk', 'end', 'end0'].map(k => `<button class="chip ${f.ph === k ? 'on' : ''}" data-ph="${k}"><span class="k"><i class="sw ${k}"></i>${A.PHASES[k]}</span><span class="v">${cnt(k)}</span></button>`).join('')}
        <button class="chip ${f.due ? 'on' : ''}" data-due="1"><span class="k"><i class="sw tick"></i>’${String(DUE).slice(2)}.2 추적 보고 대상</span><span class="v">${nDue}</span><span class="y">D-${dd}</span></button></div>
      <div class="bar">
        <div class="fl"><span>검색</span><input type="search" id="r-q" value="${esc(f.q)}" placeholder="사업명·국가·사업ID"></div>
        <div class="fl"><span>지역</span><select id="r-rg">${A.opts(A.uniq(all, 'region'), f.rg)}</select></div>
        <div class="fl"><span>국가</span><select id="r-ct">${ctOpts()}</select></div>
        <div class="fl"><span>유형</span><select id="r-tp">${A.opts(A.code('type'), f.tp)}</select></div>
        <div class="fl"><span>현재 단계</span><select id="r-stg">${stgOpts()}</select></div>
        <div class="fl"><span>국토교통ODA 분야</span><select id="r-fd">${A.opts(A.code('field'), f.fd)}</select></div>
        <div class="fl"><span>시행계획 분야</span><select id="r-sp">${A.opts([['(공란)', '(공란)'], ...A.uniq(all, 'crs').map(x => [x, x])], f.sp)}</select></div>
        <label class="ck"><input type="checkbox" id="r-qc" ${f.qc ? 'checked' : ''}>공란·오류 있는 사업만</label>
        <div class="fl"><span>그룹별 보기</span><select id="r-grp">${A.opts([['region', '지역별'], ['country', '국가별'], ['type', '사업유형별'], ['phase', '현재 단계별'], ['field', '국토교통ODA 분야별']], f.grp, '한 목록')}</select></div>
        <div class="fl"><span>정렬</span><select id="r-sort">${A.opts([['new', '최신 사업 먼저'], ['old', '오래된 사업 먼저'], ['end', '종료년도 최근 순'], ['nm', '사업명'], ['ct', '국가'], ['tp', '유형'], ['st', '현재 단계 (진행 순)']], f.sort, null)}</select></div>
        <span class="sp"></span><button type="button" class="btn sm" id="r-reset" hidden>필터 초기화</button><span class="summary" id="r-cnt"></span>
      </div>
      <div class="legend rmleg"><span><i class="sw pre est"></i>발굴·예비 (빗금 = 실제 일자가 없어 규정으로 계산)</span><span><i class="sw pre"></i>발굴·예비 (실제 기록)</span><span><i class="sw plan"></i>수행 예정</span><span><i class="sw run"></i>수행 (사업기간)</span><span><i class="sw trk"></i>추적조사 (종료 후 매년 2월 · 프로젝트 5년·연수 1년·그 외 3년 · 2023년 이후 종료분)</span><span><i class="sw tick"></i>2월 보고 (✓ 제출 · 빨강 미제출)</span><span>${A.rmBadge('x', 'lg')}미선정</span><span>${A.rmBadge('hold', 'lg')}보류</span><span><i class="sw hand-l"></i>수원국 인계</span><span><b class="mk-l acc">↺</b>환류 (후속·연계 → 다음 발굴)</span></div>
      <div class="gwrap"><div class="rm-gantt" id="gt"></div></div>
      <details class="rm-req"><summary>제안요청서 요구사항 — 전 주기 화면에서 드러내야 할 것 (중요도 순)<span class="hint"></span></summary><div class="tw"><table class="tbl"><thead><tr><th>순위</th><th>중요도</th><th>요구사항</th><th>해결하는 필요성 (사업의 이해 4p)</th><th>근거</th><th>제안요청서 원문 요지</th><th>프로토타입 위치</th></tr></thead><tbody>
        ${REQ.map(r => `<tr class="${r[2] ? 'kick' : ''}"><td class="mono">${r[0]}</td><td><span class="lv ${r[1] === '필수' ? 'must' : r[1] === '중요' ? 'mid' : 'low'}">${r[2] ? '★ ' : ''}${r[1]}</span></td><td class="ink nowrap">${r[3]}</td><td class="small" style="color:var(--accentText)">${esc(r[4])}</td><td class="small nowrap muted">${r[5]}</td><td class="small">${esc(r[6])}</td><td class="small">${esc(r[7])}</td></tr>`).join('')}
      </tbody></table></div><div class="small muted" style="margin-top:6px">★ = 제안요청서 문장이 추진전략(잇다·검증)과 그대로 겹치는 지점. 필요성(① 전 주기 정보 분산 ② 미선정·재제안 이력 ③ 종료사업 성과·사후관리 축적 ④ 시행기관 성과 정량 평가 ⑤ 통계·업무 연속성)을 직접 해결하면 필수, 숫자로 뒷받침하면 중요, 직접 연결이 없으면 보통.</div></details>
      <details class="rm-req"><summary>전 주기 단계 × 제안요청서 요구사항 매칭<span class="hint"></span></summary><div class="tw"><table class="tbl"><thead><tr><th>단계</th>${['1★ 추진현황', '2★ 확정 이력', '3 일정·지연', '4 성과 이력', '5 입찰·계약', '6 예산·집행', '7 낙찰차액'].map(h => `<th class="c">${h}</th>`).join('')}<th class="num">요구 밀도</th><th>수준</th><th>제안요청서 근거</th><th>메모</th></tr></thead><tbody>
        ${MATCH.map(r => `<tr><td class="ink nowrap">${r[0]}</td>${[...r[1]].map(c => `<td class="c" style="color:${c === '●' ? 'var(--ink)' : 'var(--muted)'}">${c}</td>`).join('')}<td class="num">${r[2]}</td><td><span class="lv ${r[3] === '높음' ? 'must' : r[3] === '중간' ? 'mid' : 'low'}">${r[3]}</span></td><td class="small">${esc(r[4])}</td><td class="small muted">${esc(r[5])}</td></tr>`).join('')}
      </tbody></table></div><div class="small muted" style="margin-top:6px">● 그 단계에서 제안요청서가 직접 요구 · ◐ 일부·간접 요구. 요구 밀도 = 요구사항 중요도 가중치(필수 3 · 중요 2 · 보통 1)의 합, ◐는 절반. 10 이상 높음, 4.5 이상 중간.</div></details>
      <details class="rm-req"><summary>단계별 주체 — 누가 주관하고, 누가 만들고, 누가 결정하나<span class="hint"></span></summary><div class="tw"><table class="tbl"><thead><tr><th>단계</th><th>주관</th><th>작성·제출</th><th>결정·승인</th><th>근거</th></tr></thead><tbody>
        ${K.LIFE.map(s => `<tr><td class="ink nowrap">${esc(s.n)}</td><td class="small">${esc(s.w[0])}</td><td class="small">${esc(s.w[1])}</td><td class="small">${esc(s.w[2])}</td><td class="small muted nowrap">${esc(s.ref)}</td></tr>`).join('')}
      </tbody></table></div><div class="small muted" style="margin-top:6px">센터 = 해외건설협회 국제개발협력센터(전담기관). 사업DB의 사용자는 센터이고, 다른 주체가 만든 자료와 결정은 센터가 받아 기록합니다 — 센터 내부 처리만 결재, 외부 결정은 근거 기록.</div></details>
      <div class="small muted">자료: 공개 사업DB 119건(시작·종료 연도) + 시연용 공모·심의 사업. 공개 자료에는 시작·종료 연도만 있어 발굴·예비는 제안요청서 단계 정의(N-2·N-1), 추적조사는 성과관리 지침 제26조로 계산했습니다. '점검' 표시는 공개 자료에서 확인되는 사실만 씁니다.</div>
      <aside class="drawer" id="drawer" hidden aria-label="사업 전 주기 상세"></aside>`;
    const gt = A.$('#gt', view);
    const dr = A.$('#drawer', view);
    const grpKey = { region: p => p.region, country: p => p.country, type: p => p.type, phase: p => A.PHASES[A.phaseOf(p)], field: p => p.field };
    const grpSort = { type: (a, b) => idx(TP_ORD, a) - idx(TP_ORD, b), phase: (a, b) => PH_ORD.indexOf(a) - PH_ORD.indexOf(b) };
    const grpOfSort = { ct: 'country', tp: 'type', st: 'phase' };
    const draw = () => {
      let rows = all.filter(p => (!f.q || (p.name + p.country + p.id).includes(f.q)) && (!f.rg || p.region === f.rg) && (!f.ct || p.country === f.ct) && (!f.tp || p.type === f.tp) && stgOk(p) && (!f.fd || p.field === f.fd) && (!f.sp || (p.crs || '(공란)') === f.sp) && (!f.qc || p.qc.length) && (!f.ph || A.phaseOf(p) === f.ph) && (!f.due || A.isDue(p, DUE)) && (!f.y || p.startYear === +f.y));
      const cmp = SORTS[f.sort] || SORTS.new, dir = SK.some(s => s[0] === f.sort) && f.dir < 0 ? -1 : 1;
      rows.sort((a, b) => dir * cmp(a, b) || SORTS.new(a, b));
      A.$('#r-cnt', view).innerHTML = `<b>${rows.length}</b>건 표시${rows.length !== all.length ? ` · 전체 ${all.length}건` : ''}`;
      A.$('#r-reset', view).hidden = !active();
      const years = []; for (let y = Y0 + 1; y < Y1; y += 2) years.push(y);
      let html = `<div class="hcell hname">${SK.map(([k, l]) => `<button type="button" class="rm-sk${f.sort === k ? ' on' : ''}" data-sk="${k}" title="${l} 순으로 정렬 · 다시 누르면 반대로">${l}<i aria-hidden="true">${f.sort === k ? (dir < 0 ? '▼' : '▲') : '↕'}</i><span class="rm-vh">${f.sort === k ? (dir < 0 ? ' 내림차순 정렬됨' : ' 오름차순 정렬됨') : ''}</span></button>`).join('<span class="rm-dot" aria-hidden="true">·</span>')}</div><div class="hcell"><div class="years" style="width:${(Y1 - Y0) * YW}px">${years.map(y => `<div style="left:${X(y)}px" class="${y === TY ? 'now' : ''}">’${String(y).slice(2)}</div>`).join('')}</div></div>`;
      const gs = f.grp ? A.uniq(rows, grpKey[f.grp]) : [];
      if (grpSort[f.grp]) gs.sort(grpSort[f.grp]);
      if (grpOfSort[f.sort] === f.grp && dir < 0) gs.reverse();
      const groups = f.grp ? gs.map(g => [g, rows.filter(p => grpKey[f.grp](p) === g)]) : [[null, rows]];
      groups.forEach(([g, list]) => {
        if (g) html += `<div class="grp">${esc(g)} <span class="muted">${list.length}</span></div>`;
        list.forEach(p => {
          html += `<div class="gr${p.id === f.sel ? ' sel' : ''}" data-id="${p.id}" tabindex="0" role="button" aria-label="${esc(p.name)} 전 주기 보기">
            <div class="nm"><span class="t" title="${esc(p.name)}">${esc(p.name)}</span><span class="m"><span class="mt">${esc(A.pid(p))} · ${esc(p.country)} · ${esc(p.field)} · ${esc(p.type)}</span><span class="pill ${A.phaseOf(p)}">${esc(A.stageLabel(p))}</span>${p.qc.length ? `<span class="qflag" title="${esc(p.qc.join(' · '))}">점검 ${p.qc.length}</span>` : ''}</span></div>
            <div class="lane" style="width:${(Y1 - Y0) * YW}px">${bars(p, NOW)}<i class="nowline" style="left:${X(NOW)}px"></i></div></div>`;
        });
      });
      if (!rows.length) html += '<div class="grp" style="font-weight:400">조건에 맞는 사업이 없습니다. 필터를 풀어 보세요.</div>';
      gt.innerHTML = html;
      A.$$('[data-sk]', gt).forEach(b => (b.onclick = () => {
        const k = b.dataset.sk;
        f.dir = f.sort === k ? -(f.dir || 1) : 1; f.sort = k;
        A.$('#r-sort', view).value = k; draw();
        const nb = A.$(`[data-sk="${k}"]`, gt); if (nb) nb.focus();
      }));
      A.$$('.gr', gt).forEach(r => {
        r.onclick = () => openD(r.dataset.id);
        r.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openD(r.dataset.id); } };
      });
    };
    const openD = id => {
      f.sel = id; const p = A.P(id);
      dr.innerHTML = `<button class="btn sm" id="d-x" style="align-self:flex-end">닫기</button>` + drawerHtml(p);
      dr.hidden = false; A.$('#d-x', dr).onclick = closeD; A.$('#d-x', dr).focus();
      A.$$('.gr', gt).forEach(r => r.classList.toggle('sel', r.dataset.id === id));
    };
    const closeD = () => { dr.hidden = true; f.sel = null; A.$$('.gr.sel', gt).forEach(r => r.classList.remove('sel')); };
    const onKey = e => { if (e.key === 'Escape' && !dr.hidden) closeD(); };
    document.addEventListener('keydown', onKey);
    window.addEventListener('hashchange', () => document.removeEventListener('keydown', onKey), { once: true });
    A.$$('[data-ph]', view).forEach(b => (b.onclick = () => { f.ph = f.ph === b.dataset.ph ? '' : b.dataset.ph; f.due = false; A.render(); }));
    A.$('[data-due]', view).onclick = () => { f.due = !f.due; f.ph = ''; A.render(); };
    A.$('#r-q', view).oninput = e => { f.q = e.target.value; draw(); };
    [['ct', 'r-ct'], ['tp', 'r-tp'], ['stg', 'r-stg'], ['fd', 'r-fd'], ['sp', 'r-sp'], ['grp', 'r-grp']].forEach(([k, id]) => (A.$('#' + id, view).onchange = e => { f[k] = e.target.value; draw(); }));
    A.$('#r-rg', view).onchange = e => { f.rg = e.target.value; A.$('#r-ct', view).innerHTML = ctOpts(); draw(); };
    A.$('#r-sort', view).onchange = e => { f.sort = e.target.value; f.dir = 1; draw(); };
    A.$('#r-reset', view).onclick = () => { Object.assign(f, { q: '', rg: '', ct: '', tp: '', stg: '', fd: '', sp: '', qc: false, ph: '', due: false, y: '' }); A.render(); };
    A.$('#r-qc', view).onchange = e => { f.qc = e.target.checked; draw(); };
    draw();
    if (f.sel && A.P(f.sel)) openD(f.sel);
    const wrap = A.$('.gwrap', view); wrap.scrollLeft = Math.max(0, X(TY - 9));
  });

  /* ── 연도별 추진현황판 ───────────────────────── */
  A.page('/yearly', { menu: 'yearly', title: '연도별 추진현황판' }, (view, _, q) => {
    const st = (A.state.yr = A.state.yr || { view: 'matrix', team: '', field: '', recent: true });
    if (q.view) { st.view = q.view; history.replaceState(null, '', '#/yearly'); }
    const T = U.today(), TY = +T.slice(0, 4);
    const all = A.visibleProjects();
    view.innerHTML = `${A.ph('연도별 추진현황판', '시행연도 × 추진단계 · 칸을 누르면 해당 사업 목록으로 이동', `<div class="seg"><button data-v="matrix" class="${st.view === 'matrix' ? 'on' : ''}">현황판</button><button data-v="board" class="${st.view === 'board' ? 'on' : ''}">단계별 보드</button></div>`, '사업범위 나')}
      <div class="exbar">제안요청서 사업범위 나 — "사업 발굴 단계(N-2년), 예비사업 단계(N-1년), 국제개발협력위원회 최종 의결 및 확정사업 단계(N년), 계약체결…", "선정, 보류, 탈락, 확정, 계약체결 등 사업 추진상태 관리", "단계별 추진현황을 한눈에 확인할 수 있는 목록 및 시각화 화면"에 대응합니다. 기준 ${T}.</div>
      <div id="yb"></div>`;
    A.$$('[data-v]', view).forEach(b => (b.onclick = () => { st.view = b.dataset.v; A.render(); }));
    const yb = A.$('#yb', view);
    if (st.view === 'matrix') {
      const reached = (p, k) => K.FLOW.indexOf(p.stage) >= K.FLOW.indexOf(k);
      const selected = p => (p.stage === 'DISCOVERED' && p.sub === '선정') || reached(p, 'PRELIM') || (['HELD', 'REJECTED'].includes(p.stage) && p.sub === '예비 심의');
      const cell = (list, chips, go, src) => (list.length ? `<td class="ycell has" data-go="${go}"><div class="n">${list.length}</div><div class="chips">${chips.filter(c => c[1] > 0).map(c => `<span class="yc ${c[2] || ''}">${c[0]} ${c[1]}</span>`).join('')}</div><div class="src">${src}</div></td>` : '<td class="ycell empty"></td>');
      const rowsY = [TY + 2, TY + 1, TY].map(Y => {
        const L = all.filter(p => p.startYear === Y);
        const disc = L.filter(p => p.prop);
        const dRej = disc.filter(p => p.stage === 'REJECTED' && p.sub !== '예비 심의'), dHold = disc.filter(p => p.stage === 'HELD' && p.sub !== '예비 심의');
        const pre = L.filter(p => !p.migrated && (reached(p, 'PRELIM') || p.sub === '예비 심의'));
        const conf = L.filter(p => reached(p, 'CONFIRMED')), con = L.filter(p => p.contract), run = L.filter(p => ['ONGOING', 'CONTRACTED'].includes(p.stage));
        const src = L.some(p => p.migrated) ? '공개 사업DB' : '시연 데이터';
        return [`${Y}년 시행`, [
          cell(disc, [['선정', disc.filter(selected).length, 'ok'], ['보류', dHold.length, 'hold'], ['미선정', dRej.length, 'no'], ['심사중', disc.filter(p => p.stage === 'DISCOVERED' && p.sub !== '선정').length, '']], `/proposals?year=${Y - 2}`, src),
          cell(pre, [['상정', pre.filter(p => p.stageHist.some(h => h.sub === '상정') || p.migrated).length, ''], ['의결', pre.filter(p => (p.stage === 'PRELIM' && p.sub === '의결') || reached(p, 'CONFIRMED')).length, 'ok'], ['보류', pre.filter(p => p.stage === 'HELD').length, 'hold'], ['미의결', pre.filter(p => p.stage === 'REJECTED').length, 'no']], `/projects?year=${Y}&stage=PRELIM,HELD,CONFIRMED,CONTRACTED,ONGOING`, src),
          cell(conf, [['확정', conf.length, '']], `/projects?year=${Y}&stage=CONFIRMED,CONTRACTED,ONGOING`, src),
          cell(con, [['계약액 등록', con.length, '']], `/projects?year=${Y}&stage=CONTRACTED,ONGOING`, src),
          cell(run, [['수행 중', run.length, 'ok']], `/projects?year=${Y}&stage=ONGOING`, src),
          '<td class="ycell empty"></td>',
        ]];
      });
      const runOld = all.filter(p => p.startYear < TY && p.stage === 'ONGOING'), after = all.filter(p => p.startYear < TY && ['CLOSED', 'FOLLOWUP'].includes(p.stage));
      rowsY.push([`${TY - 1}년 이전 시행`, ['<td class="ycell empty"></td>', '<td class="ycell empty"></td>', '<td class="ycell empty"></td>', '<td class="ycell empty"></td>',
        cell(runOld, [['수행 중', runOld.length, 'ok']], '/projects?stage=ONGOING', '공개 사업DB'),
        cell(after, [['추적조사', after.filter(p => p.stage === 'FOLLOWUP').length, 'hold'], ['종료', after.filter(p => p.stage === 'CLOSED').length, '']], '/roadmap?ph=trk', '공개 사업DB')]]);
      yb.innerHTML = `<div class="tw"><table class="ytable"><thead><tr><th></th>${[['발굴', 'N-2 · 공모·심사'], ['예비', 'N-1 · 국토교통 국개위'], ['확정', 'N · 국제개발협력위원회'], ['계약체결', ''], ['수행', ''], ['완료·사후', '추적조사·종료']].map(c => `<th>${c[0]}<span class="sub">${c[1]}</span></th>`).join('')}</tr></thead><tbody>${rowsY.map(r => `<tr><th class="rh">${r[0]}</th>${r[1].join('')}</tr>`).join('')}</tbody></table></div>
        <div class="small muted">2026년 이전 시행 사업은 공개 사업DB 실제 값(시작·종료연도로 단계 판정), ${TY + 1}·${TY + 2}년 시행 사업의 발굴·예비 칸은 시연용 공모·심의 데이터입니다. 발굴 칸은 공모·미선정 관리로, 나머지 칸은 사업 목록으로 이동합니다.</div>`;
      A.$$('[data-go]', yb).forEach(c => (c.onclick = () => (location.hash = '#' + c.dataset.go)));
      return;
    }
    /* 단계별 보드 */
    const rows = all.filter(p => (!st.team || p.team === st.team) && (!st.field || p.field === st.field) && (!st.recent || p.stage !== 'CLOSED'));
    const COLS = ['DISCOVERED', 'PRELIM', 'HELD', 'REJECTED', 'CONFIRMED', 'CONTRACTED', 'ONGOING', 'CLOSED', 'FOLLOWUP'].filter(k => !(st.recent && k === 'CLOSED'));
    const YH = { DISCOVERED: `${TY + 2}년 시행`, PRELIM: `${TY + 1}년 시행`, CONFIRMED: `${TY}년`, HELD: '고도화·심의 보류', REJECTED: '재제안 가능' };
    yb.innerHTML = `<div class="bar"><div class="fl"><span>담당팀</span><select id="b-team">${A.opts(['사업1팀', '사업2팀'], st.team)}</select></div><div class="fl"><span>분야</span><select id="b-field">${A.opts(A.code('field'), st.field)}</select></div><label class="ck"><input type="checkbox" id="b-recent" ${st.recent ? 'checked' : ''}>종료 사업 숨기기</label><span class="sp"></span><div class="legend"><span><span class="tag">재제안</span>같은 ID 다음 차수</span><span><span class="tag blue">후속·연계</span>종료사업 후속</span></div></div>
      <div class="board">${COLS.map(k => {
        const list = rows.filter(p => p.stage === k).sort((a, b) => b.startYear - a.startYear || (b.contractAmt || b.planAmt || 0) - (a.contractAmt || a.planAmt || 0));
        return `<div class="col"><div class="ch"><span>${A.stageBadge(k)} <span class="y">${YH[k] || ''}</span></span><span class="n">${list.length}</span></div><div class="cards">${list.map(p => `
          <a class="pc" href="#/projects/${p.id}"><span class="t">${esc(p.name)}</span><span class="m"><span>${esc(p.country)} · ${esc(p.type)}</span><span class="mono">${eok(p.contractAmt ?? p.planAmt)}</span></span><span class="m"><span>${A.uname(p.owner)} · ${p.sub ? esc(p.sub) : `${p.startYear}–${p.endYear}`}</span><span>${p.round > 1 ? `<span class="tag">${p.round}차</span>` : ''}${p.prevId ? '<span class="tag blue">후속·연계</span>' : ''}${A.pendingOf(p.id) ? '<span class="b ap-PENDING">결재중</span>' : ''}</span></span></a>`).join('') || '<div class="empty">없음</div>'}</div></div>`;
      }).join('')}</div>`;
    A.$('#b-team', yb).onchange = e => { st.team = e.target.value; A.render(); };
    A.$('#b-field', yb).onchange = e => { st.field = e.target.value; A.render(); };
    A.$('#b-recent', yb).onchange = e => { st.recent = e.target.checked; A.render(); };
  });

  /* ── 공모·미선정 관리 ───────────────────────── */
  const resultOf = p => {
    if (['PRELIM', 'CONFIRMED', 'CONTRACTED', 'ONGOING', 'CLOSED', 'FOLLOWUP'].includes(p.stage) || (p.stage === 'DISCOVERED' && p.sub === '선정') || (['HELD', 'REJECTED'].includes(p.stage) && p.sub === '예비 심의')) return ['선정', 'ok', '위원회'];
    if (p.stage === 'REJECTED') return ['미선정', 'no', p.sub];
    if (p.stage === 'HELD') return ['보류', 'hold', p.sub];
    return ['심사중', '', p.sub];
  };
  A.page('/proposals', { menu: 'proposals', title: '공모·미선정 관리' }, (view, _, q) => {
    const T = U.today(), TY = +T.slice(0, 4);
    const all = A.visibleProjects();
    const years = A.uniq([...all.filter(p => p.prop).map(p => p.prop.year), ...all.flatMap(p => p.rounds.map(r => r.year))], x => x).reverse();
    const st = (A.state.pp = A.state.pp || { year: years.includes(TY) ? TY : years[0], sel: null, res: '', org: '' });
    if (q.year) { st.year = +q.year; history.replaceState(null, '', '#/proposals'); }
    if (q.sel) { st.sel = q.sel; history.replaceState(null, '', '#/proposals'); }
    const Y = st.year;
    const E = [
      ...all.filter(p => p.prop && p.prop.year === Y).map(p => { const [res, cls, at] = resultOf(p); const dec = [...p.stageHist].reverse().find(h => ['HELD', 'REJECTED'].includes(h.k) && (h.round || 1) === p.round); return { p, round: p.round, name: p.name, amt: p.planAmt, res, cls, at, why: dec ? dec.reason.replace(/^(미선정|보류) — /, '') : '', cur: true }; }),
      ...all.flatMap(p => p.rounds.filter(r => r.year === Y).map(r => ({ p, round: r.round, name: r.snap.name, amt: r.snap.planAmt, res: r.result, cls: r.result === '미선정' ? 'no' : 'hold', at: r.at, why: r.reason, cur: false }))),
    ].sort((a, b) => a.p.id.localeCompare(b.p.id) || a.round - b.round);
    const n = (res, at) => E.filter(e => e.res === res && (!at || at.includes(e.at))).length;
    const ing = at => E.filter(e => e.res === '심사중' && at.includes(e.at)).length;
    const docRej = n('미선정', ['서류심사']);
    const passDoc = E.length - docRej - ing(['접수', '서류심사']);
    const advHold = n('보류', ['고도화']);
    const comm = passDoc - advHold - ing(['고도화']);
    const fun = [['접수', E.length, ''], ['서류심사 통과', passDoc, `미선정 ${docRej}`], ['고도화 대상', passDoc, ''], ['위원회 상정', comm, `보류 ${advHold}`], ['선정', n('선정'), `미선정 ${n('미선정', ['위원회'])}`], ['미선정 누계', n('미선정'), '재제안 가능']];
    const rows = E.filter(e => (!st.res || e.res === st.res) && (!st.org || e.p.prop.org === st.org));
    const sel = (st.sel && A.P(st.sel)) || (rows[0] && rows[0].p);
    view.innerHTML = `${A.ph('공모 제안 · 미선정 사업 관리', '공모 접수 → 서류심사 → 고도화 → 자문위원회 → 선정 · 미선정 사유와 재제안(같은 사업ID의 차수)을 누적 관리', `<select class="btn" id="p-year" aria-label="공모연도">${years.map(y => `<option value="${y}" ${y === Y ? 'selected' : ''}>${y}년 공모 (${y + 2}년 시행)</option>`).join('')}</select>${A.can('projects', 'c') ? `<a class="btn pri" href="#/projects/new">${A.ICON.plus}신규 등록 (발굴)</a>` : ''}`, '필요성 ②')}
      <div class="exbar">공개 사업DB에는 확정된 사업만 있어 공모 접수·미선정 기록이 없습니다. 아래 사업은 화면 구성을 보여 주기 위한 <b>시연용 예시</b>이며, 구축 후에는 공모 고도화 용역의 접수·심사 결과로 채워집니다.${Y < TY ? ` ${Y}년 공모는 상정·미선정 기록만 이관한 상태입니다.` : ''}</div>
      <div class="funnel">${fun.map(([k, v, x]) => `<div class="fstep"><span class="k">${k}</span><span class="v">${v}</span><span class="x">${x}</span></div>`).join('')}</div>
      <div class="pgrid">
        <div class="card"><div class="hd"><h3>공모 제안 목록 <span class="muted small">${Y}년 공모 · ${Y + 2}년 시행 · ${rows.length}건</span></h3><div class="row"><select class="btn sm" id="p-res">${A.opts(['선정', '보류', '미선정', '심사중'], st.res, '전체 결과')}</select><select class="btn sm" id="p-org">${A.opts(['공공', '민간'], st.org, '전체 제안기관')}</select><button class="btn sm" id="p-xls">${A.ICON.dl}엑셀</button></div></div>
          <div class="tw" style="max-height:560px"><table class="tbl"><thead><tr><th>사업ID · 차수</th><th>사업명</th><th>분야</th><th>제안기관</th><th class="num">예산</th><th>결과</th><th>결정 단계</th><th>미선정·보류 사유</th><th>재제안</th></tr></thead><tbody>
          ${rows.map(e => `<tr class="click ${sel && e.p.id === sel.id ? 'selrow' : ''}" data-id="${e.p.id}"><td class="mono small nowrap">${e.p.id} · ${e.round}차</td><td class="nm"><span class="t" title="${esc(e.name)}">${esc(e.name)}</span></td><td class="nowrap">${esc(e.p.field)}</td><td class="nowrap">${esc(e.p.prop.org)}</td><td class="num">${eok(e.amt, 1)}</td><td><span class="rs ${e.cls}">${e.res}</span></td><td class="nowrap">${esc(e.at)}</td><td class="small">${esc(e.why || '-')}</td><td class="small nowrap">${!e.cur ? `<span class="muted">→ ${e.p.round}차 재제안</span>` : e.round > 1 ? `${e.p.rounds.map(r => `${r.round}차 ${r.result}`).join(', ')} → 재제안` : ['미선정', '보류'].includes(e.res) ? '<span class="tag">재제안 가능</span>' : '-'}</td></tr>`).join('') || '<tr><td colspan="9" class="empty">해당 공모 제안이 없습니다.</td></tr>'}
          </tbody></table></div></div>
        <div class="card" id="chain">${sel ? chainHtml(sel) : '<div class="empty">사업을 선택하세요.</div>'}</div>
      </div>
      <div class="small muted">흐름 근거: 기획·발굴 지침 제6~10조 (공모 → 제안서 → 고도화 → 국토교통 국제개발협력위원회 심의), 제안요청서 사업범위 나(선정·보류·탈락 상태 관리)와 필요성 ②(미선정·재제안 변경 이력). 미선정 사유 분류는 예시이며 착수 시 센터 심사 기준으로 확정합니다.</div>`;
    function chainHtml(p) {
      const edit = A.canEdit(p);
      const ext = (K.EXT[p.stage] || []).filter(o => o.when(p));
      const steps = [...p.rounds.map(r => ({ c: r.result === '미선정' ? 'no' : 'hold', t: `${p.id} · ${r.round}차 · ${r.result} (${r.at})`, s: `${r.year}년 공모 · 사유: ${r.reason} · 예산 ${eok(r.snap.planAmt)}원` })),
        ...p.stageHist.filter(h => (h.round || 1) === p.round && !h.calc).map(h => ({ c: h.k === 'REJECTED' ? 'no' : h.k === 'HELD' ? 'hold' : h.sub === '선정' || h.sub === '의결' ? 'ok' : '', t: `${h.d} · ${K.stageName(h.k)}${h.sub ? ' · ' + h.sub : ''}`, s: `${h.reason}${h.ext ? ` — ${h.ext.body}${h.ext.no ? ', ' + h.ext.no : ''}` : ''}` }))];
      const last = p.rounds[p.rounds.length - 1];
      const D = last ? [['사업명', last.snap.name, p.name], ['사업내용', last.snap.desc, p.desc], ['예산', won(last.snap.planAmt), won(p.planAmt)], ['추진방식', last.snap.mode, p.prop.mode], ['근거 서류', last.snap.evidence, p.prop.evidence]] : [];
      return `<div class="hd"><h3>제안 이력 · ${esc(A.pid(p))}</h3><a class="small" href="#/projects/${p.id}">사업 상세 →</a></div><div class="bd stack" style="gap:10px">
        <div class="ink" style="font-weight:600">${esc(p.name)}</div>
        <div>${steps.map(s => `<div class="cstep ${s.c}"><div class="t">${esc(s.t)}</div><div class="s">${esc(s.s)}</div></div>`).join('')}
          ${['REJECTED', 'HELD'].includes(p.stage) ? `<div class="cstep"><div class="t">다음 공모 재제안 가능</div><div class="s">재제안하면 ${p.id}의 ${p.round + 1}차로 접수 (새 번호 없음)</div></div>` : ''}</div>
        ${D.length ? `<div><b class="small ink">변경 비교 (${last.round}차 → ${p.round}차)</b><table class="tbl diff" style="margin-top:4px"><thead><tr><th>항목</th><th>${last.round}차</th><th>${p.round}차 (재제안)</th></tr></thead><tbody>${D.map(([k, a, b]) => `<tr><td class="nowrap">${k}</td><td class="${a !== b ? 'bf' : ''}">${esc(a)}</td><td class="${a !== b ? 'af' : ''}">${esc(b)}</td></tr>`).join('')}</tbody></table></div>` : ''}
        <div class="row">${edit && ['REJECTED', 'HELD'].includes(p.stage) ? `<button class="btn sm pri" id="c-re">${A.reLabel(p)}</button>` : ''}${edit && ext.length ? '<button class="btn sm" id="c-ext">외부 결정 기록</button>' : ''}</div></div>`;
    }
    A.$('#p-year', view).onchange = e => { st.year = +e.target.value; st.sel = null; A.render(); };
    A.$('#p-res', view).onchange = e => { st.res = e.target.value; A.render(); };
    A.$('#p-org', view).onchange = e => { st.org = e.target.value; A.render(); };
    A.$$('tr[data-id]', view).forEach(tr => (tr.onclick = () => { st.sel = tr.dataset.id; A.render(); }));
    A.$('#c-re', view) && (A.$('#c-re', view).onclick = () => A.reproposeModal(sel, () => A.render()));
    A.$('#c-ext', view) && (A.$('#c-ext', view).onclick = () => A.decisionModal(sel, () => A.render()));
    A.$('#p-xls', view).onclick = () => A.downloadCSV(`공모제안_${Y}년`, ['사업ID', '차수', '사업명', '분야', '국가', '제안기관구분', '제안기관', '예산(원)', '결과', '결정단계', '사유'], rows.map(e => [e.p.id, e.round, e.name, e.p.field, e.p.country, e.p.prop.org, e.p.prop.orgName, e.amt, e.res, e.at, e.why]));
  });
})(window.App);
