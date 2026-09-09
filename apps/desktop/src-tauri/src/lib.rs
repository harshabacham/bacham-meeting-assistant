pub mod commands;
pub mod database;
pub mod storage;
pub mod logger;
pub mod native_messaging;
pub mod config;
pub mod window;
pub mod error;
pub mod services;
pub mod ai;
pub mod models;
pub mod ws_server;
pub mod upload_server;
pub mod integrations;

use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

pub fn run() {
    let is_native_messaging = std::env::args().any(|arg| arg.starts_with("chrome-extension://"));
    let start_minimized = std::env::args().any(|arg| arg == "--minimized" || arg == "--autostart");

    let mut builder = tauri::Builder::default();

    builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
        if let Some(main_window) = app.get_webview_window("main") {
            let _ = main_window.show();
            let _ = main_window.unminimize();
            let _ = main_window.set_focus();
        } else {
            let _ = tauri::webview::WebviewWindowBuilder::new(
                app,
                "main",
                tauri::WebviewUrl::default()
            )
            .title("BACHAM")
            .inner_size(1200.0, 800.0)
            .decorations(false)
            .transparent(true)
            .visible(true)
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
            .build();
        }
    }));

    builder = builder
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"])
        ))
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init());

    if !is_native_messaging {
        builder = builder.plugin(tauri_plugin_global_shortcut::Builder::new().build());
    }

    let builder = builder.setup(move |app| {
            let handle = app.handle().clone();
            
            // Build system tray icon and menu
            let open_item = MenuItemBuilder::with_id("open", "Open Bacham").build(app)?;
            let quit_item = MenuItemBuilder::with_id("quit", "Quit").build(app)?;
            let tray_menu = MenuBuilder::new(app)
                .items(&[&open_item, &quit_item])
                .build()?;

            let _tray = TrayIconBuilder::new()
                .menu(&tray_menu)
                .tooltip("Bacham Meeting Assistant")
                .on_menu_event(|app, event| {
                    match event.id().as_ref() {
                        "open" => {
                            if let Some(w) = app.get_webview_window("main") {
                                let _ = w.show();
                                let _ = w.unminimize();
                                let _ = w.set_focus();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.unminimize();
                            let _ = w.set_focus();
                        }
                    }
                })
                .build(app)?;

            // Resolve DB Path from custom marker file if configured, otherwise default to Documents/BACHAM
            let default_bacham_dir = handle.path().document_dir().expect("Failed to resolve Documents dir").join("BACHAM");
            let bacham_dir = if let Ok(config_dir) = handle.path().app_config_dir() {
                let marker = config_dir.join("storage_location.txt");
                if let Ok(custom) = std::fs::read_to_string(&marker) {
                    let trimmed = custom.trim();
                    if !trimmed.is_empty() {
                        std::path::PathBuf::from(trimmed)
                    } else {
                        default_bacham_dir
                    }
                } else {
                    default_bacham_dir
                }
            } else {
                default_bacham_dir
            };

            let _ = crate::storage::initialize_layout(bacham_dir.clone());
            let db_path = bacham_dir.join("Data").join("bacham.sqlite");
            
            // Show main window immediately only if not starting minimized in background
            if !start_minimized {
                if let Some(main_window) = app.get_webview_window("main") {
                    let _ = main_window.show();
                    let _ = main_window.unminimize();
                    let _ = main_window.set_focus();
                } else {
                    let main_window = tauri::webview::WebviewWindowBuilder::new(
                        app,
                        "main",
                        tauri::WebviewUrl::default()
                    )
                    .title("BACHAM")
                    .inner_size(1200.0, 800.0)
                    .decorations(false)
                    .transparent(true)
                    .visible(true)
                    .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                    .on_new_window(move |_url, _features| {
                        tauri::webview::NewWindowResponse::Allow
                    })
                    .build()
                    .expect("Failed to build main window");
                    
                    let _ = main_window.show();
                    let _ = main_window.unminimize();
                    let _ = main_window.set_focus();
                }
            }

            #[cfg(target_os = "windows")]
            {
                if let Ok(exe_path) = std::env::current_exe() {
                    use std::os::windows::process::CommandExt;
                    let exe_str = exe_path.to_string_lossy().to_string();
                    let _ = std::process::Command::new("reg")
                        .args(&["add", "HKCU\\Software\\Classes\\bacham", "/ve", "/t", "REG_SZ", "/d", "URL:BACHAM Protocol", "/f"])
                        .creation_flags(0x08000000)
                        .output();
                    let _ = std::process::Command::new("reg")
                        .args(&["add", "HKCU\\Software\\Classes\\bacham", "/v", "URL Protocol", "/t", "REG_SZ", "/d", "", "/f"])
                        .creation_flags(0x08000000)
                        .output();
                    let cmd_str = format!("\"{}\" \"%1\"", exe_str);
                    let _ = std::process::Command::new("reg")
                        .args(&["add", "HKCU\\Software\\Classes\\bacham\\shell\\open\\command", "/ve", "/t", "REG_SZ", "/d", &cmd_str, "/f"])
                        .creation_flags(0x08000000)
                        .output();
                }
            }
            
            let mut db_pool = None;
            match tauri::async_runtime::block_on(database::connection::create_pool(db_path)) {
                Ok(pool) => {
                    handle.manage(database::DbState { pool: pool.clone() });
                    handle.manage(commands::capture::CaptureState::default());
                    eprintln!("Database initialized successfully.");
                    db_pool = Some(pool);
                }
                Err(e) => {
                    eprintln!("Failed to initialize database: {}", e);
                }
            }

            if is_native_messaging {
                crate::native_messaging::host::start_listener(handle.clone());
            }

            if let Some(pool) = db_pool {
                let handle_clone = handle.clone();
                tauri::async_runtime::spawn(async move {
                    crate::ai::queue_worker::QueueWorker::spawn(handle_clone.clone(), pool.clone());
                    crate::services::search_indexer::SearchIndexer::run_backfill_background(pool.clone());
                    crate::upload_server::start_upload_server(handle_clone.clone()).await;
                    crate::ws_server::start_ws_server(handle_clone).await;
                });
            }
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // System
            commands::settings::settings_get,
            commands::settings::settings_update,
            commands::settings::settings_set_api_key,
            commands::settings::settings_set_provider_token,
            commands::settings::settings_get_provider_token,
            commands::settings::settings_remove_provider_token,
            commands::storage::storage_get_layout,
            commands::storage::storage_change_location,
            commands::storage::storage_get_breakdown,
            commands::storage::storage_delete_video,
            commands::storage::storage_delete_screenshot,
            commands::storage::storage_backup_database,
            commands::window::window_minimize,
            commands::window::window_maximize,
            commands::window::window_close,
            commands::native::native_messaging_status,
            commands::native::fetch_ical_feed,
            commands::native::fetch_url_with_auth,
            commands::native::fetch_custom,
            commands::capture::trigger_extension_recording,
            crate::ws_server::is_extension_connected,
            commands::db_health_check,
            commands::logger_write,
            // Lectures
            commands::lectures::lectures_list,
            commands::lectures::lectures_get,
            commands::lectures::lectures_update,
            commands::lectures::lectures_delete,
            commands::lectures::lectures_list_trash,
            commands::lectures::lectures_restore,
            commands::lectures::lectures_empty_trash,
            commands::lectures::lectures_hard_delete,
            commands::lectures::lectures_merge,
            commands::lectures::lectures_duplicate,
            commands::lectures::delete_lecture_video,
            commands::lectures::tags_list,
            commands::lectures::lecture_add_tag,
            commands::lectures::lecture_remove_tag,
            commands::lectures::trim_video_by_timestamps,
            commands::folders::folders_list,
            commands::folders::get_folder_tree,
            commands::folders::create_folder,
            commands::folders::update_folder,
            commands::folders::rename_folder,
            commands::folders::duplicate_folder,
            commands::folders::move_folder,
            commands::folders::reorder_folders,
            commands::folders::set_folder_favorite,
            commands::folders::set_folder_pinned,
            commands::folders::archive_folder,
            commands::folders::trash_folder,
            commands::folders::restore_folder,
            commands::folders::delete_folder_permanently,
            commands::folders::lock_folder,
            commands::folders::unlock_folder,
            commands::folders::remove_folder_lock,
            commands::folder_stats::get_folder_dashboard,
            commands::folder_stats::recompute_folder_statistics,
            commands::folder_notes::get_folder_notes,
            commands::folder_notes::create_folder_note,
            commands::folder_notes::update_folder_note,
            commands::folder_notes::delete_folder_note,
            commands::folder_transfer::folder_export,
            commands::folder_transfer::folder_import,
            // Content
            commands::content::transcript_get,
            commands::content::transcript_append,
            commands::content::notes_get,
            commands::content::notes_update,
            commands::content::note_versions_list,
            commands::content::note_versions_restore,
            commands::content::screenshots_get,
            commands::content::summary_get,
            commands::content::read_file_as_base64,
            // AI
            commands::ai::ai_chat_send,
            commands::ai::folder_chat_send,
            commands::ai::global_memory_chat_send,
            ai::context_engine::resolve_scope_lectures,
            // Chat & Action Commands
            commands::chat::create_conversation,
            commands::chat::get_or_create_lecture_conversation,
            commands::chat::list_conversations,
            commands::chat::send_message,
            commands::chat::get_conversation_history,
            commands::chat::rename_conversation,
            commands::chat::toggle_conversation_favorite,
            commands::chat::archive_conversation,
            commands::chat::delete_conversation,
            commands::chat::change_conversation_scope,
            commands::ai::summary_generate,
            commands::ai::flashcards_generate,
            commands::ai::grill_me_interaction,
            commands::ai::start_scoped_chat,
            commands::ai::quiz_generate,
            commands::ai::analyze_conversation,
            commands::ai::notes_ai_augment,
            commands::ai::soundbites_list,
            commands::ai::soundbites_create,
            commands::ai::soundbites_delete,
            commands::ai::transcript_comments_list,
            commands::ai::transcript_comments_add,
            commands::ai::transcript_comments_delete,
            commands::ai::send_tutor_action,
            commands::ai::suggest_folders_for_lecture,
            commands::ai::generate_highlight_reel,
            commands::ai::generate_knowledge_graph,
            commands::ai::generate_podcast_script,
            commands::ai::lecture_intelligence_generate,
            commands::ai::chat_teaching_mode,
            commands::ai::get_cross_lecture_insights,
            commands::ai::record_quiz_attempt,
            commands::ai::save_session_state,
            commands::ai::get_session_state,
            commands::ai::get_spaced_repetition_queue,
            commands::ai::review_spaced_repetition_item,
            commands::ai::get_learning_analytics,
            commands::ai::get_daily_learning_plan,
            commands::ai::get_ai_study_coach_suggestions,
            commands::ai::reset_learning_history,
            commands::ai::simulate_live_meeting,
            commands::ai::execute_agentic_action,
            commands::ai::get_all_action_items,
            commands::ai::update_action_item_status,
            commands::ai::global_ask_ai,
            commands::ai::send_global_memory_chat,
            commands::ai::generate_multimodal_summary,
            commands::ai::translate_transcript,
            commands::ai::generate_pre_meeting_brief,
            commands::ai::transcribe_live_audio_chunk,
            commands::interview_copilot::analyze_interview_live,
            commands::decision_tracker::detect_decisions_live,
            commands::decision_tracker::confirm_live_decision,
            commands::notes_assistant::enhance_notes_live,
            commands::markdown_export::sync_meeting_to_markdown,
            // Capture
            commands::capture::start_native_recording,
            commands::capture::stop_native_recording,
            commands::capture::save_video_chunk,
            commands::capture::save_keyframe,
            // Integrations
            commands::integrations::push_task_to_notion,
            commands::integrations::execute_integration,
            // Artifacts
            commands::artifacts::artifacts_get,
            commands::artifacts::artifacts_list,
            commands::artifacts::artifacts_regenerate,
            // Timeline
            commands::timeline::timeline_get,
            commands::timeline::timeline_add_bookmark,
            // Library

            commands::library::recently_viewed_list,
            commands::library::recently_viewed_add,
            // Flashcards
            commands::flashcards::flashcards_list,
            commands::flashcards::flashcards_review,
            commands::flashcards::flashcards_due,
            commands::flashcards::flashcards_create,
            commands::flashcards::flashcards_update,
            commands::flashcards::flashcards_delete,
            // Quiz
            commands::quiz::quiz_sessions_create,
            commands::quiz::quiz_sessions_complete,
            commands::quiz::quiz_sessions_list,
            commands::quiz::quiz_list,
            // OCR
            commands::ocr::ocr_enqueue,
            commands::ocr::ocr_status,
            // Search
            commands::search::search_query,
            // Export
            commands::export::export_lecture,
            commands::export::export_folder_cram_sheet,
            commands::export::generate_highlights_reel,
            commands::export::generate_magic_link_html,
            commands::export::save_pdf_base64,
            commands::export::save_text_file,
            commands::export::open_file_path,
            // Dashboard
            commands::dashboard::dashboard_summary,
            // Search
            commands::search::search_library,
            commands::search::folder_search,
            commands::search::universal_search,
            commands::search::get_search_suggestions,
            commands::search::record_search_history,
            commands::search::pin_search,
            commands::search::clear_search_history,
            commands::search::summarize_search_results,
            commands::search::semantic_search,
            commands::search::rebuild_search_index,
            commands::search::get_index_status,
            commands::search::summarize_search_results,
            commands::search::seed_stress_data,
            // Collections
            commands::collections::create_collection,
            commands::collections::list_collections,
            commands::collections::add_lectures_to_collection,
            commands::collections::remove_lectures_from_collection,
            commands::collections::remove_lectures_from_all_collections,
            commands::collections::delete_collection,
            // Organization
            commands::organization::move_lectures,
            commands::organization::set_favorite,
            commands::organization::set_pinned,
            commands::organization::set_archived,
            // Batch
            commands::batch::batch_assign_metadata,
            commands::batch::batch_generate,
            commands::batch::batch_export,
            // Undo
            commands::undo::undo_last_action,
            commands::undo::get_undoable_action,
            // Scoped Chat
            commands::ai::start_scoped_chat,
            commands::ai::save_live_scratchpad,
            commands::ai::push_to_composio,
            // Study Actions
            commands::study_actions::run_study_action,
            commands::study_actions::get_study_action_status,
            // Prompts
            commands::prompts::list_prompts,
            commands::prompts::create_prompt,
            commands::prompts::update_prompt,
            commands::prompts::toggle_prompt_favorite,
            commands::prompts::delete_prompt,
            // Patterns
            commands::patterns::detect_patterns,
            commands::patterns::compare_lectures,
            // Multimodal Pipeline
            crate::ai::multimodal_pipeline::analyze_video_scenes,
            crate::ai::multimodal_pipeline::extract_keyframes,
            crate::ai::multimodal_pipeline::run_ocr_on_keyframes,
            crate::ai::multimodal_pipeline::build_lecture_context,
            crate::ai::multimodal_pipeline::get_processing_status,
            crate::ai::multimodal_pipeline::get_lecture_intelligence,
            crate::ai::multimodal_pipeline::generate_lecture_intelligence,
            // Providers
            commands::providers::list_providers,
            commands::providers::save_provider_config,
            // Workspace Notes
            commands::workspace_notes::get_workspace_notes,
            commands::workspace_notes::create_workspace_note,
            commands::workspace_notes::update_workspace_note,
            commands::workspace_notes::delete_workspace_note,
            // Phase 4 Student Productivity Intelligence
            commands::productivity::get_lecture_skip_segments,
            commands::productivity::get_auto_bookmarks,
            commands::productivity::generate_night_before_plan,
            commands::productivity::predict_exam_questions,
            commands::productivity::match_assignment_helper,
            commands::productivity::generate_one_page_cheat_sheet,
        ]);
        
        let app = builder.build(tauri::generate_context!())
            .expect("error while building tauri application");
            
        app.run(|_app_handle, event| {
            if let tauri::RunEvent::ExitRequested { api, .. } = event {
                // Prevent the app from exiting when all windows are closed
                // (e.g. when the user hides the Copilot sidebar).
                // The native messaging host and background tasks will keep running.
                api.prevent_exit();
            }
        });
}
