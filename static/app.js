// Player Engagement & Retention Analytics - Upgraded Frontend Logic
document.addEventListener("DOMContentLoaded", () => {
    // Current state variables
    let currentPage = 1;
    const itemsPerPage = 10;
    let currentTab = "overview";
    let summaryData = null;
    let widgetsData = null;
    
    // ApexCharts instances
    let segmentsChart = null;
    let probabilityChart = null;
    let simulatorGauge = null;
    let levelsScatterChart = null;
    let playerTimelineChart = null;
    let featureImportanceChart = null;
    let playerRadarChart = null;

    // DOM Elements
    const tabLinks = document.querySelectorAll(".nav-item");
    const tabContents = document.querySelectorAll(".tab-content");
    const pageTitle = document.getElementById("page-title");
    const currentTimeEl = document.getElementById("current-time");
    const btnRefresh = document.getElementById("refresh-data");
    const btnExport = document.getElementById("btn-export-report");
    const btnToggleMenu = document.getElementById("btn-toggle-menu");
    const sidebarDrawer = document.getElementById("sidebar-drawer");
    
    // Player Database Tab Elements
    const txtSearch = document.getElementById("player-search");
    const selCategory = document.getElementById("category-filter");
    const tableBody = document.getElementById("player-table-body");
    const paginationInfo = document.getElementById("pagination-info");
    const btnPrev = document.getElementById("btn-prev");
    const btnNext = document.getElementById("btn-next");
    const pageNumDisplay = document.getElementById("page-num-display");
    const btnResetFilters = document.getElementById("btn-reset-filters");
    
    // Simulator inputs
    const simInputs = {
        LevelsPlayed: document.getElementById("sim-LevelsPlayed"),
        TotalPlayTime: document.getElementById("sim-TotalPlayTime"),
        AverageLevelDuration: document.getElementById("sim-AverageLevelDuration"),
        HelpUsed: document.getElementById("sim-HelpUsed"),
        RestartCount: document.getElementById("sim-RestartCount"),
        AvgLevelPassRate: document.getElementById("sim-AvgLevelPassRate"),
        AvgRetryRate: document.getElementById("sim-AvgRetryRate"),
        AvgMetaDuration: document.getElementById("sim-AvgMetaDuration"),
        AvgWinningDuration: document.getElementById("sim-AvgWinningDuration"),
        SuccessRate: document.getElementById("sim-SuccessRate")
    };
    const btnRunSim = document.getElementById("btn-run-simulation");

    // Modal Elements
    const playerModal = document.getElementById("player-modal");
    const btnCloseModal = document.getElementById("btn-close-modal");

    // Initialize Page Clock
    updateClock();
    setInterval(updateClock, 1000);

    function updateClock() {
        const now = new Date();
        currentTimeEl.textContent = now.toTimeString().split(" ")[0];
    }

    // API Health Check Pulse Badge on load
    checkAPIHealth();

    async function checkAPIHealth() {
        const badge = document.getElementById("system-health");
        try {
            const res = await fetch("/api/health");
            if (res.ok) {
                const data = await res.json();
                if (data.status === "Healthy") {
                    badge.className = "system-health-badge";
                    badge.innerHTML = `<span class="pulse-dot"></span> System Healthy`;
                } else {
                    setSystemOffline(badge);
                }
            } else {
                setSystemOffline(badge);
            }
        } catch (e) {
            setSystemOffline(badge);
        }
    }

    function setSystemOffline(badgeElement) {
        badgeElement.className = "system-health-badge unhealthy";
        badgeElement.innerHTML = `<span class="pulse-dot"></span> System Offline`;
    }

    // Toggle Mobile Sidebar Drawer
    if (btnToggleMenu && sidebarDrawer) {
        btnToggleMenu.addEventListener("click", () => {
            sidebarDrawer.classList.toggle("active");
        });
    }

    // Tab Navigation
    tabLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const tabId = link.getAttribute("data-tab");
            
            // Close mobile sidebar drawer if open
            if (sidebarDrawer) {
                sidebarDrawer.classList.remove("active");
            }
            
            switchTab(tabId);
        });
    });

    function switchTab(tabId) {
        currentTab = tabId;
        
        tabLinks.forEach(l => l.classList.remove("active"));
        const activeLink = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
        if (activeLink) activeLink.classList.add("active");
        
        tabContents.forEach(c => c.classList.remove("active"));
        document.getElementById(`tab-${tabId}`).classList.add("active");
        
        const titleMap = {
            overview: "Dashboard Overview",
            players: "Player Database",
            simulator: "Retention Simulator",
            levels: "Level Insights",
            importance: "Feature Importance",
            comparison: "Model Comparison",
            about: "About Project"
        };
        pageTitle.textContent = titleMap[tabId] || "Analytics";
        
        if (tabId === "overview") {
            loadOverviewData();
        } else if (tabId === "players") {
            loadPlayersTable();
        } else if (tabId === "simulator") {
            initSimulatorCharts();
        } else if (tabId === "levels") {
            loadLevelsData();
        } else if (tabId === "importance") {
            loadFeatureImportance();
        } else if (tabId === "comparison") {
            loadModelComparison();
        }
    }

    // Refresh Handler
    btnRefresh.addEventListener("click", () => {
        btnRefresh.disabled = true;
        const icon = btnRefresh.querySelector("i");
        icon.classList.add("fa-spin");
        
        setTimeout(async () => {
            await checkAPIHealth();
            if (currentTab === "overview") {
                await loadOverviewData(true);
            } else if (currentTab === "players") {
                await loadPlayersTable();
            } else if (currentTab === "levels") {
                await loadLevelsData();
            } else if (currentTab === "importance") {
                await loadFeatureImportance(true);
            } else if (currentTab === "comparison") {
                await loadModelComparison();
            }
            btnRefresh.disabled = false;
            icon.classList.remove("fa-spin");
        }, 800);
    });

    // -------------------------------------------------------------
    // EXPORT CSV TOAST ALERTS
    // -------------------------------------------------------------
    if (btnExport) {
        btnExport.addEventListener("click", (e) => {
            e.preventDefault();
            
            showToast("Preparing Analytics Report...", "info");
            
            setTimeout(() => {
                showToast("Download Started ✓", "success");
                // Launch actual stream download
                window.location.href = "/api/export";
            }, 1200);
        });
    }

    function showToast(message, type = "success") {
        const container = document.getElementById("toast-container");
        if (!container) return;
        
        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        
        const iconClass = {
            success: "fa-circle-check text-success",
            info: "fa-circle-info text-blue",
            warning: "fa-triangle-exclamation text-warning",
            error: "fa-circle-exclamation text-danger"
        }[type] || "fa-bell";

        toast.innerHTML = `
            <i class="fa-solid ${iconClass}"></i>
            <span>${message}</span>
            <button class="toast-close"><i class="fa-solid fa-xmark"></i></button>
        `;
        
        container.appendChild(toast);
        
        // Auto-dismiss after 4 seconds
        const dismissTimer = setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => toast.remove(), 350);
        }, 4000);
        
        // Manual close trigger
        toast.querySelector(".toast-close").addEventListener("click", () => {
            clearTimeout(dismissTimer);
            toast.remove();
        });
    }

    // -------------------------------------------------------------
    // SKELETON LOADERS & COUNT UP ANIMATIONS
    // -------------------------------------------------------------
    function toggleKpiSkeletons(show) {
        const cardIds = [
            "kpi-total-players", "kpi-avg-engagement", "kpi-avg-churn", 
            "kpi-avg-playtime", "kpi-avg-levels", "kpi-high-risk", "kpi-highly-engaged"
        ];
        
        cardIds.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            if (show) {
                el.classList.add("skeleton", "skeleton-text");
                el.setAttribute("data-old-val", el.textContent);
                el.textContent = "";
            } else {
                el.classList.remove("skeleton", "skeleton-text");
            }
        });
    }

    function toggleChartSkeletons(show) {
        const containers = ["container-segments", "container-probability", "container-level-scatter", "container-feature-importance"];
        containers.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            if (show) {
                el.classList.add("skeleton");
            } else {
                el.classList.remove("skeleton");
            }
        });
    }

    function animateCountUp(elementId, targetValue, durationMs = 1000) {
        const el = document.getElementById(elementId);
        if (!el) return;
        
        const isPercentage = typeof targetValue === 'string' && targetValue.endsWith('%');
        const cleanTarget = isPercentage ? parseFloat(targetValue.replace('%', '')) : parseFloat(targetValue);
        
        if (isNaN(cleanTarget)) {
            el.textContent = targetValue;
            return;
        }

        const isDecimal = !Number.isInteger(cleanTarget);
        const start = 0;
        const startTime = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / durationMs, 1);
            
            // Ease out quad
            const easeProgress = progress * (2 - progress);
            const current = start + easeProgress * (cleanTarget - start);
            
            if (isPercentage) {
                el.textContent = current.toFixed(isDecimal ? 1 : 0) + "%";
            } else {
                if (isDecimal) {
                    el.textContent = current.toFixed(1);
                } else {
                    el.textContent = Math.round(current).toLocaleString();
                }
            }
            
            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }
        
        requestAnimationFrame(update);
    }

    // -------------------------------------------------------------
    // OVERVIEW TAB LOGIC
    // -------------------------------------------------------------
    async function loadOverviewData(force = false) {
        if (summaryData && widgetsData && !force) {
            renderSummaryCards();
            renderSummaryRecommendations();
            return;
        }

        toggleKpiSkeletons(true);
        toggleChartSkeletons(true);

        try {
            const [summaryRes, widgetsRes, distRes] = await Promise.all([
                fetch("/api/summary"),
                fetch("/api/analytics-widgets"),
                fetch("/api/churn-distribution")
            ]);

            if (!summaryRes.ok || !widgetsRes.ok || !distRes.ok) {
                throw new Error();
            }

            summaryData = await summaryRes.json();
            widgetsData = await widgetsRes.json();
            const distData = await distRes.json();

            toggleKpiSkeletons(false);
            toggleChartSkeletons(false);

            renderSummaryCards(true); // Enable count-up animation
            renderSummaryCharts(distData);
            renderWidgetsTables();
            renderSummaryRecommendations();
        } catch (error) {
            toggleKpiSkeletons(false);
            toggleChartSkeletons(false);
            showToast("Unable to retrieve analytics. Please verify the backend service is running.", "error");
        }
    }

    function renderSummaryCards(animate = false) {
        if (!summaryData) return;
        
        if (animate) {
            animateCountUp("kpi-total-players", summaryData.total_players);
            animateCountUp("kpi-avg-engagement", summaryData.avg_engagement_score);
            animateCountUp("kpi-avg-churn", (summaryData.avg_churn_probability * 100).toFixed(1) + "%");
            animateCountUp("kpi-avg-playtime", summaryData.avg_playtime_minutes.toFixed(1) + "m");
            animateCountUp("kpi-avg-levels", summaryData.avg_levels_played);
            animateCountUp("kpi-high-risk", summaryData.high_risk_players);
            animateCountUp("kpi-highly-engaged", summaryData.highly_engaged_players);
        } else {
            document.getElementById("kpi-total-players").textContent = summaryData.total_players.toLocaleString();
            document.getElementById("kpi-avg-engagement").textContent = summaryData.avg_engagement_score.toFixed(1);
            document.getElementById("kpi-avg-churn").textContent = (summaryData.avg_churn_probability * 100).toFixed(1) + "%";
            document.getElementById("kpi-avg-playtime").textContent = summaryData.avg_playtime_minutes.toFixed(1) + "m";
            document.getElementById("kpi-avg-levels").textContent = summaryData.avg_levels_played.toFixed(1);
            document.getElementById("kpi-high-risk").textContent = summaryData.high_risk_players.toLocaleString();
            document.getElementById("kpi-highly-engaged").textContent = summaryData.highly_engaged_players.toLocaleString();
        }
    }

    function renderSummaryCharts(distData) {
        if (!summaryData || !distData) return;
        
        // 1. Segments Donut
        const segmentData = summaryData.engagement_categories;
        const segmentKeys = Object.keys(segmentData);
        const segmentValues = Object.values(segmentData);
        
        const colors = segmentKeys.map(k => {
            return {
                "Highly Engaged": "#10b981", 
                "Moderately Engaged": "#06b6d4", 
                "Low Engagement": "#f59e0b", 
                "High Churn Risk": "#f43f5e"
            }[k] || "#6366f1";
        });

        const segmentsOpt = {
            chart: {
                type: 'donut',
                height: 320,
                background: 'transparent',
                foreColor: '#9ca3af',
                fontFamily: 'Outfit, sans-serif',
                animations: { enabled: true, speed: 600 }
            },
            stroke: { show: true, width: 2, colors: ['#111322'] },
            colors: colors,
            series: segmentValues,
            labels: segmentKeys,
            legend: {
                position: 'bottom',
                horizontalAlign: 'center',
                labels: { colors: '#f3f4f6' }
            },
            plotOptions: {
                pie: {
                    donut: {
                        size: '72%',
                        labels: {
                            show: true,
                            name: { show: true, fontSize: '13px', color: '#9ca3af' },
                            value: {
                                show: true,
                                fontSize: '18px',
                                fontWeight: '700',
                                color: '#f3f4f6',
                                formatter: (val) => parseInt(val).toLocaleString()
                            },
                            total: {
                                show: true,
                                label: 'Total Players',
                                color: '#9ca3af',
                                formatter: () => summaryData.total_players.toLocaleString()
                            }
                        }
                    }
                }
            },
            dataLabels: { enabled: false },
            tooltip: { theme: 'dark' }
        };

        if (segmentsChart) segmentsChart.destroy();
        segmentsChart = new ApexCharts(document.querySelector("#chart-segments"), segmentsOpt);
        segmentsChart.render();

        // 2. Churn Distribution splines
        const probOpt = {
            chart: {
                type: 'area',
                height: 320,
                background: 'transparent',
                foreColor: '#9ca3af',
                fontFamily: 'Outfit, sans-serif',
                toolbar: { show: false },
                animations: { enabled: true, speed: 600 }
            },
            colors: ['#6366f1'],
            stroke: { curve: 'smooth', width: 3 },
            fill: {
                type: 'gradient',
                gradient: {
                    shadeIntensity: 1,
                    opacityFrom: 0.45,
                    opacityTo: 0.05,
                    stops: [0, 90, 100]
                }
            },
            dataLabels: { enabled: false },
            series: [{
                name: 'Players Count',
                data: distData.counts
            }],
            xaxis: {
                categories: distData.labels,
                axisBorder: { show: false },
                axisTicks: { show: false }
            },
            yaxis: {
                labels: { formatter: (val) => val.toLocaleString() }
            },
            grid: {
                borderColor: 'rgba(255, 255, 255, 0.05)',
                strokeDashArray: 4
            },
            tooltip: { theme: 'dark' }
        };

        if (probabilityChart) probabilityChart.destroy();
        probabilityChart = new ApexCharts(document.querySelector("#chart-probability"), probOpt);
        probabilityChart.render();
    }

    function renderWidgetsTables() {
        if (!widgetsData) return;

        const riskBody = document.getElementById("widget-risk-players-body");
        const loyalBody = document.getElementById("widget-loyal-players-body");
        const hardLevelsBody = document.getElementById("widget-hard-levels-body");
        const restartLevelsBody = document.getElementById("widget-restart-levels-body");

        const catClasses = {
            "Highly Engaged": "badge-cat-highly",
            "Moderately Engaged": "badge-cat-moderately",
            "Low Engagement": "badge-cat-low",
            "High Churn Risk": "badge-cat-churn"
        };

        riskBody.innerHTML = "";
        widgetsData.top_high_risk_players.forEach(p => {
            const tr = document.createElement("tr");
            tr.style.cursor = "pointer";
            tr.innerHTML = `
                <td><strong>#${p.user_id}</strong></td>
                <td class="value-danger"><strong>${(p.ChurnProbability * 100).toFixed(1)}%</strong></td>
                <td>${p.EngagementScore.toFixed(1)}</td>
                <td><span class="badge-cat ${catClasses[p.EngagementCategory]}">${p.EngagementCategory}</span></td>
            `;
            tr.addEventListener("click", () => openPlayerProfile(p.user_id));
            riskBody.appendChild(tr);
        });

        loyalBody.innerHTML = "";
        widgetsData.top_loyal_players.forEach(p => {
            const tr = document.createElement("tr");
            tr.style.cursor = "pointer";
            tr.innerHTML = `
                <td><strong>#${p.user_id}</strong></td>
                <td style="color: var(--color-success);"><strong>${(p.ChurnProbability * 100).toFixed(1)}%</strong></td>
                <td>${p.EngagementScore.toFixed(1)}</td>
                <td><span class="badge-cat ${catClasses[p.EngagementCategory]}">${p.EngagementCategory}</span></td>
            `;
            tr.addEventListener("click", () => openPlayerProfile(p.user_id));
            loyalBody.appendChild(tr);
        });

        hardLevelsBody.innerHTML = "";
        widgetsData.hardest_levels.forEach(l => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>Lvl ${l.level_id}</strong></td>
                <td class="value-danger"><strong>${(l.f_avg_passrate * 100).toFixed(1)}%</strong></td>
                <td>${l.f_avg_retrytimes.toFixed(2)}</td>
                <td>${Math.round(l.f_avg_duration)}s</td>
            `;
            hardLevelsBody.appendChild(tr);
        });

        restartLevelsBody.innerHTML = "";
        widgetsData.highest_restart_levels.forEach(l => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>Lvl ${l.level_id}</strong></td>
                <td class="value-danger"><strong>${l.f_avg_retrytimes.toFixed(2)}</strong></td>
                <td>${(l.f_avg_passrate * 100).toFixed(1)}%</td>
                <td>${Math.round(l.f_avg_duration)}s</td>
            `;
            restartLevelsBody.appendChild(tr);
        });
    }

    function renderSummaryRecommendations() {
        if (!summaryData) return;
        const recList = document.getElementById("summary-recommendations");
        recList.innerHTML = "";
        
        const recDetails = {
            "Offer discounts or special rewards": {
                desc: "Target high-churn players with discount packages, visual customizations, or token packs to keep them in-game.",
                badge: "orange", category: "High Churn Risk"
            },
            "Reward loyal players": {
                desc: "Introduce completion awards, streak bonuses, or visual badges to acknowledge highly engaged users.",
                badge: "emerald", category: "Highly Engaged"
            },
            "Offer new content": {
                desc: "Provide custom levels, puzzle challenges, or early access features to moderately engaged players.",
                badge: "blue", category: "Moderately Engaged"
            },
            "Send engagement notifications": {
                desc: "Trigger push notifications showing daily quests or friend updates to players with declining engagement.",
                badge: "purple", category: "Low Engagement"
            }
        };
        
        const sortedRecs = Object.entries(summaryData.recommendations).sort((a, b) => b[1] - a[1]);
        
        sortedRecs.forEach(([recName, count]) => {
            const detail = recDetails[recName] || { desc: "Custom campaign.", badge: "blue", category: "General" };
            const card = document.createElement("div");
            card.className = "rec-card";
            card.innerHTML = `
                <div class="rec-card-header">
                    <span class="rec-badge rec-badge-${detail.badge}">${detail.category}</span>
                    <span class="rec-count">${count.toLocaleString()} players</span>
                </div>
                <h4 class="rec-action-text">${recName}</h4>
                <p class="rec-action-desc">${detail.desc}</p>
            `;
            recList.appendChild(card);
        });
    }

    // -------------------------------------------------------------
    // PLAYERS TAB LOGIC
    // -------------------------------------------------------------
    let tableSkeletonsActive = false;

    function showTableSkeletons() {
        tableBody.innerHTML = "";
        tableSkeletonsActive = true;
        for (let i = 0; i < 5; i++) {
            const tr = document.createElement("tr");
            tr.innerHTML = `<td colspan="8"><div class="skeleton-text skeleton" style="margin: 0.5rem 0;"></div></td>`;
            tableBody.appendChild(tr);
        }
    }

    async function loadPlayersTable() {
        showTableSkeletons();
        
        const searchQuery = txtSearch.value.trim();
        const categoryQuery = selCategory.value;
        
        let url = `/api/players?page=${currentPage}&limit=${itemsPerPage}`;
        if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
        if (categoryQuery) url += `&category=${encodeURIComponent(categoryQuery)}`;
        
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error();
            const data = await res.json();
            tableSkeletonsActive = false;
            renderPlayersTable(data);
        } catch (error) {
            tableSkeletonsActive = false;
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 2rem; color: var(--color-danger);">
                        <i class="fa-solid fa-circle-exclamation" style="font-size: 1.5rem; margin-bottom: 0.5rem;"></i>
                        <br>Unable to retrieve analytics. Please verify the backend service is running.
                    </td>
                </tr>
            `;
        }
    }

    function renderPlayersTable(data) {
        tableBody.innerHTML = "";
        const players = data.players;
        const total = data.total;
        
        if (players.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                        <i class="fa-solid fa-folder-open" style="font-size: 1.5rem; margin-bottom: 0.5rem;"></i>
                        <br>No matching players found.
                    </td>
                </tr>
            `;
            paginationInfo.textContent = "Showing 0 players";
            btnPrev.disabled = true;
            btnNext.disabled = true;
            return;
        }

        const catClasses = {
            "Highly Engaged": "badge-cat-highly",
            "Moderately Engaged": "badge-cat-moderately",
            "Low Engagement": "badge-cat-low",
            "High Churn Risk": "badge-cat-churn"
        };

        const scoreFillClasses = {
            "Highly Engaged": "fill-success",
            "Moderately Engaged": "fill-blue",
            "Low Engagement": "fill-warning",
            "High Churn Risk": "fill-danger"
        };

        players.forEach(p => {
            const tr = document.createElement("tr");
            const catClass = catClasses[p.EngagementCategory] || "badge-cat-low";
            const fillClass = scoreFillClasses[p.EngagementCategory] || "fill-warning";
            
            tr.innerHTML = `
                <td><strong>#${p.user_id}</strong></td>
                <td>
                    <div class="score-progress-container">
                        <div class="score-progress-bar">
                            <div class="score-progress-fill ${fillClass}" style="width: ${p.EngagementScore}%"></div>
                        </div>
                        <span style="font-size: 0.8rem; font-weight:600;">${p.EngagementScore.toFixed(1)}</span>
                    </div>
                </td>
                <td><span class="badge-cat ${catClass}">${p.EngagementCategory}</span></td>
                <td><span class="prob-display">${(p.ChurnProbability * 100).toFixed(1)}%</span></td>
                <td>${p.LevelsPlayed}</td>
                <td>${(p.SuccessRate * 100).toFixed(1)}%</td>
                <td class="rec-col-text">${p.Recommendation}</td>
                <td>
                    <button class="btn btn-secondary btn-view-profile" data-id="${p.user_id}">
                        <i class="fa-solid fa-eye"></i> Details
                    </button>
                </td>
            `;
            
            tableBody.appendChild(tr);
        });

        document.querySelectorAll(".btn-view-profile").forEach(btn => {
            btn.addEventListener("click", () => {
                const userId = btn.getAttribute("data-id");
                openPlayerProfile(parseInt(userId));
            });
        });

        const startRecord = (data.page - 1) * itemsPerPage + 1;
        const endRecord = Math.min(data.page * itemsPerPage, total);
        paginationInfo.textContent = `Showing ${startRecord} - ${endRecord} of ${total.toLocaleString()} players`;
        
        pageNumDisplay.textContent = `Page ${data.page}`;
        btnPrev.disabled = data.page <= 1;
        btnNext.disabled = endRecord >= total;
    }

    // -------------------------------------------------------------
    // RETENTION SIMULATOR TAB LOGIC
    // -------------------------------------------------------------
    let simulatorInitialized = false;

    function initSimulatorCharts() {
        if (simulatorInitialized) return;
        
        const rangeIds = [
            "LevelsPlayed", "SuccessRate", "TotalPlayTime", "HelpUsed", 
            "RestartCount", "AverageLevelDuration", "AvgLevelPassRate", 
            "AvgRetryRate", "AvgMetaDuration", "AvgWinningDuration"
        ];
        
        rangeIds.forEach(id => {
            const input = document.getElementById(`sim-${id}`);
            input.addEventListener("input", () => {
                updateRangeValueText(id, input.value);
            });
        });

        const gaugeOpt = {
            chart: {
                type: "radialBar",
                height: 250,
                background: "transparent",
                fontFamily: "Outfit, sans-serif",
                animations: { enabled: true, speed: 600 }
            },
            series: [0],
            colors: ["#6366f1"],
            plotOptions: {
                radialBar: {
                    startAngle: -110,
                    endAngle: 110,
                    hollow: { size: "70%" },
                    dataLabels: {
                        name: { show: true, color: "#9ca3af", fontSize: "13px", offsetY: 20 },
                        value: {
                            show: true, color: "#f3f4f6", fontSize: "32px", fontWeight: "700", offsetY: -15,
                            formatter: (val) => val + "%"
                        }
                    }
                }
            },
            labels: ["Churn Risk"],
            stroke: { lineCap: "round" }
        };

        simulatorGauge = new ApexCharts(document.querySelector("#gauge-churn"), gaugeOpt);
        simulatorGauge.render();
        
        simulatorInitialized = true;
        runSimulation();
    }

    btnRunSim.addEventListener("click", () => {
        runSimulation();
    });

    async function runSimulation() {
        const levelsPlayed = parseInt(document.getElementById("sim-LevelsPlayed").value);
        const successRate = parseFloat(document.getElementById("sim-SuccessRate").value);
        const totalPlayTimeSec = parseFloat(document.getElementById("sim-TotalPlayTime").value) * 60.0;
        const helpUsed = parseInt(document.getElementById("sim-HelpUsed").value);
        const restartCount = parseFloat(document.getElementById("sim-RestartCount").value);
        const avgDuration = parseFloat(document.getElementById("sim-AverageLevelDuration").value);
        
        const avgLevelPassRate = parseFloat(document.getElementById("sim-AvgLevelPassRate").value);
        const avgRetryRate = parseFloat(document.getElementById("sim-AvgRetryRate").value);
        const avgMetaDuration = parseFloat(document.getElementById("sim-AvgMetaDuration").value);
        const avgWinningDuration = parseFloat(document.getElementById("sim-AvgWinningDuration").value);

        const successfulLevels = Math.round(levelsPlayed * successRate);
        const helpRate = helpUsed / levelsPlayed;
        const restartRate = restartCount / levelsPlayed;
        const timePerSuccess = successfulLevels > 0 ? totalPlayTimeSec / successfulLevels : 0.0;

        const payload = {
            LevelsPlayed: levelsPlayed,
            SuccessfulLevels: successfulLevels,
            TotalPlayTime: totalPlayTimeSec,
            AverageLevelDuration: avgDuration,
            HelpUsed: helpUsed,
            RestartCount: restartCount,
            SuccessRate: successRate,
            HelpRate: helpRate,
            RestartRate: restartRate,
            TimePerSuccess: timePerSuccess,
            AvgLevelPassRate: avgLevelPassRate,
            AvgMetaDuration: avgMetaDuration,
            AvgRetryRate: avgRetryRate,
            AvgWinningDuration: avgWinningDuration
        };

        btnRunSim.disabled = true;
        btnRunSim.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Scoping Model Prediction...`;

        try {
            const res = await fetch("/api/predict", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error();
            const result = await res.json();
            displaySimulationResults(result);
        } catch (error) {
            showToast("Unable to retrieve analytics. Please verify the backend service is running.", "error");
        } finally {
            btnRunSim.disabled = false;
            btnRunSim.innerHTML = `<i class="fa-solid fa-bolt"></i> Run AI Simulation`;
        }
    }

    function displaySimulationResults(res) {
        const probPct = Math.round(res.ChurnProbability * 100);
        simulatorGauge.updateSeries([probPct]);
        
        let riskColor = "#10b981"; 
        if (probPct >= 60) riskColor = "#f43f5e"; 
        else if (probPct >= 40) riskColor = "#f59e0b"; 
        else if (probPct >= 20) riskColor = "#06b6d4"; 
        
        simulatorGauge.updateOptions({ colors: [riskColor] });

        document.getElementById("res-score").textContent = res.EngagementScore.toFixed(1);
        document.getElementById("res-confidence").textContent = (res.Confidence * 100).toFixed(0) + "%";
        
        // Show and list Top Factors Contributing
        const factorsBox = document.getElementById("res-factors-box");
        const factorsList = document.getElementById("res-factors-list");
        factorsList.innerHTML = "";
        
        res.TopFactors.forEach(factor => {
            const li = document.createElement("li");
            li.textContent = factor;
            factorsList.appendChild(li);
        });
        factorsBox.style.display = "block";

        const fullTexts = {
            "Offer discounts or special rewards": "Retention alert high! Offer a 30% discount on booster packages, unlock 3 premium avatar skins, or drop a direct reward pack to motivate completion.",
            "Reward loyal players": "Player is highly engaged. Roll out loyalty reward items, custom completion trophies, or show leaderboard badges to boost player status.",
            "Offer new content": "Player is moderately engaged. Suggest custom level editor access, recommend intermediate user challenges, or grant early access to level worlds.",
            "Send engagement notifications": "Dormancy warning. Dispatch push alerts reminding them of active daily events, or invite them to claim their offline passive items."
        };
        document.getElementById("res-recommendation").textContent = fullTexts[res.Recommendation] || res.Recommendation;

        const recBox = document.getElementById("res-rec-box");
        recBox.className = "recommendation-result-box";
        if (res.EngagementCategory === "High Churn Risk") recBox.classList.add("rec-danger");
        else if (res.EngagementCategory === "Low Engagement") recBox.classList.add("rec-warning");
        else if (res.EngagementCategory === "Moderately Engaged") recBox.classList.add("rec-blue");
        else recBox.classList.add("rec-success");
    }

    // -------------------------------------------------------------
    // LEVEL INSIGHTS TAB LOGIC
    // -------------------------------------------------------------
    async function loadLevelsData() {
        try {
            const res = await fetch("/api/levels?limit=50");
            if (!res.ok) throw new Error();
            const levels = await res.json();
            renderLevelsScatterChart(levels);
            renderHardestLevelsTable(levels);
        } catch (error) {
            showToast("Unable to retrieve analytics. Please verify the backend service is running.", "error");
        }
    }

    function renderLevelsScatterChart(levels) {
        const seriesData = levels.map(l => ({
            x: parseFloat((l.f_avg_passrate * 100).toFixed(1)),
            y: parseFloat(l.f_avg_retrytimes.toFixed(2)),
            level_id: l.level_id,
            duration: l.f_avg_duration
        }));

        const scatterOpt = {
            chart: {
                type: 'scatter',
                height: 380,
                background: 'transparent',
                foreColor: '#9ca3af',
                fontFamily: 'Outfit, sans-serif',
                toolbar: { show: false }
            },
            colors: ['#f43f5e'],
            series: [{ name: 'Game Level', data: seriesData }],
            xaxis: {
                tickAmount: 10,
                title: {
                    text: 'Average Level Pass Rate (%)',
                    style: { color: '#9ca3af', fontSize: '12px', fontWeight: '500' }
                },
                labels: { formatter: (val) => parseFloat(val).toFixed(0) + '%' },
                axisBorder: { show: false },
                axisTicks: { show: false }
            },
            yaxis: {
                tickAmount: 6,
                title: {
                    text: 'Average Retry Count',
                    style: { color: '#9ca3af', fontSize: '12px', fontWeight: '500' }
                }
            },
            grid: { borderColor: 'rgba(255, 255, 255, 0.05)', strokeDashArray: 4 },
            markers: { size: 8, strokeWidth: 1, strokeColors: '#111322', hover: { sizeOffset: 3 } },
            tooltip: {
                theme: 'dark',
                custom: function({ series, seriesIndex, dataPointIndex, w }) {
                    const data = w.config.series[seriesIndex].data[dataPointIndex];
                    return `
                        <div class="chart-tooltip-panel" style="padding: 10px; font-family: Outfit;">
                            <strong style="color: #fff;">Level ID: #${data.level_id}</strong><br>
                            Pass Rate: ${data.x}%<br>
                            Avg Retries: ${data.y}<br>
                            Avg Playtime: ${Math.round(data.duration)}s
                        </div>
                    `;
                }
            }
        };

        if (levelsScatterChart) levelsScatterChart.destroy();
        levelsScatterChart = new ApexCharts(document.querySelector("#chart-level-scatter"), scatterOpt);
        levelsScatterChart.render();
    }

    function renderHardestLevelsTable(levels) {
        const body = document.getElementById("hardest-levels-body");
        body.innerHTML = "";
        const hardest = levels.slice(0, 10);
        hardest.forEach(l => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>Lvl ${l.level_id}</strong></td>
                <td class="value-danger"><strong>${(l.f_avg_passrate * 100).toFixed(1)}%</strong></td>
                <td>${l.f_avg_retrytimes.toFixed(2)}</td>
                <td>${Math.round(l.f_avg_duration)}s</td>
            `;
            body.appendChild(tr);
        });
    }

    // -------------------------------------------------------------
    // FEATURE IMPORTANCE TAB LOGIC
    // -------------------------------------------------------------
    async function loadFeatureImportance(force = false) {
        toggleChartSkeletons(true);
        try {
            const res = await fetch("/api/feature-importance");
            if (!res.ok) throw new Error();
            const data = await res.json();
            toggleChartSkeletons(false);
            renderFeatureImportanceChart(data);
        } catch (error) {
            toggleChartSkeletons(false);
            showToast("Unable to retrieve analytics. Please verify the backend service is running.", "error");
        }
    }

    function renderFeatureImportanceChart(data) {
        const featureNames = data.map(item => {
            // Expand feature names cleanly for horizontal display
            const displayNames = {
                LevelsPlayed: "Levels Played",
                SuccessfulLevels: "Successful Levels",
                TotalPlayTime: "Total Playtime",
                AverageLevelDuration: "Average Level Duration",
                HelpUsed: "Help Hints Used",
                RestartCount: "Restart Count",
                SuccessRate: "Success Rate",
                HelpRate: "Help Hints Rate",
                RestartRate: "Restart Rate",
                TimePerSuccess: "Time Per Success",
                AvgLevelPassRate: "Avg Level Passrate",
                AvgMetaDuration: "Avg Meta Duration",
                AvgRetryRate: "Avg Retrytimes (Meta)",
                AvgWinningDuration: "Avg Win Duration"
            };
            return displayNames[item.name] || item.name;
        });
        
        const importancePct = data.map(item => parseFloat((item.importance * 100).toFixed(1)));

        // Descriptive explanations mapping for tooltips
        const tooltipDetails = {
            "LevelsPlayed": "Total level sessions initiated. High values signal dedication.",
            "SuccessfulLevels": "Raw number of levels passed successfully.",
            "TotalPlayTime": "Accumulated game runtime. Helps isolate highly loyal players.",
            "AverageLevelDuration": "Mean gameplay session duration per attempt.",
            "HelpUsed": "Accumulated usage count of inline hints/assists.",
            "RestartCount": "Sum of remaining steps (f_reststep) indicating level restarts.",
            "SuccessRate": "Ratio of pass attempts to total games. Directly maps player performance.",
            "HelpRate": "Usage frequency of helpers per level attempt.",
            "RestartRate": "Average restart count per attempt. Critical frustration indicator.",
            "TimePerSuccess": "Playtime required to achieve a success (efficiency index).",
            "AvgLevelPassRate": "Baseline difficulty of played levels. Measures player skill exposure.",
            "AvgMetaDuration": "Benchmark expected play duration of levels played.",
            "AvgRetryRate": "Average community retry frequency of level catalog played.",
            "AvgWinningDuration": "Community win baseline playtime average."
        };

        const importanceOpt = {
            chart: {
                type: 'bar',
                height: 480,
                background: 'transparent',
                foreColor: '#9ca3af',
                fontFamily: 'Outfit, sans-serif',
                toolbar: { show: false }
            },
            plotOptions: {
                bar: {
                    horizontal: true,
                    barHeight: '65%',
                    borderRadius: 4
                }
            },
            colors: ['#6366f1'],
            series: [{
                name: 'Importance Score (%)',
                data: importancePct
            }],
            xaxis: {
                categories: featureNames,
                axisBorder: { show: false },
                axisTicks: { show: false },
                labels: { formatter: (val) => val + "%" }
            },
            grid: {
                borderColor: 'rgba(255, 255, 255, 0.05)',
                strokeDashArray: 4
            },
            tooltip: {
                theme: 'dark',
                custom: function({ series, seriesIndex, dataPointIndex, w }) {
                    const featCode = data[dataPointIndex].name;
                    const desc = tooltipDetails[featCode] || "Player metrics variable weight.";
                    return `
                        <div class="chart-tooltip-panel" style="padding: 10px; font-family: Outfit; max-width: 250px;">
                            <strong style="color: #fff;">${w.globals.labels[dataPointIndex]}</strong><br>
                            Weight: <span style="color: #a855f7; font-weight:700;">${series[seriesIndex][dataPointIndex]}%</span><br>
                            <span style="font-size: 0.78rem; color: #9ca3af; line-height: 1.3; display:inline-block; margin-top: 4px;">${desc}</span>
                        </div>
                    `;
                }
            }
        };

        if (featureImportanceChart) featureImportanceChart.destroy();
        featureImportanceChart = new ApexCharts(document.querySelector("#chart-feature-importance"), importanceOpt);
        featureImportanceChart.render();
    }

    // -------------------------------------------------------------
    // MODEL COMPARISON TAB LOGIC
    // -------------------------------------------------------------
    async function loadModelComparison() {
        try {
            const res = await fetch("/api/model-comparison");
            if (!res.ok) throw new Error();
            const models = await res.json();
            renderModelComparisonTable(models);
        } catch (error) {
            showToast("Unable to retrieve analytics. Please verify the backend service is running.", "error");
        }
    }

    function renderModelComparisonTable(models) {
        const body = document.getElementById("model-comparison-body");
        body.innerHTML = "";

        models.forEach(m => {
            const tr = document.createElement("tr");
            if (m.selected) {
                tr.className = "row-selected-model";
            }
            
            const roleText = m.selected ? '<span style="color: var(--color-success); font-weight:700;"><i class="fa-solid fa-trophy"></i> Winner (Deployed)</span>' : '<span style="color: var(--text-muted);">Evaluation Candidate</span>';
            
            tr.innerHTML = `
                <td><strong>${m.name}</strong></td>
                <td>${m.accuracy.toFixed(2)}%</td>
                <td>${m.roc_auc.toFixed(2)}</td>
                <td>${roleText}</td>
            `;
            body.appendChild(tr);
        });
    }

    // -------------------------------------------------------------
    // PLAYER DETAILS PROFILE MODAL LOGIC
    // -------------------------------------------------------------
    async function openPlayerProfile(userId) {
        document.getElementById("modal-user-id").textContent = `#${userId}`;
        playerModal.classList.add("active");
        
        try {
            const res = await fetch(`/api/player/${userId}`);
            if (!res.ok) throw new Error();
            const data = await res.json();
            populatePlayerModal(data);
        } catch (error) {
            showToast("Unable to retrieve analytics. Please verify the backend service is running.", "error");
            closePlayerProfile();
        }
    }

    function populatePlayerModal(data) {
        const p = data.profile;
        const history = data.history;
        const medians = data.community_medians;

        document.getElementById("modal-stat-played").textContent = p.LevelsPlayed;
        document.getElementById("modal-stat-success-rate").textContent = (p.SuccessRate * 100).toFixed(1) + "%";
        document.getElementById("modal-stat-time").textContent = Math.round(p.TotalPlayTime / 60) + " min";
        document.getElementById("modal-stat-avg-duration").textContent = Math.round(p.AverageLevelDuration) + "s";
        document.getElementById("modal-stat-help").textContent = p.HelpUsed;
        document.getElementById("modal-stat-restarts").textContent = Math.round(p.RestartCount);

        const badge = document.getElementById("modal-category");
        badge.textContent = p.EngagementCategory;
        badge.className = "modal-cat-badge";
        
        const catClasses = {
            "Highly Engaged": "badge-cat-highly",
            "Moderately Engaged": "badge-cat-moderately",
            "Low Engagement": "badge-cat-low",
            "High Churn Risk": "badge-cat-churn"
        };
        badge.classList.add(catClasses[p.EngagementCategory] || "badge-cat-low");

        document.getElementById("modal-recommendation").textContent = p.Recommendation;
        
        const alertBox = document.getElementById("modal-rec-alert");
        alertBox.className = "modal-recommendation-alert";
        if (p.EngagementCategory === "High Churn Risk") {
            alertBox.style.color = "var(--color-danger)";
            alertBox.style.borderColor = "rgba(244, 63, 94, 0.25)";
            alertBox.style.backgroundColor = "rgba(244, 63, 94, 0.04)";
        } else if (p.EngagementCategory === "Low Engagement") {
            alertBox.style.color = "var(--color-warning)";
            alertBox.style.borderColor = "rgba(245, 158, 11, 0.2)";
            alertBox.style.backgroundColor = "rgba(245, 158, 11, 0.04)";
        } else {
            alertBox.style.color = "var(--color-success)";
            alertBox.style.borderColor = "rgba(16, 185, 129, 0.2)";
            alertBox.style.backgroundColor = "rgba(16, 185, 129, 0.04)";
        }

        // Update Progress Bars
        document.getElementById("lbl-modal-engagement").textContent = p.EngagementScore.toFixed(1) + "%";
        document.getElementById("bar-modal-engagement").style.width = p.EngagementScore + "%";
        
        const churnPct = p.ChurnProbability * 100;
        document.getElementById("lbl-modal-churn").textContent = churnPct.toFixed(1) + "%";
        document.getElementById("bar-modal-churn").style.width = churnPct + "%";
        
        const succPct = p.SuccessRate * 100;
        document.getElementById("lbl-modal-success").textContent = succPct.toFixed(1) + "%";
        document.getElementById("bar-modal-success").style.width = succPct + "%";
        
        const restartPct = Math.min(100, p.RestartRate * 100);
        document.getElementById("lbl-modal-restart").textContent = (p.RestartRate * 100).toFixed(1) + "%";
        document.getElementById("bar-modal-restart").style.width = restartPct + "%";

        // AI Insight
        document.getElementById("modal-ai-insight").textContent = p.AI_Insight || "No custom AI insights generated for this player model.";

        // Radar chart comparison
        const helpRateVal = p.HelpRate;
        const pLevels = Math.min(200, (p.LevelsPlayed / (medians.LevelsPlayed || 1)) * 100);
        const pSuccess = p.SuccessRate * 100;
        const pHelp = Math.min(200, (helpRateVal / (medians.HelpRate || 0.08)) * 100);
        const pRestart = Math.min(200, (p.RestartRate / (medians.RestartRate || 0.2)) * 100);
        const pPlayTime = Math.min(200, (p.TotalPlayTime / (medians.TotalPlayTime || 1)) * 100);
        
        const cLevels = 100;
        const cSuccess = medians.SuccessRate * 100;
        const cHelp = 100;
        const cRestart = 100;
        const cPlayTime = 100;

        renderPlayerRadarChart(
            [pLevels, pSuccess, pHelp, pRestart, pPlayTime],
            [cLevels, cSuccess, cHelp, cRestart, cPlayTime]
        );

        renderPlayerAttemptsChart(history);
    }

    function renderPlayerRadarChart(playerVals, communityVals) {
        const radarOpt = {
            chart: {
                height: 250,
                type: 'radar',
                background: 'transparent',
                foreColor: '#9ca3af',
                fontFamily: 'Outfit, sans-serif',
                toolbar: { show: false }
            },
            colors: ['#6366f1', '#a855f7'],
            series: [{
                name: 'This Player (Normalized)',
                data: playerVals.map(v => Math.round(v))
            }, {
                name: 'Community Median (Benchmark)',
                data: communityVals.map(v => Math.round(v))
            }],
            labels: ['Levels Played', 'Success Rate', 'Help Rate', 'Restart Rate', 'Play Time'],
            plotOptions: {
                radar: {
                    size: 80,
                    polygons: {
                        strokeColors: 'rgba(255, 255, 255, 0.05)',
                        fill: { colors: ['transparent', 'transparent'] }
                    }
                }
            },
            stroke: { width: 2 },
            markers: { size: 4 },
            legend: { show: false },
            tooltip: {
                theme: 'dark',
                y: { formatter: (val) => val + "%" }
            }
        };

        if (playerRadarChart) playerRadarChart.destroy();
        playerRadarChart = new ApexCharts(document.querySelector("#modal-radar-chart"), radarOpt);
        playerRadarChart.render();
    }

    function renderPlayerAttemptsChart(history) {
        if (!history || history.length === 0) {
            document.querySelector("#modal-player-timeline-chart").innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    No historical session logs recorded.
                </div>
            `;
            return;
        }

        const attemptsIndices = history.map((h, i) => `Att ${i + 1} (Lvl ${h.level_id})`);
        const userDurations = history.map(h => Math.round(h.f_duration));
        const metaDurations = history.map(h => Math.round(h.f_avg_duration));

        const timelineOpt = {
            chart: {
                height: 280,
                type: 'line',
                background: 'transparent',
                foreColor: '#9ca3af',
                fontFamily: 'Outfit, sans-serif',
                toolbar: { show: false }
            },
            stroke: { width: [0, 3], curve: 'smooth' },
            colors: ['#6366f1', '#a855f7'],
            series: [{
                name: 'Attempt Duration (Sec)',
                type: 'column',
                data: userDurations
            }, {
                name: 'Community Average (Sec)',
                type: 'line',
                data: metaDurations
            }],
            fill: {
                opacity: [0.35, 1],
                gradient: {
                    inverseColors: false,
                    shade: 'light',
                    type: "vertical",
                    opacityFrom: 0.85,
                    opacityTo: 0.2,
                    stops: [0, 100, 100, 100]
                }
            },
            xaxis: {
                categories: attemptsIndices,
                labels: {
                    show: attemptsIndices.length <= 25,
                    rotate: -45
                },
                axisBorder: { show: false },
                axisTicks: { show: false }
            },
            yaxis: {
                title: { text: 'Seconds', style: { color: '#9ca3af' } }
            },
            grid: { borderColor: 'rgba(255, 255, 255, 0.05)', strokeDashArray: 4 },
            tooltip: {
                theme: 'dark',
                shared: true,
                intersect: false,
                y: {
                    formatter: function(y, { seriesIndex, dataPointIndex }) {
                        if (typeof y !== "undefined") {
                            if (seriesIndex === 0) {
                                const succ = history[dataPointIndex].f_success === 1 ? "Success" : "Failed";
                                const help = history[dataPointIndex].f_help === 1 ? "Yes" : "No";
                                return `${y}s (${succ}) | Help: ${help}`;
                            }
                            return `${y}s`;
                        }
                        return y;
                    }
                }
            },
            plotOptions: {
                bar: {
                    columnWidth: '50%',
                    borderRadius: 4,
                    colors: { ranges: [{ from: 0, to: 10000, color: '#6366f1' }] }
                }
            }
        };

        if (playerTimelineChart) playerTimelineChart.destroy();
        playerTimelineChart = new ApexCharts(document.querySelector("#modal-player-timeline-chart"), timelineOpt);
        playerTimelineChart.render();
    }

    function closePlayerProfile() {
        playerModal.classList.remove("active");
    }

    btnCloseModal.addEventListener("click", closePlayerProfile);
    playerModal.addEventListener("click", (e) => {
        if (e.target === playerModal) closePlayerProfile();
    });

    // Player Database Filters & Pagination Event Listeners
    if (txtSearch) {
        txtSearch.addEventListener("input", () => {
            currentPage = 1;
            loadPlayersTable();
        });
    }

    if (selCategory) {
        selCategory.addEventListener("change", () => {
            currentPage = 1;
            loadPlayersTable();
        });
    }

    if (btnResetFilters) {
        btnResetFilters.addEventListener("click", () => {
            if (txtSearch) txtSearch.value = "";
            if (selCategory) selCategory.value = "";
            currentPage = 1;
            loadPlayersTable();
        });
    }

    if (btnPrev) {
        btnPrev.addEventListener("click", () => {
            if (currentPage > 1) {
                currentPage--;
                loadPlayersTable();
            }
        });
    }

    if (btnNext) {
        btnNext.addEventListener("click", () => {
            currentPage++;
            loadPlayersTable();
        });
    }

    // -------------------------------------------------------------
    // STARTUP DATA TRIGGER
    // -------------------------------------------------------------
    loadOverviewData();
});