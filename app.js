
    // ============================================================
    // ACCESS GATE
    // ============================================================
    const ACCESS_CODE = 'km2025';
    const PRIVATE_CODE = '123456';
    const PUBLIC_PAGES = ['resume', 'papers', 'utilities'];
    const PRIVATE_TTL = 24 * 60 * 60 * 1000; // 24 hours

    function getPrivateGranted() {
      try {
        const raw = localStorage.getItem('km_private');
        if (!raw) return false;
        const { ts } = JSON.parse(raw);
        return Date.now() - ts < PRIVATE_TTL;
      } catch { return false; }
    }
    function setPrivateGranted() {
      localStorage.setItem('km_private', JSON.stringify({ ts: Date.now() }));
    }

    (function initGate() {
      const gate = document.getElementById('accessGate');
      const input = document.getElementById('accessInput');
      const btn = document.getElementById('accessBtn');
      const err = document.getElementById('accessError');

      if (sessionStorage.getItem('km_access') === 'granted') {
        gate.classList.add('hidden');
        return;
      }

      function tryEnter() {
        const val = input.value.trim();
        if (!val) { err.textContent = '请输入访问码'; return; }
        if (val === ACCESS_CODE) {
          sessionStorage.setItem('km_access', 'granted');
          gate.classList.add('hidden');
          err.textContent = '';
        } else {
          err.textContent = '访问码错误';
          input.value = '';
          input.focus();
        }
      }

      btn.addEventListener('click', tryEnter);
      input.addEventListener('keydown', e => { if (e.key === 'Enter') tryEnter(); });
      input.focus();
    })();

    // ============================================================
    // PRIVATE ACCESS MODAL
    // ============================================================
    let pendingPage = null;

    function openPrivModal(pageId) {
      pendingPage = pageId;
      const modal = document.getElementById('privModal');
      const input = document.getElementById('privInput');
      const err = document.getElementById('privError');
      if (err) err.textContent = '';
      if (input) {
        input.value = '';
        modal.classList.add('open');
        setTimeout(() => input.focus(), 100);
      }
    }

    function closePrivModal() {
      const modal = document.getElementById('privModal');
      modal.classList.remove('open');
      pendingPage = null;
    }

    function tryPrivEnter() {
      const input = document.getElementById('privInput');
      const err = document.getElementById('privError');
      const val = input.value.trim();
      if (!val) { err.textContent = '请输入私人访问码'; return; }
      if (val === PRIVATE_CODE) {
        setPrivateGranted();
        closePrivModal();
        if (pendingPage) switchPage(pendingPage);
      } else {
        err.textContent = '私人访问码错误';
        input.value = '';
        input.focus();
      }
    }

    (function initPrivModal() {
      const enterBtn = document.getElementById('privEnter');
      const cancelBtn = document.getElementById('privCancel');
      const input = document.getElementById('privInput');
      if (enterBtn) enterBtn.addEventListener('click', tryPrivEnter);
      if (cancelBtn) cancelBtn.addEventListener('click', closePrivModal);
      if (input) {
        input.addEventListener('keydown', e => { if (e.key === 'Enter') tryPrivEnter(); });
      }
    })();

    // ============================================================
    // TAB SWITCHING
    // ============================================================

    let switching = false;

    function isPublic(pageId) {
      return PUBLIC_PAGES.includes(pageId);
    }

    function switchPage(pageId) {
      if (switching) return;

      // If private page and not authenticated, show gate
      if (!isPublic(pageId) && sessionStorage.getItem('km_access') !== 'granted') {
        const gate = document.getElementById('accessGate');
        if (gate) {
          gate.classList.remove('hidden');
          const input = document.getElementById('accessInput');
          if (input) setTimeout(() => input.focus(), 100);
        }
        return;
      }

      // If private page but private code not yet entered, show private modal
      if (!isPublic(pageId) && !getPrivateGranted()) {
        openPrivModal(pageId);
        return;
      }

      // If public page, hide gate so user can see content
      if (isPublic(pageId) && sessionStorage.getItem('km_access') !== 'granted') {
        const gate = document.getElementById('accessGate');
        if (gate) gate.classList.add('hidden');
      }

      const current = document.querySelector('.page.active');
      const target = document.getElementById('page-' + pageId);
      if (!target || current === target) return;

      switching = true;

      // Update tabs immediately
      document.querySelectorAll('.nav-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.page === pageId);
      });

      // Exit current page
      if (current) {
        current.classList.remove('active');
        current.classList.add('exit');
      }

      // Body overflow (apply immediately for scroll feel)
      document.body.style.overflow = (pageId === 'graph') ? 'hidden' : 'auto';

      // After exit animation, show target
      setTimeout(() => {
        if (current) current.classList.remove('exit');
        target.classList.add('active');
        switching = false;

        // Resize graph when switching to it
        if (pageId === 'graph') {
          setTimeout(() => {
            const c = document.getElementById('graph-container');
            const w = c.clientWidth;
            const h = c.clientHeight;
            svg.attr('width', w).attr('height', h);
            simulation.force('center', d3.forceCenter(w / 2, h / 2));
            simulation.alpha(0.3).restart();
          }, 50);
        }
      }, 260);
    }

    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        switchPage(tab.dataset.page);
      });
    });

    // Nav scroll detection for fade hint
    const navBar = document.querySelector('.nav-bar');
    if (navBar) {
      function checkNavScroll() {
        navBar.classList.toggle('can-scroll', navBar.scrollWidth > navBar.clientWidth);
      }
      checkNavScroll();
      window.addEventListener('resize', checkNavScroll);
      navBar.addEventListener('scroll', () => {
        navBar.classList.toggle('can-scroll', navBar.scrollLeft + navBar.clientWidth < navBar.scrollWidth - 4);
      });
    }

    // ============================================================
    // 1. DATA
    // ============================================================

    const CATEGORIES = [
      { id: 'lang',       name: '编程语言',     color: '#ff6b6b' },
      { id: 'frontend',   name: '前端开发',     color: '#4ecdc4' },
      { id: 'backend',    name: '后端开发',     color: '#45b7d1' },
      { id: 'datascience',name: '数据科学',     color: '#96ceb4' },
      { id: 'ai',         name: 'AI / 深度学习',color: '#f0c040' },
      { id: 'devops',     name: '工程效率',     color: '#c084fc' },
      { id: 'design',     name: '设计',         color: '#f472b6' },
      { id: 'soft',       name: '软技能',       color: '#fb923c' },
    ];

    const SKILLS = [
      { id: 'python',     name: 'Python',           cat: 'lang',       level: 5, desc: '主要编程语言，广泛应用于后端、数据科学和 AI 领域' },
      { id: 'javascript', name: 'JavaScript / TS',  cat: 'lang',       level: 5, desc: '现代 Web 开发的核心语言，全栈能力基础' },
      { id: 'go',         name: 'Go',               cat: 'lang',       level: 3, desc: '高性能后端语言，擅长并发编程' },
      { id: 'java',       name: 'Java',             cat: 'lang',       level: 3, desc: '企业级应用开发语言' },
      { id: 'sql',        name: 'SQL',              cat: 'lang',       level: 4, desc: '数据库查询与数据管理' },
      { id: 'react',      name: 'React',            cat: 'frontend',   level: 5, desc: '前端 UI 框架，组件化开发' },
      { id: 'vue',        name: 'Vue.js',           cat: 'frontend',   level: 4, desc: '渐进式前端框架' },
      { id: 'htmlcss',    name: 'HTML / CSS',       cat: 'frontend',   level: 5, desc: 'Web 基础技术栈' },
      { id: 'tailwind',   name: 'TailwindCSS',      cat: 'frontend',   level: 4, desc: '实用优先的 CSS 框架' },
      { id: 'd3',         name: 'D3.js',            cat: 'frontend',   level: 3, desc: '数据可视化库，擅长定制化图表' },
      { id: 'nodejs',     name: 'Node.js',          cat: 'backend',    level: 4, desc: 'JavaScript 运行时，构建后端服务' },
      { id: 'django',     name: 'Django / FastAPI', cat: 'backend',    level: 4, desc: 'Python Web 框架，快速构建 API' },
      { id: 'rest',       name: 'REST API',         cat: 'backend',    level: 5, desc: 'API 设计规范，前后端通信标准' },
      { id: 'graphql',    name: 'GraphQL',          cat: 'backend',    level: 3, desc: '灵活的 API 查询语言' },
      { id: 'dataanalysis', name: '数据分析',       cat: 'datascience',level: 4, desc: '数据清洗、探索性分析与洞察提取' },
      { id: 'pandas',     name: 'Pandas',           cat: 'datascience',level: 4, desc: 'Python 数据分析核心库' },
      { id: 'dataviz',    name: '数据可视化',       cat: 'datascience',level: 4, desc: '将数据转化为直观的图表与仪表盘' },
      { id: 'jupyter',    name: 'Jupyter',          cat: 'datascience',level: 3, desc: '交互式编程环境，适合数据探索' },
      { id: 'ml',         name: '机器学习',         cat: 'ai',         level: 4, desc: '传统机器学习算法与模型训练' },
      { id: 'pytorch',    name: 'PyTorch',          cat: 'ai',         level: 4, desc: '深度学习框架，灵活的动态计算图' },
      { id: 'nlp',        name: 'NLP',              cat: 'ai',         level: 3, desc: '自然语言处理技术' },
      { id: 'llm',        name: 'LLM',              cat: 'ai',         level: 4, desc: '大语言模型应用与微调' },
      { id: 'git',        name: 'Git',              cat: 'devops',     level: 5, desc: '版本控制与协作开发' },
      { id: 'cicd',       name: 'CI / CD',          cat: 'devops',     level: 4, desc: '自动化构建、测试与部署流水线' },
      { id: 'docker',     name: 'Docker',           cat: 'devops',     level: 4, desc: '容器化部署与开发环境管理' },
      { id: 'arch',       name: '架构设计',         cat: 'devops',     level: 4, desc: '系统架构设计与技术选型' },
      { id: 'codereview', name: '代码审查',         cat: 'devops',     level: 4, desc: '代码质量保证与知识分享' },
      { id: 'ui',         name: 'UI 设计',          cat: 'design',     level: 3, desc: '界面视觉设计' },
      { id: 'ux',         name: '用户体验',         cat: 'design',     level: 4, desc: '用户研究与交互设计' },
      { id: 'figma',      name: 'Figma',            cat: 'design',     level: 3, desc: '协作式 UI 设计工具' },
      { id: 'teamwork',   name: '团队协作',         cat: 'soft',       level: 5, desc: '跨团队协作与沟通' },
      { id: 'comm',       name: '沟通表达',         cat: 'soft',       level: 4, desc: '清晰表达技术方案与想法' },
      { id: 'techwriting',name: '技术写作',         cat: 'soft',       level: 4, desc: '技术文档与博客撰写' },
      { id: 'present',    name: '演讲分享',         cat: 'soft',       level: 3, desc: '技术分享与演讲表达' },
      { id: 'pm',         name: '项目管理',         cat: 'soft',       level: 4, desc: '项目规划、进度管理与风险控制' },
    ];

    const EDGES = [
      { s: 'python', t: 'django' }, { s: 'python', t: 'pandas' }, { s: 'python', t: 'pytorch' },
      { s: 'python', t: 'ml' }, { s: 'python', t: 'dataanalysis' },
      { s: 'javascript', t: 'react' }, { s: 'javascript', t: 'vue' }, { s: 'javascript', t: 'nodejs' },
      { s: 'javascript', t: 'htmlcss' }, { s: 'sql', t: 'dataanalysis' }, { s: 'go', t: 'arch' },
      { s: 'react', t: 'htmlcss' }, { s: 'react', t: 'tailwind' }, { s: 'react', t: 'd3' },
      { s: 'vue', t: 'htmlcss' }, { s: 'vue', t: 'tailwind' }, { s: 'd3', t: 'dataviz' },
      { s: 'htmlcss', t: 'ui' }, { s: 'nodejs', t: 'rest' }, { s: 'nodejs', t: 'graphql' },
      { s: 'nodejs', t: 'docker' }, { s: 'django', t: 'rest' }, { s: 'django', t: 'docker' },
      { s: 'rest', t: 'graphql' }, { s: 'dataanalysis', t: 'pandas' }, { s: 'dataanalysis', t: 'dataviz' },
      { s: 'dataanalysis', t: 'jupyter' }, { s: 'dataanalysis', t: 'ml' }, { s: 'pandas', t: 'jupyter' },
      { s: 'dataviz', t: 'd3' }, { s: 'ml', t: 'pytorch' }, { s: 'ml', t: 'nlp' },
      { s: 'ml', t: 'dataanalysis' }, { s: 'pytorch', t: 'nlp' }, { s: 'pytorch', t: 'llm' },
      { s: 'nlp', t: 'llm' }, { s: 'git', t: 'cicd' }, { s: 'git', t: 'codereview' },
      { s: 'docker', t: 'cicd' }, { s: 'docker', t: 'arch' }, { s: 'cicd', t: 'pm' },
      { s: 'arch', t: 'pm' }, { s: 'codereview', t: 'teamwork' }, { s: 'ui', t: 'figma' },
      { s: 'ui', t: 'ux' }, { s: 'ux', t: 'figma' }, { s: 'ux', t: 'htmlcss' },
      { s: 'teamwork', t: 'comm' }, { s: 'teamwork', t: 'pm' }, { s: 'comm', t: 'techwriting' },
      { s: 'comm', t: 'present' }, { s: 'techwriting', t: 'present' }, { s: 'react', t: 'nodejs' },
      { s: 'react', t: 'rest' }, { s: 'react', t: 'ui' }, { s: 'vue', t: 'rest' },
      { s: 'nodejs', t: 'javascript' }, { s: 'django', t: 'python' }, { s: 'pm', t: 'arch' },
      { s: 'pm', t: 'comm' }, { s: 'dataviz', t: 'ui' }, { s: 'llm', t: 'nlp' }, { s: 'llm', t: 'python' },
    ];

    const skillMap = {};
    SKILLS.forEach(s => skillMap[s.id] = s);
    const catMap = {};
    CATEGORIES.forEach(c => catMap[c.id] = c);

    // ============================================================
    // 2. SETUP D3
    // ============================================================

    const container = document.getElementById('graph-container');
    const svg = d3.select('#graph-svg');
    const $tooltip = d3.select('#tooltip');
    const width = container.clientWidth;
    const height = container.clientHeight;

    const g = svg.append('g').attr('class', 'main-group');
    const zoom = d3.zoom()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => { g.attr('transform', event.transform); });
    svg.call(zoom);

    svg.append('defs').selectAll('marker')
      .data(['arrow']).join('marker')
      .attr('id', d => d).attr('viewBox', '0 -5 10 10').attr('refX', 22).attr('refY', 0)
      .attr('markerWidth', 6).attr('markerHeight', 6).attr('orient', 'auto')
      .append('path').attr('fill', 'rgba(255,255,255,0.15)').attr('d', 'M0,-5L10,0L0,5');

    const defs = svg.select('defs');
    const filter = defs.append('filter').attr('id', 'glow');
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'blur');
    const merge = filter.append('feMerge');
    merge.append('feMergeNode').attr('in', 'blur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');

    const filterLg = defs.append('filter').attr('id', 'glow-lg');
    filterLg.append('feGaussianBlur').attr('stdDeviation', '8').attr('result', 'blur');
    const mergeLg = filterLg.append('feMerge');
    mergeLg.append('feMergeNode').attr('in', 'blur');
    mergeLg.append('feMergeNode').attr('in', 'SourceGraphic');

    // ============================================================
    // 3. PROCESS DATA
    // ============================================================

    const nodes = SKILLS.map(s => ({
      ...s, r: 8 + s.level * 3.5, color: catMap[s.cat].color,
    }));

    const links = EDGES.map(e => ({ source: e.s, target: e.t }));

    const adjacency = {};
    nodes.forEach(n => adjacency[n.id] = new Set());
    links.forEach(l => {
      const sid = typeof l.source === 'object' ? l.source.id : l.source;
      const tid = typeof l.target === 'object' ? l.target.id : l.target;
      adjacency[sid].add(tid); adjacency[tid].add(sid);
    });

    // ============================================================
    // 4. FORCE SIMULATION
    // ============================================================

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(d => {
        const s = typeof d.source === 'object' ? d.source : d.source;
        const t = typeof d.target === 'object' ? d.target : d.target;
        return (skillMap[s.id]?.cat === skillMap[t.id]?.cat) ? 70 : 110;
      }).strength(0.5))
      .force('charge', d3.forceManyBody().strength(d => -d.r * 14))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => d.r + 8).strength(0.7))
      .alphaDecay(0.025)
      .on('tick', ticked);

    // ============================================================
    // 5. DRAW
    // ============================================================

    const linkGroup = g.append('g').attr('class', 'links');
    const link = linkGroup.selectAll('line').data(links).join('line')
      .attr('stroke', 'rgba(255,255,255,0.08)').attr('stroke-width', 1.2).attr('stroke-linecap', 'round');

    const nodeGroup = g.append('g').attr('class', 'nodes');
    const node = nodeGroup.selectAll('g').data(nodes).join('g').attr('class', 'node-group')
      .call(d3.drag().on('start', dragStarted).on('drag', dragged).on('end', dragEnded));

    node.append('circle')
      .attr('r', d => d.r).attr('fill', d => d.color).attr('stroke', d => d.color)
      .attr('stroke-width', 1).attr('stroke-opacity', 0.3).attr('filter', 'url(#glow)')
      .style('cursor', 'pointer').style('transition', 'stroke-width 0.2s, stroke-opacity 0.2s');

    node.append('circle').attr('class', 'inner-ring')
      .attr('r', d => d.r + 3).attr('fill', 'none').attr('stroke', d => d.color)
      .attr('stroke-width', 0).attr('stroke-opacity', 0)
      .style('transition', 'stroke-width 0.25s, stroke-opacity 0.25s').style('pointer-events', 'none');

    node.append('text').text(d => d.name).attr('dy', d => d.r + 15)
      .attr('text-anchor', 'middle').attr('fill', 'rgba(255,255,255,0.55)')
      .attr('font-size', '10px').attr('font-weight', '500').attr('font-family', 'Inter, sans-serif')
      .style('pointer-events', 'none').style('transition', 'fill 0.2s');

    // ============================================================
    // 6. INTERACTIONS
    // ============================================================

    let selectedNodeId = null;
    function getNeighborIds(id) { return adjacency[id] || new Set(); }

    function highlightNode(id) {
      selectedNodeId = id;
      const neighborIds = getNeighborIds(id);
      neighborIds.add(id);
      node.each(function(d) {
        const isActive = neighborIds.has(d.id), isCenter = d.id === id;
        const circle = d3.select(this).select('circle');
        const text = d3.select(this).select('text');
        const ring = d3.select(this).select('.inner-ring');
        circle.attr('stroke-width', isCenter ? 3 : isActive ? 2 : 0)
          .attr('stroke-opacity', isActive ? 0.6 : 0)
          .transition().duration(300).attr('fill-opacity', isActive ? 1 : 0.1);
        text.transition().duration(300)
          .attr('fill', isActive ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.15)');
        ring.attr('stroke-width', isCenter ? 5 : 0).attr('stroke-opacity', isCenter ? 0.35 : 0);
        circle.attr('filter', isCenter ? 'url(#glow-lg)' : (isActive ? 'url(#glow)' : null));
      });
      link.each(function(d) {
        const sid = typeof d.source === 'object' ? d.source.id : d.source;
        const tid = typeof d.target === 'object' ? d.target.id : d.target;
        const isConnected = (sid === id || tid === id);
        d3.select(this).transition().duration(300)
          .attr('stroke', isConnected ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.03)')
          .attr('stroke-width', isConnected ? 2 : 0.5);
      });
    }

    function clearHighlight() {
      selectedNodeId = null;
      node.each(function(d) {
        d3.select(this).select('circle').attr('filter', 'url(#glow)')
          .attr('stroke-width', 1).attr('stroke-opacity', 0.3).attr('fill-opacity', 1);
        d3.select(this).select('text').attr('fill', 'rgba(255,255,255,0.55)');
        d3.select(this).select('.inner-ring').attr('stroke-width', 0).attr('stroke-opacity', 0);
      });
      link.attr('stroke', 'rgba(255,255,255,0.08)').attr('stroke-width', 1.2);
      closePanel();
    }

    svg.on('click', (event) => { if (event.target === svg.node()) clearHighlight(); });

    node.on('mouseenter', function(event, d) {
      if (selectedNodeId) return;
      $tooltip.select('.tt-name').text(d.name);
      $tooltip.select('.tt-cat').text(catMap[d.cat]?.name || '');
      $tooltip.classed('visible', true).style('left', (event.offsetX + 14) + 'px').style('top', (event.offsetY - 10) + 'px');
      if (!selectedNodeId) {
        d3.select(this).select('circle').attr('filter', 'url(#glow-lg)').attr('stroke-width', 2.5).attr('stroke-opacity', 0.5);
        d3.select(this).select('.inner-ring').attr('stroke-width', 4).attr('stroke-opacity', 0.3);
        d3.select(this).select('text').attr('fill', 'rgba(255,255,255,0.9)');
      }
    });
    node.on('mousemove', function(event) {
      if (selectedNodeId) return;
      $tooltip.style('left', (event.offsetX + 14) + 'px').style('top', (event.offsetY - 10) + 'px');
    });
    node.on('mouseleave', function(event, d) {
      $tooltip.classed('visible', false);
      if (!selectedNodeId) {
        d3.select(this).select('circle').attr('filter', 'url(#glow)').attr('stroke-width', 1).attr('stroke-opacity', 0.3);
        d3.select(this).select('.inner-ring').attr('stroke-width', 0).attr('stroke-opacity', 0);
        d3.select(this).select('text').attr('fill', 'rgba(255,255,255,0.55)');
      }
    });
    node.on('click', function(event, d) {
      event.stopPropagation();
      if (selectedNodeId === d.id) { clearHighlight(); return; }
      highlightNode(d.id);
      showPanel(d);
    });

    // ============================================================
    // 7. DETAIL PANEL
    // ============================================================

    const panel = document.getElementById('detailPanel');
    const panelName = document.getElementById('panelName');
    const panelCatTag = document.getElementById('panelCatTag');
    const panelStars = document.getElementById('panelStars');
    const panelLevelLabel = document.getElementById('panelLevelLabel');
    const panelDesc = document.getElementById('panelDesc');
    const panelConn = document.getElementById('panelConnections');
    const panelClose = document.getElementById('panelClose');
    panelClose.addEventListener('click', clearHighlight);

    function showPanel(d) {
      const cat = catMap[d.cat];
      panelCatTag.textContent = cat.name;
      panelCatTag.style.background = cat.color + '22';
      panelCatTag.style.color = cat.color;
      panelName.textContent = d.name;
      panelStars.innerHTML = '';
      for (let i = 0; i < 5; i++) {
        const span = document.createElement('span');
        span.textContent = '★'; if (i < d.level) span.classList.add('filled');
        panelStars.appendChild(span);
      }
      panelLevelLabel.textContent = (['', '入门', '初阶', '进阶', '熟练', '精通'])[d.level] || '';
      panelDesc.textContent = d.desc;
      panelConn.innerHTML = '';
      const neighborIds = getNeighborIds(d.id);
      const neighbors = [];
      neighborIds.forEach(nid => { if (nid !== d.id && skillMap[nid]) neighbors.push(skillMap[nid]); });
      neighbors.sort((a, b) => b.level - a.level);
      neighbors.forEach(n => {
        const chip = document.createElement('span');
        chip.className = 'conn-chip';
        chip.style.borderLeft = '3px solid ' + (catMap[n.cat]?.color || 'rgba(255,255,255,0.1)');
        chip.textContent = n.name;
        chip.addEventListener('click', () => {
          const targetNode = nodes.find(nd => nd.id === n.id);
          if (targetNode) { highlightNode(n.id); showPanel(targetNode); }
        });
        panelConn.appendChild(chip);
      });
      panel.classList.add('open');
    }

    function closePanel() { panel.classList.remove('open'); }

    // ============================================================
    // 8. FILTERS
    // ============================================================

    let activeFilter = null;

    function buildFilters() {
      const container = document.getElementById('filters');
      const allBtn = document.createElement('button');
      allBtn.className = 'filter-btn active';
      allBtn.textContent = '全部';
      allBtn.dataset.cat = 'all';
      allBtn.addEventListener('click', () => setFilter('all'));
      container.appendChild(allBtn);
      CATEGORIES.forEach(c => {
        const count = SKILLS.filter(s => s.cat === c.id).length;
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.innerHTML = `<span class="dot" style="background:${c.color}"></span>${c.name}<span class="count">${count}</span>`;
        btn.dataset.cat = c.id;
        btn.addEventListener('click', () => setFilter(c.id));
        container.appendChild(btn);
      });
    }

    function setFilter(catId) {
      activeFilter = catId;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === catId));
      if (selectedNodeId) clearHighlight();
      node.each(function(d) {
        d3.select(this).style('display', (catId === 'all' || d.cat === catId) ? null : 'none');
      });
      link.each(function(d) {
        const sid = typeof d.source === 'object' ? d.source.id : d.source;
        const tid = typeof d.target === 'object' ? d.target.id : d.target;
        const sVisible = catId === 'all' || (skillMap[sid]?.cat === catId);
        const tVisible = catId === 'all' || (skillMap[tid]?.cat === catId);
        d3.select(this).style('display', (sVisible && tVisible) ? null : 'none');
      });
      simulation.alpha(0.3).restart();
    }

    // ============================================================
    // 9. SEARCH
    // ============================================================

    const searchInput = document.getElementById('searchInput');
    let searchTimeout = null;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        const q = searchInput.value.trim().toLowerCase();
        if (!q) { node.style('opacity', 1); link.style('opacity', 1); return; }
        node.each(function(d) {
          const match = d.name.toLowerCase().includes(q) || d.desc.toLowerCase().includes(q);
          d3.select(this).style('opacity', match ? 1 : 0.12);
        });
        link.style('opacity', 0.08);
      }, 200);
    });

    // ============================================================
    // 10. TICK
    // ============================================================

    function ticked() {
      link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    }

    // ============================================================
    // 11. DRAG
    // ============================================================

    function dragStarted(event, d) { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; }
    function dragged(event, d) { d.fx = event.x; d.fy = event.y; }
    function dragEnded(event, d) { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }

    // ============================================================
    // 12. BUILD UI
    // ============================================================

    buildFilters();

    const legendContainer = document.getElementById('legend');
    CATEGORIES.forEach(c => {
      const item = document.createElement('div');
      item.className = 'legend-item';
      item.innerHTML = `<span class="swatch" style="background:${c.color}"></span>${c.name}`;
      legendContainer.appendChild(item);
    });

    // ============================================================
    // 13. RESIZE
    // ============================================================

    window.addEventListener('resize', () => {
      const w = container.clientWidth, h = container.clientHeight;
      svg.attr('width', w).attr('height', h);
      simulation.force('center', d3.forceCenter(w / 2, h / 2));
      simulation.alpha(0.3).restart();
    });

    simulation.force('center', d3.forceCenter(width / 2, height / 2));
    setTimeout(() => { simulation.alpha(0.5).restart(); }, 100);

    console.log('✦ KM loaded —', nodes.length, 'skills,', links.length, 'connections');

    // ============================================================
    // DAILY PLANNER
    // ============================================================

    // Set today's date
    const dateEl = document.getElementById('dailyDate');
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    if (dateEl) {
      dateEl.textContent = `${y}.${m}.${d} ${weekdays[now.getDay()]}`;
    }

    // Date-range notice: 雅思B段小班 6.18 - 6.27
    const noticeEl = document.getElementById('dailyNotice');
    if (noticeEl) {
      const start = new Date(2026, 5, 18); // Jun 18
      const end = new Date(2026, 5, 27);   // Jun 27
      if (now >= start && now <= end) {
        noticeEl.textContent = '📢 6.18 - 6.27 雅思 B 段小班 · 集中上课';
        noticeEl.classList.add('show');
      }
    }

    function getSchedule() {
      const month = now.getMonth() + 1;
      const date = now.getDate();
      const isJun24 = (month === 6 && date === 24);

      // Class days
      if (isJun24) {
        // June 24: afternoon 14:30-17:30
        return [
          { time: '08:00', title: '起床 & 听力磨耳朵', desc: '刷牙洗漱时播放雅思听力 / BBC', done: false },
          { time: '08:30', title: '早餐 & 晨读', desc: '雅思口语素材朗读 · 跟读训练', done: false },
          { time: '09:00', title: '📖 雅思B段小班 上午课', desc: '9:00 - 12:00 小班授课', done: false },
          { time: '10:30', title: '📖 雅思B段小班 上午课', desc: '9:00 - 12:00 小班授课', done: false },
          { time: '12:00', title: '午餐 & 休息', desc: '放松大脑，下午才有状态', done: false },
          { time: '13:30', title: '自习 / 复习', desc: '巩固上午内容，预习下午课程', done: false },
          { time: '14:30', title: '📖 雅思B段小班 下午课', desc: '14:30 - 17:30 小班授课（6.24 调课）', done: false },
          { time: '17:30', title: '单词 & 错题整理', desc: '雅思核心词汇 · 当日错题复盘', done: false },
          { time: '18:00', title: '运动 & 放松', desc: '健身 / 跑步 / 散步', done: false },
          { time: '20:00', title: '真题模拟', desc: '完整套题训练（隔天）', done: false },
          { time: '21:30', title: '晚间复盘', desc: '总结今日薄弱项，调整明日计划', done: false },
          { time: '23:00', title: '睡前准备', desc: '减少屏幕时间，准备入睡', done: false },
        ];
      }

      // Regular class days: Mon-Sat 9:00-12:00, 13:30-16:30
      return [
        { time: '08:00', title: '起床 & 听力磨耳朵', desc: '刷牙洗漱时播放雅思听力 / BBC', done: false },
        { time: '08:30', title: '早餐 & 晨读', desc: '雅思口语素材朗读 · 跟读训练', done: false },
        { time: '09:00', title: '📖 雅思B段小班 上午课', desc: '9:00 - 12:00 小班授课', done: false },
        { time: '10:30', title: '📖 雅思B段小班 上午课', desc: '9:00 - 12:00 小班授课', done: false },
        { time: '12:00', title: '午餐 & 休息', desc: '放松大脑，下午才有状态', done: false },
        { time: '13:30', title: '📖 雅思B段小班 下午课', desc: '13:30 - 16:30 小班授课', done: false },
        { time: '15:00', title: '📖 雅思B段小班 下午课', desc: '13:30 - 16:30 小班授课', done: false },
        { time: '16:30', title: '单词 & 错题整理', desc: '雅思核心词汇 · 当日错题复盘', done: false },
        { time: '18:00', title: '运动 & 放松', desc: '健身 / 跑步 / 散步', done: false },
        { time: '20:00', title: '真题模拟', desc: '完整套题训练（隔天）', done: false },
        { time: '21:30', title: '晚间复盘', desc: '总结今日薄弱项，调整明日计划', done: false },
        { time: '23:00', title: '睡前准备', desc: '减少屏幕时间，准备入睡', done: false },
      ];
    }

    let schedule = getSchedule();

    function renderDaily() {
      const container = document.getElementById('dailyTimeline');
      const doneEl = document.getElementById('doneCount');
      const totalEl = document.getElementById('totalCount');
      const progressEl = document.getElementById('dailyProgress');
      if (!container) return;

      container.innerHTML = '';
      let done = 0;

      schedule.forEach((item, idx) => {
        if (item.done) done++;
        const slot = document.createElement('div');
        slot.className = 'daily-slot' + (item.done ? ' done' : '');
        slot.innerHTML = `
          <span class="time-marker"></span>
          <span class="time-label">${item.time}</span>
          <div class="slot-content">
            <div class="slot-title">${item.title}</div>
            <div class="slot-desc">${item.desc}</div>
          </div>
          <span class="check">✓</span>
        `;
        slot.addEventListener('click', () => {
          schedule[idx].done = !schedule[idx].done;
          renderDaily();
        });
        container.appendChild(slot);
      });

      if (doneEl) doneEl.textContent = done;
      if (totalEl) totalEl.textContent = schedule.length;
      if (progressEl) progressEl.style.width = (done / schedule.length * 100) + '%';
    }

    renderDaily();

    // ============================================================
    // COUNTDOWN & EXAM SCHEDULE
    // ============================================================

    function updateCountdown() {
      const el = document.getElementById('countdown');
      if (!el) return;
      const now = new Date();
      const exam = new Date('2026-07-04');
      const diff = Math.ceil((exam - now) / (1000 * 60 * 60 * 24));
      if (diff > 0) {
        el.textContent = `⏳ 距雅思笔试 ${diff} 天`;
        el.className = 'countdown' + (diff <= 7 ? '' : ' normal');
      } else if (diff === 0) {
        el.textContent = '⚡ 今天笔试！';
        el.className = 'countdown';
      } else {
        el.textContent = '✅ 笔试已结束';
        el.className = 'countdown normal';
      }
    }
    updateCountdown();

    const EXAMS = [
      { name: '雅思笔试', date: '2026-07-04', desc: '听力·阅读·写作', urgent: true },
      { name: '雅思口语', date: '2026-07-06', desc: '口语面试', urgent: true },
      { name: '期末答辩', date: '2026-07-15', desc: '研究进展汇报' },
    ];

    function renderExams() {
      const list = document.getElementById('examList');
      if (!list) return;
      list.innerHTML = '';
      const now = new Date();
      EXAMS.forEach(e => {
        const d = new Date(e.date);
        const diff = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
        const months = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
        const m = months[d.getMonth()];
        const day = d.getDate();
        const countdown = diff > 0 ? `${diff} 天后` : (diff === 0 ? '今天！' : '已过');
        const item = document.createElement('div');
        item.className = 'exam-item';
        item.innerHTML = `
          <div class="exam-date-badge">
            <div class="month">${m}</div>
            <div class="day">${day}</div>
          </div>
          <div class="exam-info">
            <div class="exam-name">${e.name}</div>
            <div class="exam-desc">${e.desc}</div>
          </div>
          <div class="exam-countdown ${diff <= 7 ? 'urgent' : ''}">${countdown}</div>
        `;
        list.appendChild(item);
      });
    }

    // Exam panel toggle
    const examBtn = document.getElementById('examBtn');
    const examPanel = document.getElementById('examPanel');
    const examClose = document.getElementById('examClose');

    if (examBtn && examPanel) {
      examBtn.addEventListener('click', () => {
        examPanel.classList.toggle('open');
        renderExams();
      });
    }
    if (examClose && examPanel) {
      examClose.addEventListener('click', () => {
        examPanel.classList.remove('open');
      });
    }

    // ============================================================
    // STOCK TRACKER
    // ============================================================

    const STORAGE_KEY = 'skill_graph_stocks';

    function loadRecords() {
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
    }

    function saveRecords(records) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    }

    function renderStockChart(records) {
      const chart = document.getElementById('stockChart');
      if (!chart || records.length === 0) { if (chart) chart.innerHTML = '<div style="color:rgba(255,255,255,0.15);font-size:12px;padding:20px;width:100%;text-align:center">暂无数据，添加一条记录开始追踪</div>'; return; }
      const prices = records.map(r => r.price);
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const range = max - min || 1;
      chart.innerHTML = '';
      records.forEach(r => {
        const h = ((r.price - min) / range * 80 + 10);
        const bar = document.createElement('div');
        bar.className = 'chart-bar';
        bar.style.height = h + '%';
        bar.style.background = r.type === 'prediction' ? 'rgba(124,109,240,0.6)' : 'rgba(78,205,196,0.7)';
        bar.style.border = r.type === 'prediction' ? '1px dashed rgba(124,109,240,0.4)' : '1px solid rgba(78,205,196,0.2)';
        bar.innerHTML = `<div class="bar-tooltip">${r.date}<br/>$${r.price.toFixed(2)}</div>`;
        chart.appendChild(bar);
      });
    }

    function renderStockTable(records) {
      const tbody = document.getElementById('stockTableBody');
      if (!tbody) return;
      if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:rgba(255,255,255,0.1);padding:24px;font-size:13px">还没有记录</td></tr>';
        return;
      }
      const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
      tbody.innerHTML = '';
      sorted.forEach((r, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="color:rgba(255,255,255,0.4);font-size:12px">${r.date}</td>
          <td style="font-weight:600;color:rgba(255,255,255,0.7)">$${r.price.toFixed(2)}</td>
          <td><span class="stock-type-badge ${r.type}">${r.type === 'actual' ? '实际' : '预测'}</span></td>
          <td style="color:rgba(255,255,255,0.25);font-size:12px">${r.note || '—'}</td>
          <td><button class="del-btn" data-idx="${idx}">✕</button></td>
        `;
        tr.querySelector('.del-btn').addEventListener('click', () => {
          let recs = loadRecords();
          const realIdx = recs.findIndex(item => item.id === r.id);
          if (realIdx >= 0) {
            recs.splice(realIdx, 1);
            saveRecords(recs);
            renderStock(recs);
          }
        });
        tbody.appendChild(tr);
      });
    }

    function renderStock(records) {
      renderStockChart(records);
      renderStockTable(records);
    }

    // Init
    (function initStock() {
      const addBtn = document.getElementById('stockAddBtn');
      const clearBtn = document.getElementById('stockClearBtn');
      const fetchBtn = document.getElementById('stockFetchBtn');
      const nameInput = document.getElementById('stockNameInput');
      const dateInput = document.getElementById('stockDateInput');
      const priceInput = document.getElementById('stockPriceInput');
      const noteInput = document.getElementById('stockNoteInput');
      const apiKeyInput = document.getElementById('stockApiKey');
      const fetchStatus = document.getElementById('stockFetchStatus');

      // Restore saved API key
      const savedKey = localStorage.getItem('av_api_key');
      if (savedKey && apiKeyInput) apiKeyInput.value = savedKey;

      // Set today's date
      if (dateInput) {
        const t = new Date();
        dateInput.value = t.getFullYear() + '-' + String(t.getMonth()+1).padStart(2,'0') + '-' + String(t.getDate()).padStart(2,'0');
      }

      // Fetch from Alpha Vantage
      if (fetchBtn) {
        fetchBtn.addEventListener('click', async () => {
          const symbol = (nameInput?.value || '').trim().toUpperCase() || 'AAPL';
          const key = (apiKeyInput?.value || '').trim();
          if (!key) {
            if (fetchStatus) { fetchStatus.textContent = '请先输入 API Key'; fetchStatus.className = 'stock-fetch-status error'; }
            return;
          }
          // Save key
          localStorage.setItem('av_api_key', key);

          if (fetchStatus) { fetchStatus.textContent = '加载中...'; fetchStatus.className = 'stock-fetch-status loading'; }
          fetchBtn.disabled = true;

          try {
            const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${key}`;
            const res = await fetch(url);
            const data = await res.json();

            if (data['Error Message']) {
              if (fetchStatus) { fetchStatus.textContent = 'API Key 无效或股票代码错误'; fetchStatus.className = 'stock-fetch-status error'; }
              fetchBtn.disabled = false;
              return;
            }
            if (data['Note']) {
              if (fetchStatus) { fetchStatus.textContent = 'API 调用次数超限，请稍后再试'; fetchStatus.className = 'stock-fetch-status error'; }
              fetchBtn.disabled = false;
              return;
            }

            const series = data['Time Series (Daily)'];
            if (!series) {
              if (fetchStatus) { fetchStatus.textContent = '未获取到数据'; fetchStatus.className = 'stock-fetch-status error'; }
              fetchBtn.disabled = false;
              return;
            }

            // Parse latest 60 entries
            const dates = Object.keys(series).sort().slice(-60);
            const recs = loadRecords();

            // Keep only predictions (don't overwrite manual predictions)
            const predictions = recs.filter(r => r.type === 'prediction');

            // Clear old actual records for this symbol
            const others = recs.filter(r => r.type === 'prediction' || r.name.toUpperCase() !== symbol);

            const newRecs = dates.map((date, i) => ({
              id: Date.now() + i,
              name: symbol,
              date,
              price: parseFloat(series[date]['4. close']),
              note: i === dates.length - 1 ? '最新' : '',
              type: 'actual',
            }));

            const merged = [...others, ...predictions, ...newRecs];
            // Deduplicate by date+name
            const seen = new Set();
            const deduped = [];
            merged.forEach(r => {
              const key = r.date + '|' + r.name + '|' + r.type;
              if (!seen.has(key)) { seen.add(key); deduped.push(r); }
            });

            saveRecords(deduped);
            renderStock(deduped);
            if (fetchStatus) { fetchStatus.textContent = `✓ 已获取 ${dates.length} 条数据`; fetchStatus.className = 'stock-fetch-status success'; }
          } catch (e) {
            if (fetchStatus) { fetchStatus.textContent = '网络错误，请检查连接'; fetchStatus.className = 'stock-fetch-status error'; }
          }
          fetchBtn.disabled = false;
        });
      }

      let records = loadRecords();
      renderStock(records);

      if (addBtn) {
        addBtn.addEventListener('click', () => {
          const name = (nameInput?.value || '').trim().toUpperCase() || '未知';
          const date = dateInput?.value || '';
          const price = parseFloat(priceInput?.value);
          const note = noteInput?.value || '';
          const type = document.querySelector('input[name="recType"]:checked')?.value || 'actual';

          if (!date || isNaN(price)) { addBtn.style.opacity = '0.5'; setTimeout(() => addBtn.style.opacity = '', 300); return; }

          const recs = loadRecords();
          recs.push({ id: Date.now(), name, date, price, note, type });
          saveRecords(recs);
          renderStock(recs);
          if (priceInput) priceInput.value = '';
          if (noteInput) noteInput.value = '';
        });
      }

      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          if (confirm('清空所有股票追踪记录？')) {
            saveRecords([]);
            renderStock([]);
          }
        });
      }
    })();

    // ============================================================
    // QUANT STRATEGY ENGINE
    // ============================================================

    // --- Strategy Definitions ---
    const STRATEGIES = {
      ma_cross: {
        name: '双均线交叉',
        calcSignal: (prices, params) => {
          const short = params.shortPeriod || 5;
          const long = params.longPeriod || 20;
          if (prices.length < long + 1) return 'HOLD';
          const maShort = prices.slice(-short).reduce((a, b) => a + b, 0) / short;
          const maLong = prices.slice(-long).reduce((a, b) => a + b, 0) / long;
          const prevShort = prices.slice(-short - 1, -1).reduce((a, b) => a + b, 0) / short;
          const prevLong = prices.slice(-long - 1, -1).reduce((a, b) => a + b, 0) / long;
          if (prevShort <= prevLong && maShort > maLong) return 'BUY';
          if (prevShort >= prevLong && maShort < maLong) return 'SELL';
          return 'HOLD';
        },
      },
      rsi: {
        name: 'RSI超买超卖',
        calcSignal: (prices, params) => {
          const period = params.rsiPeriod || 14;
          if (prices.length < period + 1) return 'HOLD';
          const changes = [];
          for (let i = prices.length - period; i < prices.length; i++) changes.push(prices[i] - prices[i - 1]);
          const avgGain = changes.filter(c => c > 0).reduce((a, b) => a + b, 0) / period;
          const avgLoss = Math.abs(changes.filter(c => c < 0).reduce((a, b) => a + b, 0)) / period;
          const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
          const oversold = params.oversold || 30;
          const overbought = params.overbought || 70;
          if (rsi < oversold) return 'BUY';
          if (rsi > overbought) return 'SELL';
          return 'HOLD';
        },
      },
      bollinger: {
        name: '布林带策略',
        calcSignal: (prices, params) => {
          const period = params.bbPeriod || 20;
          const stdMult = params.bbStd || 2;
          if (prices.length < period + 1) return 'HOLD';
          const slice = prices.slice(-period);
          const mean = slice.reduce((a, b) => a + b, 0) / period;
          const std = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period);
          const lower = mean - stdMult * std;
          const upper = mean + stdMult * std;
          const price = prices[prices.length - 1];
          if (price <= lower) return 'BUY';
          if (price >= upper) return 'SELL';
          return 'HOLD';
        },
      },
      grid: {
        name: '网格交易',
        calcSignal: (prices, params, gridState) => {
          const levels = params.gridLevels || 5;
          const spacing = (params.gridSpacing || 2) / 100;
          const price = prices[prices.length - 1];
          if (!gridState.basePrice) gridState.basePrice = price;
          const gridSize = gridState.basePrice * spacing;
          const currentLevel = Math.round((gridState.basePrice - price) / gridSize);
          const clamped = Math.max(-levels, Math.min(levels, currentLevel));
          if (clamped > gridState.lastLevel) return 'BUY';
          if (clamped < gridState.lastLevel) return 'SELL';
          return 'HOLD';
        },
        initState: () => ({ basePrice: 0, lastLevel: 0 }),
      },
      threshold: {
        name: '自定义涨跌幅',
        calcSignal: (prices, params) => {
          if (prices.length < 2) return 'HOLD';
          const prev = prices[prices.length - 2];
          const curr = prices[prices.length - 1];
          const change = ((curr - prev) / prev) * 100;
          const buyThresh = params.buyThresh || 3;
          const sellThresh = params.sellThresh || 6;
          if (change <= -buyThresh) return 'BUY';
          if (change >= sellThresh) return 'SELL';
          return 'HOLD';
        },
      },
    };

    // --- Backtest Engine ---
    function runBacktest(prices, strategyId, params, initialCapital = 100000) {
      const strategy = STRATEGIES[strategyId];
      if (!strategy) return null;

      const gridState = strategy.initState ? strategy.initState() : {};
      let cash = initialCapital;
      let shares = 0;
      let trades = [];
      let equity = [initialCapital];
      let wins = 0, losses = 0;

      for (let i = 1; i < prices.length; i++) {
        const histPrices = prices.slice(0, i + 1);
        const signal = strategy.calcSignal(histPrices, params, gridState);
        const price = prices[i];

        if (signal === 'BUY' && cash > price) {
          const buyAmt = cash * 0.5;
          const qty = Math.floor(buyAmt / price);
          if (qty > 0) {
            cash -= qty * price;
            shares += qty;
            trades.push({ date: i, type: 'buy', price, qty });
          }
        } else if (signal === 'SELL' && shares > 0) {
          cash += shares * price;
          const pnl = (price - trades.filter(t => t.type === 'buy').pop()?.price || price) * shares;
          if (pnl >= 0) wins++; else losses++;
          trades.push({ date: i, type: 'sell', price, qty: shares });
          shares = 0;
        }

        const totalEquity = cash + shares * price;
        equity.push(totalEquity);
      }

      // Final value
      const finalVal = cash + shares * prices[prices.length - 1];
      const totalReturn = ((finalVal - initialCapital) / initialCapital) * 100;

      // Max drawdown
      let peak = equity[0], maxDD = 0;
      equity.forEach(e => { peak = Math.max(peak, e); maxDD = Math.max(maxDD, (peak - e) / peak); });

      // Win rate
      const totalTrades = wins + losses;
      const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

      // Sharpe ratio (simplified)
      const returns = [];
      for (let i = 1; i < equity.length; i++) returns.push((equity[i] - equity[i - 1]) / equity[i - 1]);
      const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
      const stdReturn = Math.sqrt(returns.reduce((a, b) => a + (b - avgReturn) ** 2, 0) / returns.length);
      const sharpe = stdReturn > 0 ? (avgReturn / stdReturn) * Math.sqrt(252) : 0;

      return {
        totalReturn,
        finalValue: finalVal,
        maxDrawdown: maxDD * 100,
        winRate,
        totalTrades: trades.length,
        sharpe,
        equity,
        trades,
      };
    }

    // --- Strategy Params UI ---
    function switchStrategy(strategyId) {
      document.querySelectorAll('.param-group').forEach(g => {
        g.style.display = g.dataset.strategy === strategyId ? '' : 'none';
      });
    }

    function getStrategyParams(strategyId) {
      const group = document.querySelector(`.param-group[data-strategy="${strategyId}"]`);
      if (!group) return {};
      const params = {};
      group.querySelectorAll('[data-param]').forEach(input => {
        params[input.dataset.param] = parseFloat(input.value) || input.value;
      });
      return params;
    }

    // --- Render Backtest ---
    function renderBacktest(result) {
      const container = document.getElementById('botBacktestResults');
      const grid = document.getElementById('botBacktestGrid');
      const chart = document.getElementById('botEquityChart');
      const statusEl = document.getElementById('botStatus');
      const runBtn = document.getElementById('botRunBtn');
      const autoBtn = document.getElementById('botAutoToggle');
      const statusText = document.getElementById('botRunStatus');

      if (!result) {
        container.style.display = 'none';
        return;
      }

      container.style.display = 'block';
      const fmt = (v) => (v >= 0 ? '+' : '') + v.toFixed(2);
      grid.innerHTML = `
        <div class="bot-backtest-card">
          <div class="bt-value ${result.totalReturn >= 0 ? 'positive' : 'negative'}">${fmt(result.totalReturn)}%</div>
          <div class="bt-label">总收益率</div>
        </div>
        <div class="bot-backtest-card">
          <div class="bt-value neutral">$${result.finalValue.toFixed(0)}</div>
          <div class="bt-label">最终资产</div>
        </div>
        <div class="bot-backtest-card">
          <div class="bt-value neutral">${result.sharpe.toFixed(2)}</div>
          <div class="bt-label">夏普比率</div>
        </div>
        <div class="bot-backtest-card">
          <div class="bt-value ${result.maxDrawdown > 20 ? 'negative' : 'neutral'}">${result.maxDrawdown.toFixed(1)}%</div>
          <div class="bt-label">最大回撤</div>
        </div>
        <div class="bot-backtest-card">
          <div class="bt-value ${result.winRate >= 50 ? 'positive' : 'negative'}">${result.winRate.toFixed(0)}%</div>
          <div class="bt-label">胜率</div>
        </div>
        <div class="bot-backtest-card">
          <div class="bt-value neutral">${result.totalTrades}</div>
          <div class="bt-label">交易次数</div>
        </div>
      `;

      // Equity curve
      const eq = result.equity;
      const minEq = Math.min(...eq), maxEq = Math.max(...eq), range = maxEq - minEq || 1;
      chart.innerHTML = '';
      eq.forEach((v, i) => {
        if (i % Math.max(1, Math.floor(eq.length / 80)) !== 0 && i !== eq.length - 1) return;
        const h = ((v - minEq) / range * 90 + 5);
        const bar = document.createElement('div');
        bar.className = 'eq-bar';
        bar.style.height = h + '%';
        bar.style.background = v >= eq[0] ? 'rgba(78,205,196,0.6)' : 'rgba(255,107,107,0.4)';
        chart.appendChild(bar);
      });

      // Enable live trading
      runBtn.disabled = false;
      autoBtn.disabled = false;
      if (statusText) statusText.textContent = '✅ 回测通过，可运行实盘';
    }

    // --- Live Trading ---
    let botConnected = false;
    let botAutoLoop = null;

    function getBackendUrl() {
      return (document.getElementById('botBackendUrl')?.value || 'http://localhost:3001').replace(/\/+$/, '');
    }

    async function apiPost(path, body) {
      const res = await fetch(getBackendUrl() + path, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    }
    async function apiGet(path) {
      const res = await fetch(getBackendUrl() + path);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    }

    async function connectBackend() {
      const statusEl = document.getElementById('botConnStatus');
      const btn = document.getElementById('botConnectBtn');
      statusEl.textContent = '连接中...'; statusEl.style.color = 'rgba(255,255,255,0.3)';
      if (btn) btn.disabled = true;
      try {
        const result = await apiPost('/api/connect');
        if (result.connected) {
          botConnected = true;
          statusEl.textContent = '✅ 已连接'; statusEl.style.color = '#4ecdc4';
          if (btn) btn.textContent = '🔌 已连接';
        } else {
          botConnected = false;
          statusEl.textContent = '❌ ' + (result.message || '失败'); statusEl.style.color = '#ff6b6b';
        }
      } catch {
        botConnected = false;
        statusEl.textContent = '❌ 无法连接后端'; statusEl.style.color = '#ff6b6b';
      }
      if (btn) btn.disabled = false;
    }

    async function runLiveTrade() {
      const statusEl = document.getElementById('botStatus');
      if (!botConnected) {
        statusEl.textContent = '请先连接后端服务'; statusEl.className = 'bot-status error'; return;
      }
      const strategyId = document.getElementById('botStrategy').value;
      const symbol = document.getElementById('botSymbol').value.trim().toUpperCase() || 'AAPL';
      const params = getStrategyParams(strategyId);

      statusEl.textContent = `📡 执行 ${STRATEGIES[strategyId]?.name || strategyId} 策略...`;
      statusEl.className = 'bot-status info';

      try {
        await apiPost('/api/bot/config', { symbol, strategy: strategyId, ...params });
        const result = await apiPost('/api/bot/execute');
        if (result.action === 'buy') {
          statusEl.textContent = `🔴 买入信号 — ${result.symbol} @ $${result.price?.toFixed(2) || '?'}`;
          statusEl.className = 'bot-status success';
        } else if (result.action === 'sell') {
          statusEl.textContent = `🟢 卖出信号 — ${result.symbol}`;
          statusEl.className = 'bot-status success';
        } else {
          statusEl.textContent = `⏸ ${result.reason || '无信号'}`;
          statusEl.className = 'bot-status info';
        }
      } catch (err) {
        statusEl.textContent = '❌ ' + err.message;
        statusEl.className = 'bot-status error';
      }
    }

    function toggleAutoLoop() {
      const btn = document.getElementById('botAutoToggle');
      if (botAutoLoop) {
        clearInterval(botAutoLoop); botAutoLoop = null;
        if (btn) btn.textContent = '▶ 启动循环';
        document.getElementById('botStatus').textContent = '⏹ 循环停止';
        return;
      }
      botAutoLoop = setInterval(async () => { if (botConnected) await runLiveTrade(); }, 60000);
      if (btn) btn.textContent = '⏹ 停止循环';
      runLiveTrade();
    }

    function resetBotState() {
      if (!confirm('重置交易状态？')) return;
      if (botAutoLoop) { clearInterval(botAutoLoop); botAutoLoop = null; }
      document.getElementById('botAutoToggle').textContent = '▶ 启动循环';
      document.getElementById('botStatus').textContent = '已重置';
      document.getElementById('botStatus').className = 'bot-status';
      document.getElementById('botTrades').innerHTML = '<div class="bot-empty">暂无交易记录</div>';
      document.getElementById('botRunBtn').disabled = true;
      document.getElementById('botAutoToggle').disabled = true;
      document.getElementById('botRunStatus').textContent = '已重置';
    }

    // --- Init ---
    (function initBot() {
      // Strategy switcher
      const strategySelect = document.getElementById('botStrategy');
      strategySelect?.addEventListener('change', () => switchStrategy(strategySelect.value));

      // Backtest
      document.getElementById('botBacktestBtn')?.addEventListener('click', async () => {
        const statusEl = document.getElementById('botStatus');
        const symbol = document.getElementById('botSymbol').value.trim().toUpperCase() || 'AAPL';
        const strategyId = strategySelect.value;
        const params = getStrategyParams(strategyId);
        const capital = parseFloat(document.getElementById('botCapital')?.value) || 100000;

        // Get API key from stock tracker
        const apiKey = document.getElementById('stockApiKey')?.value;
        if (!apiKey) { statusEl.textContent = '请先在个股追踪输入 Alpha Vantage API Key'; statusEl.className = 'bot-status error'; return; }

        statusEl.textContent = `📡 获取 ${symbol} 历史数据...`; statusEl.className = 'bot-status info';

        try {
          const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=full&apikey=${apiKey}`;
          const res = await fetch(url);
          const data = await res.json();

          if (data['Error Message']) { statusEl.textContent = 'API Key 无效'; statusEl.className = 'bot-status error'; return; }
          const series = data['Time Series (Daily)'];
          if (!series) { statusEl.textContent = '未获取到数据'; statusEl.className = 'bot-status error'; return; }

          const dates = Object.keys(series).sort();
          const prices = dates.map(d => parseFloat(series[d]['4. close']));

          if (prices.length < 30) { statusEl.textContent = '数据不足（需至少30条）'; statusEl.className = 'bot-status error'; return; }

          const result = runBacktest(prices, strategyId, params, capital);
          renderBacktest(result);
          statusEl.textContent = `✅ 回测完成 — ${STRATEGIES[strategyId]?.name} on ${symbol}`;
          statusEl.className = 'bot-status success';
        } catch (err) {
          statusEl.textContent = '❌ ' + err.message; statusEl.className = 'bot-status error';
        }
      });

      // Other buttons
      document.getElementById('botConnectBtn')?.addEventListener('click', connectBackend);
      document.getElementById('botRunBtn')?.addEventListener('click', runLiveTrade);
      document.getElementById('botAutoToggle')?.addEventListener('click', toggleAutoLoop);
      document.getElementById('botResetBtn')?.addEventListener('click', resetBotState);

      // Init UI
      switchStrategy(strategySelect?.value || 'ma_cross');
    })();

    // ============================================================
    // FINANCE / BILLS
    // ============================================================
    const FINANCE_KEY = 'km_finance';
    const CAT_ICONS = { rent: '🏠', food: '🍜', transport: '🚇', shopping: '🛒', hobby: '🎮', bill: '⚡', other: '📌' };
    const CAT_NAMES = { rent: '租房', food: '餐饮', transport: '交通', shopping: '购物', hobby: '兴趣爱好', bill: '水电', other: '其他' };

    function loadFinance() { try { return JSON.parse(localStorage.getItem(FINANCE_KEY)) || []; } catch { return []; } }
    function saveFinance(data) { localStorage.setItem(FINANCE_KEY, JSON.stringify(data)); }

    function renderFinance() {
      const list = document.getElementById('financeList');
      const monthTotal = document.getElementById('financeMonthTotal');
      const countEl = document.getElementById('financeCount');
      if (!list) return;
      const records = loadFinance();
      const now = new Date();
      const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
      const monthRecs = records.filter(r => r.date.startsWith(thisMonth));
      const total = monthRecs.reduce((s, r) => s + r.amount, 0);
      if (monthTotal) monthTotal.textContent = `¥${total.toFixed(0)}`;
      if (countEl) countEl.textContent = monthRecs.length;

      const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));
      list.innerHTML = '';
      if (sorted.length === 0) {
        list.innerHTML = '<div class="finance-empty">还没有记录，点击右上角 + 记录 开始记账</div>';
        return;
      }
      sorted.forEach(r => {
        const item = document.createElement('div');
        item.className = 'finance-item';
        item.innerHTML = `
          <div class="finance-icon ${r.cat}">${CAT_ICONS[r.cat] || '📌'}</div>
          <div class="finance-item-info">
            <div class="finance-item-cat">${CAT_NAMES[r.cat] || r.cat}</div>
            <div class="finance-item-note">${r.note || '—'}</div>
          </div>
          <div class="finance-item-date">${r.date.slice(5)}</div>
          <div class="finance-item-amount">-¥${r.amount.toFixed(0)}</div>
        `;
        list.appendChild(item);
      });
    }

    // Modal
    const finModal = document.getElementById('financeModal');
    document.getElementById('financeAddBtn')?.addEventListener('click', () => {
      if (finModal) {
        finModal.classList.add('open');
        const d = new Date();
        document.getElementById('finDate').value = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
        document.getElementById('finAmount').value = '';
        document.getElementById('finNote').value = '';
        document.getElementById('finCat').value = 'rent';
        setTimeout(() => document.getElementById('finAmount').focus(), 100);
      }
    });
    document.getElementById('finCancel')?.addEventListener('click', () => finModal?.classList.remove('open'));
    document.getElementById('finSave')?.addEventListener('click', () => {
      const cat = document.getElementById('finCat')?.value || 'other';
      const amount = parseFloat(document.getElementById('finAmount')?.value);
      const note = document.getElementById('finNote')?.value?.trim() || '';
      const date = document.getElementById('finDate')?.value;
      if (!amount || amount <= 0 || !date) return;
      const records = loadFinance();
      records.push({ id: Date.now(), cat, amount, note, date });
      saveFinance(records);
    renderFinance();

    // ============================================================
    // HOUSING REFERENCE
    // ============================================================
    const HOUSING_KEY = 'km_housing_refs';

    function loadHousing() { try { return JSON.parse(localStorage.getItem(HOUSING_KEY)) || []; } catch { return []; } }
    function saveHousing(data) { localStorage.setItem(HOUSING_KEY, JSON.stringify(data)); }

    // Seed default entries on first visit
    !localStorage.getItem(HOUSING_KEY) && saveHousing([
      { id: Date.now() + 1, name: 'SSB 共享卫浴 (Shared Bathroom)', desc: 'Village Apartments / Rye Hall · 全年 €5556 · 申请时直接选 SSB', tags: ['校内', '共享卫浴'] },
    ]);

    function renderHousing() {
      const list = document.getElementById('housingRefList');
      if (!list) return;
      const data = loadHousing();
      if (data.length === 0) {
        list.innerHTML = '<div class="housing-empty">暂无记录</div>';
        return;
      }
      list.innerHTML = data.map(item => `
        <div class="housing-item">
          <div class="housing-item-top">
            <span class="housing-name">${item.name}</span>
            <button class="housing-del" data-id="${item.id}">✕</button>
          </div>
          <div class="housing-desc">${item.desc}</div>
          <div class="housing-tags">${(item.tags || []).map(t => `<span class="housing-tag">${t}</span>`).join('')}</div>
        </div>
      `).join('');

      list.querySelectorAll('.housing-del').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = Number(btn.dataset.id);
          let data = loadHousing();
          data = data.filter(d => d.id !== id);
          saveHousing(data);
          renderHousing();
        });
      });
    }

    renderHousing();
  
      finModal?.classList.remove('open');
    });
    // Close on backdrop click
    finModal?.addEventListener('click', e => { if (e.target === finModal) finModal.classList.remove('open'); });

    renderFinance();
  