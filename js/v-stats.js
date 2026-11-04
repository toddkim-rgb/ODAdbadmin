/* 통계 현황 (SFR-029~033, 036) · 피봇 분석 (SFR-035) */
(function (A) {
  const { esc, num, eok, pct, U, K } = A;
  const TYPES = ['프로젝트', '개발컨설팅', '기획', '연수'];
  const legend = names => `<div class="legend">${names.map((n, i) => `<span><i style="background:${A.sc(i)}"></i>${esc(n)}</span>`).join('')}</div>`;
  const grid = { left: 8, right: 12, top: 16, bottom: 4, containLabel: true };

  A.page('/stats', { menu: 'stats', title: '통계 현황' }, (view, _, q) => {
    const f = (A.state.st = A.state.st || { tab: 'year', y0: '', y1: '', type: '', cont: '', mapM: 'count', drill: null, fieldSel: '', wtSel: '' });
    if (q.tab) f.tab = q.tab;
    const all = A.projects().filter(p => K.FLOW.indexOf(p.stage) >= K.FLOW.indexOf('CONFIRMED'));
    const yrs = A.uniq(all, 'startYear');
    const rows = all.filter(p => (!f.y0 || p.startYear >= +f.y0) && (!f.y1 || p.startYear <= +f.y1) && (!f.type || p.type === f.type) && (!f.cont || p.continent === f.cont));
    const TABS = [['year', '연도별 지원실적', 'SFR-029'], ['geo', '국가·지역별', 'SFR-030'], ['field', '분야·공종별', 'SFR-031'], ['exec', '집행금액', 'SFR-032'], ['etc', '기타 통계', 'SFR-033']];
    view.innerHTML = `
      ${A.ph('통계 현황', '확정사업 이후(확정·계약·수행·종료·사후관리) 사업 기준 · 모든 통계는 현재 조회 조건 그대로 엑셀 다운로드', `${A.xlsBtn()}<button class="btn" id="b-print">${A.ICON.print}인쇄</button>`, TABS.find(t => t[0] === f.tab)[2])}
      <div class="tabs">${TABS.map(([k, n]) => `<button data-t="${k}" class="${k === f.tab ? 'on' : ''}">${n}</button>`).join('')}</div>
      <div class="bar">
        <div class="fl"><span>시작연도(부터)</span><select id="s-y0">${A.opts(yrs, f.y0)}</select></div>
        <div class="fl"><span>시작연도(까지)</span><select id="s-y1">${A.opts(yrs, f.y1)}</select></div>
        <div class="fl"><span>원조유형(사업유형)</span><select id="s-type">${A.opts(TYPES, f.type)}</select></div>
        <div class="fl"><span>대륙</span><select id="s-cont">${A.opts(A.uniq(all, 'continent'), f.cont)}</select></div>
        <button class="btn ghost" id="s-reset">초기화</button><span class="sp"></span>
        <span class="summary">대상 <b>${rows.length}</b>건 · 계약금액 <b>${eok(rows.reduce((s, p) => s + (p.contractAmt || 0), 0))}</b>원</span>
      </div>
      <div id="sb" class="stack"></div>`;
    const sb = A.$('#sb', view);
    A.$$('.tabs button', view).forEach(b => (b.onclick = () => { f.tab = b.dataset.t; f.drill = null; A.render(); }));
    [['y0', 's-y0'], ['y1', 's-y1'], ['type', 's-type'], ['cont', 's-cont']].forEach(([k, id]) => (A.$('#' + id, view).onchange = e => { f[k] = e.target.value; A.render(); }));
    A.$('#s-reset', view).onclick = () => { Object.assign(f, { y0: '', y1: '', type: '', cont: '', drill: null }); A.render(); };
    A.$('#b-print', view).onclick = () => window.print();
    let xls = () => {};
    A.$('#btn-xls', view).onclick = () => xls();

    if (f.tab === 'year') {
      const ys = A.uniq(rows, 'startYear');
      const agg = (y, t, m) => rows.filter(p => p.startYear === y && (!t || p.type === t)).reduce((s, p) => s + (m === 'n' ? 1 : m === 'sur' ? A.surplusOf(p) || 0 : p.contractAmt || 0), 0);
      sb.innerHTML = `
        <div class="grid2">
          <div class="card"><div class="hd"><h3>연도별 사업 수</h3>${legend(TYPES)}</div><div class="bd"><div class="chart" id="c1" role="img" aria-label="연도별 사업 수 누적 막대"></div></div></div>
          <div class="card"><div class="hd"><h3>연도별 계약금액 (억원)</h3>${legend(TYPES)}</div><div class="bd"><div class="chart" id="c2" role="img" aria-label="연도별 계약금액 누적 막대"></div></div></div>
        </div>
        <div class="small muted">막대를 누르면 해당 연도 세부 현황으로 드릴다운합니다.</div>
        <div id="drill"></div>
        <div class="card"><div class="hd"><h3>연도별 지원실적 현황</h3></div><div class="tw"><table class="tbl"><thead><tr><th>연도</th><th class="num">사업 수</th>${TYPES.map(t => `<th class="num">${t}</th>`).join('')}<th class="num">계약금액(원)</th><th class="num">낙찰차액(원)</th></tr></thead><tbody>
          ${ys.map(y => `<tr class="click" data-y="${y}"><td class="mono">${y}</td><td class="num">${agg(y, '', 'n')}</td>${TYPES.map(t => `<td class="num">${agg(y, t, 'n') || '<span class="muted">-</span>'}</td>`).join('')}<td class="num">${num(agg(y, '', 'amt'))}</td><td class="num">${num(agg(y, '', 'sur'))}</td></tr>`).join('')}
        </tbody><tfoot><tr><td>합계</td><td class="num">${rows.length}</td>${TYPES.map(t => `<td class="num">${rows.filter(p => p.type === t).length}</td>`).join('')}<td class="num">${num(rows.reduce((s, p) => s + (p.contractAmt || 0), 0))}</td><td class="num">${num(rows.reduce((s, p) => s + (A.surplusOf(p) || 0), 0))}</td></tr></tfoot></table></div></div>`;
      const mk = (el, m, fmt) => {
        const c = A.chart(A.$(el, sb), { grid, tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: fmt },
          xAxis: { type: 'category', data: ys.map(String), ...A.axis({ splitLine: { show: false } }) }, yAxis: { type: 'value', ...A.axis() },
          series: TYPES.map((t, i) => ({ type: 'bar', name: t, stack: 'a', barMaxWidth: 26, data: ys.map(y => (m === 'n' ? agg(y, t, 'n') : agg(y, t, 'amt') / 1e8)), itemStyle: { color: A.sc(i), borderColor: A.cv('--chartSurface'), borderWidth: 1 } })) });
        c && c.on('click', e => drill(+e.name));
      };
      mk('#c1', 'n', v => v + '건'); mk('#c2', 'amt', v => (+v).toFixed(1) + '억원');
      const drill = y => {
        f.drill = y;
        const r = rows.filter(p => p.startYear === y);
        A.$('#drill', sb).innerHTML = `<div class="card"><div class="hd"><h3>${y}년 세부 현황 <span class="muted small">${r.length}건</span></h3><button class="btn sm ghost" id="d-x">닫기</button></div><div class="tw" style="max-height:340px"><table class="tbl"><thead><tr><th>사업번호</th><th>사업명</th><th>국가</th><th>분야</th><th>유형</th><th>단계</th><th class="num">계약금액</th></tr></thead><tbody>${r.map(p => `<tr class="click" data-id="${p.id}"><td class="mono small">${p.id}</td><td class="nm"><span class="t">${esc(p.name)}</span></td><td>${esc(p.country)}</td><td>${esc(p.field)}</td><td>${esc(p.type)}</td><td>${A.stageBadge(p.stage)}</td><td class="num">${num(p.contractAmt)}</td></tr>`).join('')}</tbody></table></div></div>`;
        A.$$('#drill [data-id]', sb).forEach(tr => (tr.onclick = () => A.go('/projects/' + tr.dataset.id)));
        A.$('#d-x', sb).onclick = () => { f.drill = null; A.$('#drill', sb).innerHTML = ''; };
        A.$('#drill', sb).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      };
      A.$$('tr[data-y]', sb).forEach(tr => (tr.onclick = () => drill(+tr.dataset.y)));
      if (f.drill) drill(f.drill);
      xls = () => A.downloadCSV('연도별지원실적', ['연도', '사업수', ...TYPES, '계약금액', '낙찰차액'], ys.map(y => [y, agg(y, '', 'n'), ...TYPES.map(t => agg(y, t, 'n')), agg(y, '', 'amt'), agg(y, '', 'sur')]), ['합계', rows.length, ...TYPES.map(t => rows.filter(p => p.type === t).length), rows.reduce((s, p) => s + (p.contractAmt || 0), 0), rows.reduce((s, p) => s + (A.surplusOf(p) || 0), 0)]);
    }

    if (f.tab === 'geo') {
      const cts = A.uniq(rows, 'country');
      const byC = cts.map(ct => { const r = rows.filter(p => p.country === ct); return { ct, en: r[0].countryEn, rg: r[0].region, cont: r[0].continent, n: r.length, amt: r.reduce((s, p) => s + (p.contractAmt || 0), 0) }; }).sort((a, b) => b.amt - a.amt);
      const conts = ['아시아', '아프리카', '아메리카', '유럽'];
      const mv = d => (f.mapM === 'count' ? d.n : +(d.amt / 1e8).toFixed(1));
      const max = Math.max(1, ...byC.filter(d => d.en).map(mv));
      sb.innerHTML = `
        <div class="card"><div class="hd"><h3>지원 국가 세계지도</h3><div class="row"><div class="seg"><button data-m="count" class="${f.mapM === 'count' ? 'on' : ''}">사업 수</button><button data-m="amt" class="${f.mapM === 'amt' ? 'on' : ''}">계약금액</button></div><span class="note">국가를 누르면 해당 국가 사업 목록으로 이동</span></div></div><div class="bd"><div class="chart tall" id="map" role="img" aria-label="국가별 사업 현황 세계지도"></div></div></div>
        <div class="g-7-5">
          <div class="card"><div class="hd"><h3>국가별 현황</h3><span class="note">${byC.length}개국</span></div><div class="tw" style="max-height:420px"><table class="tbl"><thead><tr><th>대륙</th><th>지역</th><th>국가</th><th class="num">사업 수</th><th class="num">계약금액(원)</th><th class="num">비중</th></tr></thead><tbody>${byC.map(d => `<tr class="click" data-ct="${esc(d.ct)}"><td>${d.cont}</td><td>${esc(d.rg)}</td><td class="ink">${esc(d.ct)}${d.en ? '' : ' <span class="qc">⚠ 국가코드 미매핑</span>'}</td><td class="num">${d.n}</td><td class="num">${num(d.amt)}</td><td class="num">${pct((d.amt / Math.max(1, rows.reduce((s, p) => s + (p.contractAmt || 0), 0))) * 100)}</td></tr>`).join('')}</tbody></table></div></div>
          <div class="card"><div class="hd"><h3>대륙별 집계</h3><span class="note">계약금액 억원</span></div><div class="bd"><div class="chart" id="cont" role="img" aria-label="대륙별 계약금액"></div>
            <table class="tbl" style="margin-top:8px"><thead><tr><th>대륙</th><th class="num">국가</th><th class="num">사업 수</th><th class="num">계약금액</th></tr></thead><tbody>${conts.map(c => { const r = rows.filter(p => p.continent === c); return `<tr><td>${c}</td><td class="num">${A.uniq(r, 'country').length}</td><td class="num">${r.length}</td><td class="num">${eok(r.reduce((s, p) => s + (p.contractAmt || 0), 0))}</td></tr>`; }).join('')}</tbody></table></div></div>
        </div>`;
      const ramp = ['--q1', '--q2', '--q3', '--q4', '--q5', '--q6', '--q7'].map(A.cv);
      const mc = A.chart(A.$('#map', sb), {
        tooltip: { trigger: 'item', formatter: e => (e.data ? `<b>${esc(e.data.ko)}</b><br>사업 ${e.data.n}건 · 계약금액 ${eok(e.data.amt)}원` : esc(e.name)) },
        visualMap: { min: 0, max, left: 8, bottom: 8, calculable: false, itemHeight: 90, inRange: { color: ramp }, text: [f.mapM === 'count' ? `${max}건` : `${max}억`, '0'], textStyle: { color: A.cv('--muted'), fontSize: 11 } },
        series: [{ type: 'map', map: 'world', roam: true, zoom: 1.15, center: [60, 12], emphasis: { label: { show: false }, itemStyle: { areaColor: A.cv('--accent') } }, select: { disabled: true },
          itemStyle: { areaColor: A.cv('--line2'), borderColor: A.cv('--chartSurface'), borderWidth: 0.6 },
          data: byC.filter(d => d.en).map(d => ({ name: d.en, value: mv(d), ko: d.ct, n: d.n, amt: d.amt })) }],
      });
      mc && mc.on('click', e => e.data && A.go('/projects?country=' + encodeURIComponent(e.data.ko)));
      A.chart(A.$('#cont', sb), { grid, tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: v => (+v).toFixed(1) + '억원' }, xAxis: { type: 'category', data: conts, ...A.axis({ splitLine: { show: false } }) }, yAxis: { type: 'value', ...A.axis() }, series: [A.bar({ name: '계약금액', data: conts.map(c => rows.filter(p => p.continent === c).reduce((s, p) => s + (p.contractAmt || 0), 0) / 1e8), itemStyle: { color: A.sc(0), borderRadius: [4, 4, 0, 0] } })] });
      A.$$('[data-m]', sb).forEach(b => (b.onclick = () => { f.mapM = b.dataset.m; A.render(); }));
      A.$$('[data-ct]', sb).forEach(tr => (tr.onclick = () => A.go('/projects?country=' + encodeURIComponent(tr.dataset.ct))));
      xls = () => A.downloadCSV('국가지역별현황', ['대륙', '지역', '국가', '사업수', '계약금액'], byC.map(d => [d.cont, d.rg, d.ct, d.n, d.amt]), ['합계', '', `${byC.length}개국`, rows.length, rows.reduce((s, p) => s + (p.contractAmt || 0), 0)]);
    }

    if (f.tab === 'field') {
      const fields = A.uniq(rows, 'field'), wts = A.code('workType').filter(w => rows.some(p => p.workType === w));
      const r2 = rows.filter(p => (!f.fieldSel || p.field === f.fieldSel) && (!f.wtSel || p.workType === f.wtSel));
      const sum = arr => arr.reduce((s, p) => s + (p.contractAmt || 0), 0);
      const cross = (fl, w) => rows.filter(p => p.field === fl && p.workType === w);
      const maxC = Math.max(1, ...fields.flatMap(fl => wts.map(w => cross(fl, w).length)));
      const ramp = ['--q1', '--q2', '--q3', '--q4', '--q5', '--q6', '--q7'].map(A.cv);
      sb.innerHTML = `
        <div class="grid2">
          <div class="card"><div class="hd"><h3>분야별 계약금액</h3><span class="note">면적 = 계약금액 · 색 농도 = 금액 크기</span></div><div class="bd"><div class="chart" id="tm" role="img" aria-label="분야별 계약금액 트리맵"></div></div></div>
          <div class="card"><div class="hd"><h3>공종별 사업 수</h3><span class="note">국토교통 ODA 공종 코드 기준</span></div><div class="bd"><div class="chart" id="wt" role="img" aria-label="공종별 사업 수 막대"></div></div></div>
        </div>
        <div class="card"><div class="hd"><h3>분야 × 공종 복합 현황</h3><span class="note">셀 = 사업 수 · 셀을 누르면 복합 조건으로 조회</span></div><div class="tw"><table class="tbl"><thead><tr><th>분야 \\ 공종</th>${wts.map(w => `<th class="num">${w}</th>`).join('')}<th class="num">합계</th><th class="num">계약금액</th></tr></thead><tbody>
          ${fields.map(fl => `<tr><td class="ink">${fl}</td>${wts.map(w => { const n = cross(fl, w).length; const lv = n ? Math.min(6, Math.floor((n / maxC) * 6)) : -1; return `<td class="num ${n ? 'click' : ''}" data-fw="${fl}|${w}" style="${n ? `background:${ramp[lv]};color:${lv >= 4 ? '#fff' : A.cv('--ink')};cursor:pointer` : ''}">${n || '<span class="muted">·</span>'}</td>`; }).join('')}<td class="num">${rows.filter(p => p.field === fl).length}</td><td class="num">${eok(sum(rows.filter(p => p.field === fl)))}</td></tr>`).join('')}
        </tbody></table></div></div>
        ${f.fieldSel || f.wtSel ? `<div class="card"><div class="hd"><h3>복합 조건: ${esc(f.fieldSel || '전체 분야')} × ${esc(f.wtSel || '전체 공종')} <span class="muted small">${r2.length}건 · ${eok(sum(r2))}원</span></h3><button class="btn sm ghost" id="fw-x">조건 해제</button></div><div class="tw" style="max-height:320px"><table class="tbl"><tbody>${r2.map(p => `<tr class="click" data-id="${p.id}"><td class="mono small">${p.id}</td><td class="nm"><span class="t">${esc(p.name)}</span></td><td>${esc(p.country)}</td><td>${A.stageBadge(p.stage)}</td><td class="num">${num(p.contractAmt)}</td></tr>`).join('')}</tbody></table></div></div>` : ''}`;
      const vals = fields.map(fl => sum(rows.filter(p => p.field === fl)) / 1e8);
      const vmax = Math.max(...vals, 1);
      A.chart(A.$('#tm', sb), { tooltip: { formatter: e => `<b>${esc(e.name)}</b><br>${(+e.value).toFixed(1)}억원 · ${rows.filter(p => p.field === e.name).length}건` },
        series: [{ type: 'treemap', roam: false, nodeClick: false, breadcrumb: { show: false }, width: '100%', height: '100%', top: 0, left: 0,
          label: { show: true, formatter: e => `${e.name}\n${(+e.value).toFixed(0)}억`, fontSize: 12, fontFamily: A.cv('--font') },
          itemStyle: { borderColor: A.cv('--chartSurface'), borderWidth: 2, gapWidth: 2 },
          data: fields.map((fl, i) => { const lv = Math.min(6, Math.floor((vals[i] / vmax) * 5) + 1); return { name: fl, value: vals[i], itemStyle: { color: ramp[lv] }, label: { color: lv >= 4 ? '#fff' : A.cv('--ink') } }; }) }] });
      const wc = A.chart(A.$('#wt', sb), { grid, tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: v => v + '건' }, yAxis: { type: 'category', data: wts, inverse: true, ...A.axis({ splitLine: { show: false } }) }, xAxis: { type: 'value', ...A.axis() },
        series: [{ type: 'bar', name: '사업 수', barMaxWidth: 18, data: wts.map(w => rows.filter(p => p.workType === w).length), itemStyle: { color: A.sc(0), borderRadius: [0, 4, 4, 0] }, label: { show: true, position: 'right', color: A.cv('--muted'), fontSize: 11 } }] });
      wc && wc.on('click', e => { f.wtSel = e.name; f.fieldSel = ''; A.render(); });
      A.$$('[data-fw]', sb).forEach(td => td.textContent.trim() !== '·' && (td.onclick = () => { const [a, b] = td.dataset.fw.split('|'); f.fieldSel = a; f.wtSel = b; A.render(); }));
      A.$('#fw-x', sb) && (A.$('#fw-x', sb).onclick = () => { f.fieldSel = ''; f.wtSel = ''; A.render(); });
      A.$$('[data-id]', sb).forEach(tr => (tr.onclick = () => A.go('/projects/' + tr.dataset.id)));
      xls = () => A.downloadCSV('분야공종별현황', ['분야', ...wts, '합계', '계약금액'], fields.map(fl => [fl, ...wts.map(w => cross(fl, w).length), rows.filter(p => p.field === fl).length, sum(rows.filter(p => p.field === fl))]), ['합계', ...wts.map(w => rows.filter(p => p.workType === w).length), rows.length, sum(rows)]);
    }

    if (f.tab === 'exec') {
      const items = K.CONST.EXEC_ITEMS;
      const ex = rows.flatMap(p => p.execs.map(e => ({ ...e, p })));
      const ys = A.uniq(ex, 'y');
      const cell = (it, y) => ex.filter(e => (!it || e.item === it) && (y == null || e.y === y)).reduce((s, e) => s + e.amt, 0);
      const ca = rows.filter(p => p.contract).reduce((s, p) => s + p.contractAmt, 0), tot = cell();
      sb.innerHTML = `
        <div class="kpis"><div class="kpi"><span class="k">계약금액 합계</span><span class="v">${eok(ca)}<small>원</small></span></div><div class="kpi"><span class="k">집행금액 합계</span><span class="v">${eok(tot)}<small>원</small></span></div><div class="kpi"><span class="k">집행률 (자동산출)</span><span class="v">${pct((tot / Math.max(1, ca)) * 100)}</span><div class="prog"><i style="width:${Math.min(100, (tot / Math.max(1, ca)) * 100)}%"></i></div></div><div class="kpi"><span class="k">집행 잔액</span><span class="v">${eok(ca - tot)}<small>원</small></span></div></div>
        <div class="card"><div class="hd"><h3>연도별 · 항목별 집행금액 추이 (억원)</h3>${legend(items)}</div><div class="bd"><div class="chart" id="ec" role="img" aria-label="연도별 항목별 집행금액 누적 막대"></div></div></div>
        <div class="card"><div class="hd"><h3>항목별 집행금액 현황</h3></div><div class="tw"><table class="tbl"><thead><tr><th>집행항목</th>${ys.map(y => `<th class="num">${y}</th>`).join('')}<th class="num">합계</th><th class="num">구성비</th></tr></thead><tbody>${items.map(it => `<tr><td class="ink">${it}</td>${ys.map(y => `<td class="num">${eok(cell(it, y), 2)}</td>`).join('')}<td class="num">${num(cell(it))}</td><td class="num">${pct((cell(it) / Math.max(1, tot)) * 100)}</td></tr>`).join('')}</tbody><tfoot><tr><td>합계</td>${ys.map(y => `<td class="num">${eok(cell(null, y), 2)}</td>`).join('')}<td class="num">${num(tot)}</td><td class="num">100%</td></tr></tfoot></table></div></div>`;
      A.chart(A.$('#ec', sb), { grid, tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: v => (+v).toFixed(2) + '억원' }, xAxis: { type: 'category', data: ys.map(String), ...A.axis({ splitLine: { show: false } }) }, yAxis: { type: 'value', ...A.axis() },
        series: items.map((it, i) => ({ type: 'bar', name: it, stack: 'e', barMaxWidth: 26, data: ys.map(y => cell(it, y) / 1e8), itemStyle: { color: A.sc(i), borderColor: A.cv('--chartSurface'), borderWidth: 1 } })) });
      xls = () => A.downloadCSV('집행금액통계', ['집행항목', ...ys, '합계'], items.map(it => [it, ...ys.map(y => cell(it, y)), cell(it)]), ['합계', ...ys.map(y => cell(null, y)), tot]);
    }

    if (f.tab === 'etc') {
      const grp = (key, order) => { const ks = order || A.uniq(rows, key); return ks.map(k => { const r = rows.filter(p => (p[key] || '(공란)') === k); return { k, n: r.length, amt: r.reduce((s, p) => s + (p.contractAmt || 0), 0) }; }); };
      const G = [['원조유형별 지원현황', grp('type', TYPES), 'g1'], ['소득그룹별 지원현황', grp('income', ['최빈개도국', '하위중소득국', '상위중소득국', '고소득국', '미분류']), 'g2'], ['시행계획 분야별 지원현황', grp('crs', A.uniq(rows, p => p.crs || '(공란)')), 'g3']];
      sb.innerHTML = `<div class="grid3">${G.map(([t, d, id]) => `<div class="card"><div class="hd"><h3>${t}</h3><span class="note">계약금액 억원</span></div><div class="bd"><div class="chart short" id="${id}" role="img" aria-label="${t}"></div>
        <table class="tbl" style="margin-top:6px"><thead><tr><th>구분</th><th class="num">사업 수</th><th class="num">계약금액</th></tr></thead><tbody>${d.map(x => `<tr><td>${esc(x.k)}</td><td class="num">${x.n}</td><td class="num">${eok(x.amt)}</td></tr>`).join('')}</tbody></table></div></div>`).join('')}</div>
        <div class="card"><div class="hd"><h3>다자간 원조기구별 지원현황</h3><span class="note">세계은행 · UN · 지역개발은행 등</span></div><div class="empty">현재 등록 사업은 전량 <b>양자</b> 사업입니다. 다자기구 출자·협력 사업이 등록되면 기구별로 자동 집계됩니다.</div></div>`;
      G.forEach(([t, d, id]) => A.chart(A.$('#' + id, sb), { grid, tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: v => (+v).toFixed(1) + '억원' }, yAxis: { type: 'category', data: d.map(x => x.k), inverse: true, ...A.axis({ splitLine: { show: false } }) }, xAxis: { type: 'value', ...A.axis() }, series: [{ type: 'bar', name: '계약금액', barMaxWidth: 16, data: d.map(x => x.amt / 1e8), itemStyle: { color: A.sc(0), borderRadius: [0, 4, 4, 0] } }] }));
      xls = () => A.downloadCSV('기타통계', ['통계', '구분', '사업수', '계약금액'], G.flatMap(([t, d]) => d.map(x => [t, x.k, x.n, x.amt])));
    }
  });

  /* ── 피봇 분석 (SFR-035) ─────────────────── */
  const DIMS = { startYear: '시작연도', endYear: '종료연도', continent: '대륙', region: '지역', country: '수원국', field: '분야', workType: '공종', type: '사업구분', crs: '시행계획 분야', stage: '추진단계', team: '담당팀', income: '소득그룹', aid: '자금구분', proposer: '시행기관' };
  const MEAS = { count: ['사업 수', p => 1], planAmt: ['시행계획 예산', p => p.planAmt || 0], orderAmt: ['발주금액', p => p.orderAmt || 0], contractAmt: ['계약금액', p => p.contractAmt || 0], surplus: ['낙찰차액', p => A.surplusOf(p) || 0], exec: ['집행액', p => A.execOf(p)] };
  const UNITS = { 1: '원', 1e6: '백만원', 1e8: '억원' };
  const dimVal = (p, d) => d === 'stage' ? K.stageName(p.stage) : (p[d] ?? '(공란)') === '' ? '(공란)' : String(p[d] ?? '(공란)');
  const cmp = (a, b) => String(a).localeCompare(String(b), 'ko', { numeric: true });

  A.page('/pivot', { menu: 'pivot', title: '피봇 분석' }, view => {
    const S = (A.state.pv = A.state.pv || { rows: ['continent', 'country'], cols: ['startYear'], filters: {}, measure: 'contractAmt', unit: 1e8, sub: true, chart: false, stack: true });
    const base = A.visibleProjects();
    const used = new Set([...S.rows, ...S.cols, ...Object.keys(S.filters)]);
    view.innerHTML = `
      ${A.ph('피봇 분석', '행·열 축을 자유롭게 설정하면 통계가 즉시 재계산됩니다 · 필드를 끌어 행/열/필터 영역에 놓으세요', `<select class="btn" id="pv-load" aria-label="저장된 설정 불러오기">${A.opts(A.db.pivotPresets.map(x => [x.id, x.nm]), '', '저장된 설정 불러오기')}</select><button class="btn" id="pv-save">설정 저장</button><button class="btn" id="pv-print">${A.ICON.print}인쇄</button>${A.xlsBtn()}`, 'SFR-035')}
      <div class="pv">
        <div class="card"><div class="bd">
          <div class="zl"><span>필드</span><span>클릭: 행에 추가</span></div>
          <div class="zone" data-z="pool" style="background:none;border-style:solid">${Object.entries(DIMS).filter(([k]) => !used.has(k)).map(([k, n]) => `<span class="fchip dim" draggable="true" data-d="${k}">${n}</span>`).join('')}</div>
          <div class="zl"><span>필터</span></div><div class="zone" data-z="filters">${Object.keys(S.filters).map(k => `<span class="fchip flt" draggable="true" data-d="${k}" data-from="filters"><button class="mv" data-fl="${k}" title="값 선택">${DIMS[k]} (${S.filters[k].length})</button><button class="x" data-rm="filters:${k}" aria-label="제거">×</button></span>`).join('') || '<span class="small muted">필드를 끌어 놓으세요</span>'}</div>
          <div class="zl"><span>행</span><button class="btn sm ghost" id="pv-swap" title="행·열 바꾸기">⇄ 행·열 바꾸기</button></div><div class="zone" data-z="rows">${S.rows.map(k => `<span class="fchip dim" draggable="true" data-d="${k}" data-from="rows">${DIMS[k]}<button class="x" data-rm="rows:${k}" aria-label="제거">×</button></span>`).join('') || '<span class="small muted">필드를 끌어 놓으세요</span>'}</div>
          <div class="zl"><span>열</span></div><div class="zone" data-z="cols">${S.cols.map(k => `<span class="fchip dim" draggable="true" data-d="${k}" data-from="cols">${DIMS[k]}<button class="x" data-rm="cols:${k}" aria-label="제거">×</button></span>`).join('') || '<span class="small muted">필드를 끌어 놓으세요</span>'}</div>
          <div class="zl"><span>값</span></div>
          <div class="stack" style="gap:8px"><select id="pv-m" class="btn">${A.opts(Object.entries(MEAS).map(([k, v]) => [k, v[0] + (k === 'count' ? '' : ' (합계)')]), S.measure, null)}</select>
            <select id="pv-u" class="btn" ${S.measure === 'count' ? 'disabled' : ''}>${A.opts(Object.entries(UNITS), S.unit, null)}</select>
            <label class="row small"><input type="checkbox" id="pv-sub" ${S.sub ? 'checked' : ''}>소계 표시</label>
            <label class="row small"><input type="checkbox" id="pv-ch" ${S.chart ? 'checked' : ''}>차트로 보기</label>
            ${S.chart ? `<label class="row small"><input type="checkbox" id="pv-st" ${S.stack ? 'checked' : ''}>누적 막대</label>` : ''}
          </div>
        </div></div>
        <div class="stack">
          <div class="summary" id="pv-sum"></div>
          ${S.chart ? '<div class="card"><div class="hd"><h3>피봇 차트</h3><div id="pv-lg"></div></div><div class="bd"><div class="chart tall" id="pv-chart" role="img" aria-label="피봇 결과 차트"></div></div></div>' : ''}
          <div class="card"><div class="tw" style="max-height:640px"><table class="tbl pvt" id="pv-t"></table></div></div>
        </div>
      </div>`;

    /* 계산 */
    const data = base.filter(p => Object.entries(S.filters).every(([d, vals]) => vals.includes(dimVal(p, d))));
    const mf = MEAS[S.measure][1];
    const unit = S.measure === 'count' ? 1 : +S.unit;
    const key = (p, dims) => dims.map(d => dimVal(p, d));
    const rowKeys = A.uniq(data.map(p => key(p, S.rows).join('\u0001')), x => x).map(k => k.split('\u0001')).sort((a, b) => { for (let i = 0; i < a.length; i++) { const c = cmp(a[i], b[i]); if (c) return c; } return 0; });
    const colKeys = S.cols.length ? A.uniq(data.map(p => key(p, S.cols).join('\u0001')), x => x).map(k => k.split('\u0001')).sort((a, b) => { for (let i = 0; i < a.length; i++) { const c = cmp(a[i], b[i]); if (c) return c; } return 0; }) : [[]];
    const M = new Map();
    data.forEach(p => { const k = key(p, S.rows).join('\u0001') + '\u0002' + key(p, S.cols).join('\u0001'); M.set(k, (M.get(k) || 0) + mf(p)); });
    const val = (rk, ck) => { let s = 0; M.forEach((v, k) => { const [r, c] = k.split('\u0002'); const rr = r.split('\u0001'), cc = c.split('\u0001'); if (rk.every((x, i) => rr[i] === x) && ck.every((x, i) => cc[i] === x)) s += v; }); return s; };
    const fmt = v => (S.measure === 'count' ? num(v) : unit === 1 ? num(v) : (v / unit).toLocaleString('ko-KR', { maximumFractionDigits: unit === 1e8 ? 1 : 0, minimumFractionDigits: unit === 1e8 ? 1 : 0 }));
    const total = data.reduce((s, p) => s + mf(p), 0);
    A.$('#pv-sum', view).innerHTML = `<span>대상 <b>${data.length}</b>건</span><span>행 <b>${rowKeys.length}</b> × 열 <b>${colKeys.length}</b></span><span>${MEAS[S.measure][0]} 합계 <b>${fmt(total)}</b> ${S.measure === 'count' ? '건' : UNITS[unit]}</span>`;

    /* 표 렌더 */
    const nR = Math.max(1, S.rows.length);
    let thead = '';
    if (S.cols.length) {
      S.cols.forEach((d, lv) => {
        let cells = '', i = 0;
        while (i < colKeys.length) { let j = i; while (j + 1 < colKeys.length && colKeys[j + 1].slice(0, lv + 1).join() === colKeys[i].slice(0, lv + 1).join()) j++; cells += `<th class="c" colspan="${j - i + 1}">${esc(colKeys[i][lv])}</th>`; i = j + 1; }
        thead += `<tr>${lv === 0 ? `<th colspan="${nR}" rowspan="${S.cols.length}">${S.rows.map(r => DIMS[r]).join(' / ') || '구분'} <span class="muted">＼ ${S.cols.map(c => DIMS[c]).join(' / ')}</span></th>` : ''}${cells}${lv === 0 ? `<th rowspan="${S.cols.length}" class="num gt">합계</th>` : ''}</tr>`;
      });
    } else thead = `<tr><th colspan="${nR}">${S.rows.map(r => DIMS[r]).join(' / ') || '구분'}</th><th class="num gt">${MEAS[S.measure][0]}</th></tr>`;
    let body = '';
    const rowHtml = (rk, cls, label) => `<tr class="${cls}">${label || rk.map((v, i) => `<td class="rh">${v}</td>`).join('')}${S.cols.length ? colKeys.map(ck => `<td class="num">${(x => (x ? fmt(x) : '<span class="muted">·</span>'))(val(rk, ck))}</td>`).join('') : ''}<td class="num gt">${fmt(val(rk, []))}</td></tr>`;
    if (!S.rows.length) body = rowHtml([], '', `<td class="rh">전체</td>`);
    else {
      let prev0 = null;
      rowKeys.forEach((rk, i) => {
        const shown = rk.map((v, k) => (k === 0 && v === prev0 && S.rows.length > 1 ? '' : esc(v)));
        body += `<tr>${shown.map(v => `<td class="rh">${v}</td>`).join('')}${S.cols.length ? colKeys.map(ck => `<td class="num">${(x => (x ? fmt(x) : '<span class="muted">·</span>'))(val(rk, ck))}</td>`).join('') : ''}<td class="num gt">${fmt(val(rk, []))}</td></tr>`;
        prev0 = rk[0];
        const nxt = rowKeys[i + 1];
        if (S.sub && S.rows.length > 1 && (!nxt || nxt[0] !== rk[0])) body += rowHtml([rk[0]], 'sub', `<td class="rh" colspan="${nR}">${esc(rk[0])} 소계</td>`);
      });
    }
    const foot = `<tr><td colspan="${nR}" class="gt">합계</td>${S.cols.length ? colKeys.map(ck => `<td class="num gt">${fmt(val([], ck))}</td>`).join('') : ''}<td class="num gt">${fmt(total)}</td></tr>`;
    A.$('#pv-t', view).innerHTML = `<thead>${thead}</thead><tbody>${body || `<tr><td colspan="99" class="empty">데이터가 없습니다.</td></tr>`}</tbody><tfoot>${foot}</tfoot>`;

    /* 차트 */
    if (S.chart) {
      const x = (S.rows.length ? rowKeys : [[]]).map(r => r.join(' · ') || '전체');
      let series = colKeys.map(ck => ({ name: ck.join(' · ') || MEAS[S.measure][0], vals: (S.rows.length ? rowKeys : [[]]).map(rk => val(rk, ck) / unit) }));
      if (series.length > 8) { const top = series.map(s => ({ s, t: s.vals.reduce((a, b) => a + b, 0) })).sort((a, b) => b.t - a.t); const keep = top.slice(0, 7).map(t => t.s); const rest = top.slice(7).map(t => t.s); series = [...keep, { name: `기타 (${rest.length}개)`, vals: x.map((_, i) => rest.reduce((a, s) => a + s.vals[i], 0)) }]; }
      A.$('#pv-lg', view).innerHTML = series.length > 1 ? legend(series.map(s => s.name)) : '';
      A.chart(A.$('#pv-chart', view), { grid: { left: 8, right: 12, top: 16, bottom: 4, containLabel: true }, tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: v => fmt(v * unit) },
        xAxis: { type: 'category', data: x, ...A.axis({ splitLine: { show: false }, axisLabel: { color: A.cv('--muted'), fontSize: 10.5, rotate: x.length > 10 ? 40 : 0, interval: 0 } }) }, yAxis: { type: 'value', ...A.axis() },
        series: series.map((s, i) => ({ type: 'bar', name: s.name, stack: S.stack ? 'p' : undefined, barMaxWidth: 26, data: s.vals, itemStyle: { color: A.sc(i), borderColor: A.cv('--chartSurface'), borderWidth: 1, borderRadius: S.stack ? 0 : [4, 4, 0, 0] } })) });
    }

    /* 상호작용 */
    const move = (d, from, to) => {
      if (from === 'rows') S.rows = S.rows.filter(x => x !== d);
      if (from === 'cols') S.cols = S.cols.filter(x => x !== d);
      if (from === 'filters' && to !== 'filters') delete S.filters[d];
      if (to === 'rows' && !S.rows.includes(d)) S.rows.push(d);
      if (to === 'cols' && !S.cols.includes(d)) S.cols.push(d);
      if (to === 'filters' && !S.filters[d]) S.filters[d] = A.uniq(base.map(p => dimVal(p, d)), x => x);
      A.render();
    };
    A.$$('.fchip[draggable]', view).forEach(ch => ch.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', ch.dataset.d + '|' + (ch.dataset.from || 'pool'))));
    A.$$('.zone', view).forEach(z => {
      z.addEventListener('dragover', e => { e.preventDefault(); z.classList.add('over'); });
      z.addEventListener('dragleave', () => z.classList.remove('over'));
      z.addEventListener('drop', e => { e.preventDefault(); const [d, from] = e.dataTransfer.getData('text/plain').split('|'); if (d) move(d, from, z.dataset.z); });
    });
    A.$$('.zone[data-z="pool"] .fchip', view).forEach(ch => (ch.onclick = () => move(ch.dataset.d, 'pool', 'rows')));
    A.$$('[data-rm]', view).forEach(b => (b.onclick = e => { e.stopPropagation(); const [z, d] = b.dataset.rm.split(':'); move(d, z, 'pool'); }));
    A.$$('[data-fl]', view).forEach(b => (b.onclick = () => {
      const d = b.dataset.fl; const vals = A.uniq(base.map(p => dimVal(p, d)), x => x);
      const m = A.modal({ title: `필터 — ${DIMS[d]}`, body: `<div class="row"><button class="btn sm" id="fa">전체 선택</button><button class="btn sm" id="fn">전체 해제</button></div><div style="columns:2;max-height:360px;overflow:auto">${vals.map(v => `<label class="row small" style="break-inside:avoid;margin-bottom:4px"><input type="checkbox" value="${esc(v)}" ${S.filters[d].includes(v) ? 'checked' : ''}>${esc(v)}</label>`).join('')}</div>`, foot: '<button class="btn" data-close>취소</button><button class="btn pri" id="fok">적용</button>' });
      m.$('#fa').onclick = () => m.$$('input[type=checkbox]').forEach(c => (c.checked = true));
      m.$('#fn').onclick = () => m.$$('input[type=checkbox]').forEach(c => (c.checked = false));
      m.$('#fok').onclick = () => { S.filters[d] = m.$$('input[type=checkbox]').filter(c => c.checked).map(c => c.value); m.close(); A.render(); };
    }));
    A.$('#pv-swap', view).onclick = () => { [S.rows, S.cols] = [S.cols, S.rows]; A.render(); };
    A.$('#pv-m', view).onchange = e => { S.measure = e.target.value; A.render(); };
    A.$('#pv-u', view).onchange = e => { S.unit = +e.target.value; A.render(); };
    A.$('#pv-sub', view).onchange = e => { S.sub = e.target.checked; A.render(); };
    A.$('#pv-ch', view).onchange = e => { S.chart = e.target.checked; A.render(); };
    A.$('#pv-st', view) && (A.$('#pv-st', view).onchange = e => { S.stack = e.target.checked; A.render(); });
    A.$('#pv-print', view).onclick = () => window.print();
    A.$('#pv-load', view).onchange = e => { const x = A.db.pivotPresets.find(p => p.id === e.target.value); if (!x) return; Object.assign(S, { rows: [...x.rows], cols: [...x.cols], filters: JSON.parse(JSON.stringify(x.filters)), measure: x.measure }); A.toast(`'${x.nm}' 설정을 불러왔습니다.`); A.render(); };
    A.$('#pv-save', view).onclick = async () => {
      const nm = await A.ask('피봇 설정 저장', '설정 이름', { ok: '저장', value: `${S.rows.map(r => DIMS[r]).join('·')} × ${S.cols.map(c => DIMS[c]).join('·') || '-'} ${MEAS[S.measure][0]}` }); if (!nm) return;
      A.db.pivotPresets.push({ id: 'pv' + Date.now(), nm, rows: [...S.rows], cols: [...S.cols], filters: JSON.parse(JSON.stringify(S.filters)), measure: S.measure }); A.save(); A.toast('피봇 설정을 저장했습니다.', 'ok'); A.render();
    };
    A.$('#btn-xls', view).onclick = () => {
      const hdr = [...(S.rows.length ? S.rows.map(r => DIMS[r]) : ['구분']), ...(S.cols.length ? colKeys.map(ck => ck.join(' / ')) : []), '합계'];
      const rr = (S.rows.length ? rowKeys : [[]]).map(rk => [...(rk.length ? rk : ['전체']), ...(S.cols.length ? colKeys.map(ck => val(rk, ck) / unit) : []), val(rk, []) / unit]);
      A.downloadCSV(`피봇_${MEAS[S.measure][0]}`, hdr, rr, ['합계', ...Array(Math.max(0, S.rows.length - 1)).fill(''), ...(S.cols.length ? colKeys.map(ck => val([], ck) / unit) : []), total / unit]);
    };
  });
})(window.App);
