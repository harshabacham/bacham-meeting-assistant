use appsdesktop_lib::ai::pipeline_v2::pedagogy_engine::TextbookSummary;

#[test]
fn test_multimodal_full_context_scenario() {
    let raw_llm_json = r###"{
        "quick_summary": "- [00:12] Team discussed architecture migration to Tauri 2.0\n- [04:45] Frontend state management settled on Zustand",
        "standard_summary": "In this architectural planning session, the engineering team aligned on the migration roadmap. Key architectural changes include adopting Tauri 2.0 plugins and unified SQLite persistence [Slide @ 02:30].",
        "deep_notes": "Detailed architecture breakdown:\n1. Native messaging IPC between Chrome Extension and Rust core [Slide @ 01:15].\n2. Real-time audio stream pipeline via WebSockets.",
        "textbook_notes": "# System Architecture Chapter\n\n## 1. Native Messaging Protocol\nThe desktop application communicates with browser extensions using standard stdin/stdout byte framing.",
        "overview": "Comprehensive architecture planning and tech stack decision session.",
        "objectives": [
            "Finalize Tauri 2 migration",
            "Establish IPC messaging protocol"
        ],
        "chapter_breakdown": [
            { "title": "Overview & Introductions", "summary": "Initial sync on goals [00:00]" },
            { "title": "Architecture Deep Dive", "summary": "Analysis of slide diagrams [02:30]" }
        ],
        "concepts_and_definitions": [
            { "term": "IPC Framing", "definition": "Length-prefixed binary message envelope", "explanation": "Ensures complete packet delivery across process boundaries" }
        ],
        "formula_sheet": [
            { "formula": "Throughput = N / T", "meaning": "Message processing rate", "variables": "N: packets, T: seconds", "derivation": "Direct measurement", "exam_tip": "Watch for unit conversions" }
        ],
        "code_explained": [
            { "language": "Rust", "purpose": "Single-instance window focusing", "logic": "app.get_webview_window('main').show()", "code_snippet": "window.show(); window.set_focus();", "complexity": "O(1)" }
        ],
        "visual_explanations": [
            { "title": "System Diagram Slide", "explanation": "Box-and-arrow chart showing Chrome Extension -> Native Host -> SQLite DB", "key_takeaway": "Clean decoupling of presentation and storage" }
        ],
        "cheat_sheet": "IPC Framing: 4-byte header + JSON body",
        "revision_tips": ["Review IPC buffer limits"],
        "interview_questions": [
            { "question": "Why use length-prefixed framing for native messaging?", "expected_answer": "Because standard streams lack natural message delimiters", "difficulty": "medium" }
        ],
        "exam_questions": [
            { "question": "Calculate buffer overhead for 1000 messages with 4-byte headers.", "solution": "4000 bytes = 4 KB overhead", "difficulty": "easy" }
        ],
        "key_takeaways": [
            "Tauri 2 plugin architecture adopted",
            "Zero memory leaks achieved via Rust memory safety"
        ],
        "crm_metadata": {
            "action_items": [
                { "task": "Publish npm package", "owner": "Sarah", "priority": "high", "due_date": "2026-08-20" }
            ],
            "key_decisions": [
                "Approved Zustand for client-side state"
            ],
            "bant": {
                "budget": "$50,000",
                "authority": "CTO approved",
                "need": "Enterprise meeting intelligence",
                "timeline": "Q3 2026"
            }
        }
    }"###;

    let parsed: Result<TextbookSummary, _> = serde_json::from_str(raw_llm_json);
    assert!(parsed.is_ok(), "Failed to parse full multimodal payload: {:?}", parsed.err());
    let summary = parsed.unwrap();
    assert_eq!(summary.chapter_breakdown.len(), 2);
    assert_eq!(summary.formula_sheet.len(), 1);
    assert_eq!(summary.code_explained.len(), 1);
    assert_eq!(summary.visual_explanations.len(), 1);
    assert!(summary.quick_summary.unwrap().contains("[00:12]"));
    assert!(summary.deep_notes.unwrap().contains("[Slide @ 01:15]"));
}

#[test]
fn test_audio_only_scenario() {
    let audio_only_json = r###"{
        "quick_summary": "- [00:01] 1-on-1 performance review\n- [05:20] Agreed on promotion timeline",
        "standard_summary": "A 1-on-1 audio check-in covering quarterly feedback and career growth milestones.",
        "deep_notes": "Detailed discussion on technical leadership, mentorship goals, and cross-team collaboration.",
        "textbook_notes": "Comprehensive 1-on-1 meeting record.",
        "overview": "Quarterly engineering 1-on-1 check-in.",
        "objectives": ["Review Q2 goals", "Plan Q3 milestones"],
        "chapter_breakdown": [
            { "title": "Quarterly Feedback", "summary": "Discussion of recent deliverables [01:00]" },
            { "title": "Career Development", "summary": "Growth opportunities and next steps [04:30]" }
        ],
        "concepts_and_definitions": [],
        "formula_sheet": [],
        "code_explained": [],
        "visual_explanations": [],
        "cheat_sheet": "Goals: Ship v2, mentor junior engineers",
        "revision_tips": [],
        "interview_questions": [],
        "exam_questions": [],
        "key_takeaways": ["Exceeded expectations in Q2"],
        "crm_metadata": {
            "action_items": [
                { "task": "Submit self-evaluation form", "owner": "David", "priority": "medium", "due_date": "2026-08-25" }
            ],
            "key_decisions": ["Promotion scheduled for Q4 cycle"],
            "bant": null
        }
    }"###;

    let parsed: Result<TextbookSummary, _> = serde_json::from_str(audio_only_json);
    assert!(parsed.is_ok());
    let summary = parsed.unwrap();
    assert!(summary.formula_sheet.is_empty());
    assert!(summary.code_explained.is_empty());
    assert!(summary.visual_explanations.is_empty());
    assert_eq!(summary.chapter_breakdown.len(), 2);
}

#[test]
fn test_visual_heavy_sparse_speech_scenario() {
    let visual_heavy_json = r###"{
        "quick_summary": "- [00:00] Screen recording of live Kubernetes cluster dashboard\n- [02:15] Observed pod restart events in payment-service",
        "standard_summary": "Visual debugging session monitoring the Kubernetes cluster. The screen shows Grafana metrics indicating a CPU spike at 14:30 UTC leading to OOMKilled pod status.",
        "deep_notes": "Visual slide analysis [Slide @ 00:45]: Memory limit was configured to 512Mi while baseline consumption reached 580Mi under peak load.",
        "textbook_notes": "Incident Post-Mortem and Cluster Diagnosis.",
        "overview": "Screen-recorded debugging session for production memory leak.",
        "objectives": ["Identify OOM cause", "Formulate mitigation plan"],
        "chapter_breakdown": [
            { "title": "Grafana Dashboard Review", "summary": "Analysis of memory graphs [00:30]" },
            { "title": "Kubectl Logs Inspection", "summary": "Examined pod crash backtrace [02:00]" }
        ],
        "concepts_and_definitions": [
            { "term": "OOMKilled", "definition": "Out of Memory Kill by Linux cgroups", "explanation": "Kernel terminates processes exceeding container memory limits" }
        ],
        "formula_sheet": [],
        "code_explained": [
            { "language": "YAML", "purpose": "Resource limit configuration", "logic": "resources.limits.memory: 1Gi", "code_snippet": "limits:\n  memory: 1Gi", "complexity": "N/A" }
        ],
        "visual_explanations": [
            { "title": "Grafana Memory Usage Graph", "explanation": "Steep linear rise in RAM usage from 100MB to 512MB over 20 minutes", "key_takeaway": "Classic uncollected event listener leak" }
        ],
        "cheat_sheet": "Set memory limit to 1Gi + profile heap dump",
        "revision_tips": [],
        "interview_questions": [],
        "exam_questions": [],
        "key_takeaways": ["Memory leak isolated to payment webhook handler"],
        "crm_metadata": {
            "action_items": [
                { "task": "Increase memory limit in deployment.yaml", "owner": "DevOps", "priority": "high", "due_date": "Today" }
            ],
            "key_decisions": ["Deploy hotfix immediately"],
            "bant": null
        }
    }"###;

    let parsed: Result<TextbookSummary, _> = serde_json::from_str(visual_heavy_json);
    assert!(parsed.is_ok());
    let summary = parsed.unwrap();
    assert_eq!(summary.visual_explanations.len(), 1);
    assert_eq!(summary.code_explained.len(), 1);
}

#[test]
fn test_short_standup_scenario() {
    let standup_json = r###"{
        "quick_summary": "- [00:05] Today working on bug fixes\n- [00:20] No blockers",
        "standard_summary": "Rapid 20-second standup check-in. Engineer reported progress on bug tickets with zero blockers.",
        "deep_notes": "Standup details: closing tickets #401 and #402.",
        "textbook_notes": "Standup log.",
        "overview": "Daily quick sync.",
        "objectives": ["Share daily status"],
        "chapter_breakdown": [],
        "concepts_and_definitions": [],
        "formula_sheet": [],
        "code_explained": [],
        "visual_explanations": [],
        "cheat_sheet": "No blockers",
        "revision_tips": [],
        "interview_questions": [],
        "exam_questions": [],
        "key_takeaways": ["All tasks on schedule"],
        "crm_metadata": null
    }"###;

    let parsed: Result<TextbookSummary, _> = serde_json::from_str(standup_json);
    assert!(parsed.is_ok());
    let summary = parsed.unwrap();
    assert!(summary.chapter_breakdown.is_empty());
    assert!(summary.crm_metadata.is_none());
}

#[test]
fn test_bilingual_hinglish_context() {
    let hinglish_json = r###"{
        "quick_summary": "- [00:10] Discussed frontend UI styling and dynamic components\n- [02:30] Resolved responsiveness issues on mobile layout",
        "standard_summary": "Discussion regarding user interface layout improvements and responsive design adjustments across all desktop and mobile viewports.",
        "deep_notes": "Detailed review of CSS grid configurations and Tailwind responsive utility classes.",
        "textbook_notes": "UI Engineering Guidelines.",
        "overview": "Design sync on web application responsiveness.",
        "objectives": ["Fix responsive breakpoints"],
        "chapter_breakdown": [
            { "title": "Layout Inspection", "summary": "Examined mobile viewport alignment [00:30]" }
        ],
        "concepts_and_definitions": [
            { "term": "Responsive Breakpoint", "definition": "Screen width threshold for CSS media queries", "explanation": "Allows adaptive UI reflow" }
        ],
        "formula_sheet": [],
        "code_explained": [],
        "visual_explanations": [],
        "cheat_sheet": "Use tailwind md: and lg: breakpoints",
        "revision_tips": [],
        "interview_questions": [],
        "exam_questions": [],
        "key_takeaways": ["Mobile layout verified across standard screen sizes"],
        "crm_metadata": null
    }"###;

    let parsed: Result<TextbookSummary, _> = serde_json::from_str(hinglish_json);
    assert!(parsed.is_ok());
}
