use serde::{Deserialize, Serialize};
use sqlx::{SqlitePool, Row};
use crate::error::AppResult;
use tauri::{AppHandle, Manager};
use crate::database::DbState;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ChatScope {
    Lecture(String),
    MultiLecture(Vec<String>),
    Folder(String),
    Subject(String),
    Semester(String),
    Library,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContextBundle {
    pub assembled_context: String,
    pub truncated: bool,
    pub lecture_ids: Vec<String>,
}

pub struct ContextEngine;

impl ContextEngine {
    pub async fn resolve_scope_lectures(pool: &SqlitePool, scope: &ChatScope) -> Result<Vec<String>, sqlx::Error> {
        match scope {
            ChatScope::Lecture(id) => Ok(vec![id.clone()]),
            ChatScope::MultiLecture(ids) => Ok(ids.clone()),
            ChatScope::Folder(id) => {
                let records = sqlx::query!(
                    "SELECT id FROM lectures WHERE (folder_id = ? OR folder_id IN (SELECT id FROM folders WHERE parent_id = ?)) AND trashed_at IS NULL",
                    id, id
                ).fetch_all(pool).await?;
                Ok(records.into_iter().filter_map(|r| r.id).collect())
            },
            ChatScope::Subject(subject) => {
                let records = sqlx::query!(
                    "SELECT id FROM lectures WHERE subject = ? AND trashed_at IS NULL",
                    subject
                ).fetch_all(pool).await?;
                Ok(records.into_iter().filter_map(|r| r.id).collect())
            },
            ChatScope::Semester(semester) => {
                let records = sqlx::query!(
                    "SELECT id FROM lectures WHERE semester = ? AND trashed_at IS NULL",
                    semester
                ).fetch_all(pool).await?;
                Ok(records.into_iter().filter_map(|r| r.id).collect())
            },
            ChatScope::Library => {
                let records = sqlx::query!(
                    "SELECT id FROM lectures WHERE trashed_at IS NULL"
                ).fetch_all(pool).await?;
                Ok(records.into_iter().filter_map(|r| r.id).collect())
            },
        }
    }

    pub async fn build_context_bundle(pool: &SqlitePool, scope: &ChatScope, query: &str) -> AppResult<ContextBundle> {
        let candidate_ids = Self::resolve_scope_lectures(pool, scope).await?;
        if candidate_ids.is_empty() {
            return Ok(ContextBundle {
                assembled_context: "No lectures found in this scope.".to_string(),
                truncated: false,
                lecture_ids: vec![],
            });
        }

        // Short-circuit check
        if let Some(short_circuit) = Self::local_first_short_circuit(pool, query, &candidate_ids).await {
            return Ok(ContextBundle {
                assembled_context: short_circuit,
                truncated: false,
                lecture_ids: candidate_ids,
            });
        }

        let max_budget_chars = 100000; // 100k chars ~ 25k tokens

        // Rank and construct
        let mut assembled_context = String::new();
        let mut used_ids = Vec::new();
        let mut truncated = false;

        // Clean query to avoid breaking FTS syntax
        let query_clean = query.replace("'", "''").replace("\"", "");
        let terms: Vec<String> = query_clean.split_whitespace()
            .filter(|w| w.len() > 2) 
            .map(|w| format!("\"{}\"", w))
            .collect();
            
        let fts_query = if terms.is_empty() {
            "\"\"".to_string()
        } else {
            terms.join(" OR ")
        };
        
        if candidate_ids.len() == 1 {
            let id = &candidate_ids[0];
            let row = sqlx::query(
                "SELECT title, summary, transcript, ocr_text FROM lectures_fts WHERE rowid = (SELECT rowid FROM lectures WHERE id = ?)"
            ).bind(id).fetch_optional(pool).await?;

            if let Some(r) = row {
                let title: Option<String> = r.get("title");
                let summary: Option<String> = r.get("summary");
                let transcript: Option<String> = r.get("transcript");
                
                assembled_context.push_str(&format!("[LECTURE: {}]\n", title.as_deref().unwrap_or("Untitled")));
                if let Some(s) = summary {
                    assembled_context.push_str(&format!("SUMMARY: {}\n", s));
                }
                if let Some(t) = transcript {
                    let mut txt = t;
                    if txt.len() > max_budget_chars {
                        txt.truncate(max_budget_chars);
                        truncated = true;
                    }
                    assembled_context.push_str(&format!("TRANSCRIPT EXCERPT: {}\n", txt));
                }
                used_ids.push(id.clone());
            }
        } else {
            // Multi-lecture ranking using dynamically built query
            let in_clause = candidate_ids.iter().map(|id| format!("'{}'", id.replace("'", "''"))).collect::<Vec<_>>().join(",");
            
            let sql = if terms.is_empty() {
                format!(
                    "SELECT l.id, f.title, f.summary, f.transcript
                     FROM lectures_fts f
                     JOIN lectures l ON f.rowid = l.rowid
                     WHERE l.id IN ({})
                     LIMIT 20", in_clause
                )
            } else {
                format!(
                    "SELECT l.id, f.title, f.summary, f.transcript
                     FROM lectures_fts f
                     JOIN lectures l ON f.rowid = l.rowid
                     WHERE lectures_fts MATCH '{}' AND l.id IN ({})
                     ORDER BY rank
                     LIMIT 20", fts_query, in_clause
                )
            };

            let rows = sqlx::query(&sql).fetch_all(pool).await?;

            for row in rows {
                let id: String = row.get("id");
                let title: Option<String> = row.get("title");
                let summary: Option<String> = row.get("summary");
                let transcript: Option<String> = row.get("transcript");

                let mut block = format!("[LECTURE: {}]\n", title.as_deref().unwrap_or("Untitled"));
                if let Some(s) = summary {
                    block.push_str(&format!("SUMMARY: {}\n", s));
                }
                if let Some(t) = transcript {
                    let mut txt = t;
                    if txt.len() > 30000 {
                        txt.truncate(30000);
                        truncated = true;
                    }
                    block.push_str(&format!("RELEVANT TRANSCRIPT EXCERPT: {}\n", txt));
                }
                block.push_str("\n");

                if assembled_context.len() + block.len() > max_budget_chars {
                    truncated = true;
                    break;
                }
                assembled_context.push_str(&block);
                used_ids.push(id);
            }
        }

        Ok(ContextBundle {
            assembled_context,
            truncated,
            lecture_ids: used_ids,
        })
    }

    pub async fn local_first_short_circuit(_pool: &SqlitePool, query: &str, candidate_ids: &[String]) -> Option<String> {
        let q = query.to_lowercase();
        if q.contains("how many lectures") {
            Some(format!("There are {} lectures in this scope.", candidate_ids.len()))
        } else {
            None
        }
    }
}

// --------------------------------------------------------
// Tauri Commands
// --------------------------------------------------------

#[tauri::command]
pub async fn resolve_scope_lectures(app: AppHandle, scope: ChatScope) -> Result<Vec<String>, String> {
    let pool = &app.state::<DbState>().pool;
    ContextEngine::resolve_scope_lectures(pool, &scope).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn build_context_bundle(app: AppHandle, scope: ChatScope, query: String) -> Result<ContextBundle, String> {
    let pool = &app.state::<DbState>().pool;
    ContextEngine::build_context_bundle(pool, &scope, &query).await.map_err(|e| e.to_string())
}
