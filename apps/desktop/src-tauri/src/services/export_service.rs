use sqlx::SqlitePool;
use std::path::PathBuf;
use crate::error::AppResult;

pub struct ExportService;

impl ExportService {
    pub async fn export_json(pool: &SqlitePool, lecture_id: &str, dest: &PathBuf) -> AppResult<()> {
        let row = sqlx::query!("SELECT * FROM lectures WHERE id = ?", lecture_id).fetch_one(pool).await?;
        let transcript = Self::get_transcript(pool, lecture_id).await?;
        let artifacts = sqlx::query!("SELECT artifact_type, content_json FROM lecture_artifacts WHERE lecture_id = ?", lecture_id).fetch_all(pool).await?;
        
        let mut artifacts_map = serde_json::Map::new();
        for a in artifacts {
            if let Ok(json_val) = serde_json::from_str::<serde_json::Value>(&a.content_json) {
                artifacts_map.insert(a.artifact_type, json_val);
            } else {
                artifacts_map.insert(a.artifact_type, serde_json::Value::String(a.content_json));
            }
        }

        let summary = sqlx::query!("SELECT content FROM summaries WHERE lecture_id = ? ORDER BY generated_at DESC LIMIT 1", lecture_id)
            .fetch_optional(pool).await.unwrap_or(None).map(|r| r.content);

        let notes = sqlx::query!("SELECT content FROM notes WHERE lecture_id = ? ORDER BY updated_at DESC LIMIT 1", lecture_id)
            .fetch_optional(pool).await.unwrap_or(None).map(|r| r.content);

        let screenshot_rows = sqlx::query!("SELECT file_path, captured_at, is_key_frame FROM screenshots WHERE lecture_id = ? ORDER BY captured_at ASC", lecture_id)
            .fetch_all(pool).await.unwrap_or_default();
            
        let screenshots: Vec<serde_json::Value> = screenshot_rows.into_iter().map(|r| {
            let mut s = serde_json::Map::new();
            s.insert("filePath".to_string(), serde_json::Value::String(r.file_path));
            s.insert("capturedAt".to_string(), serde_json::Value::Number(serde_json::Number::from(r.captured_at)));
            s.insert("isKeyFrame".to_string(), serde_json::Value::Bool(r.is_key_frame.unwrap_or(0) != 0));
            serde_json::Value::Object(s)
        }).collect();

        let payload = serde_json::json!({
            "id": row.id,
            "title": row.title,
            "course": row.course,
            "semester": row.semester,
            "teacher": row.teacher,
            "createdAt": row.created_at,
            "transcript": transcript,
            "artifacts": artifacts_map,
            "summary": summary,
            "notes": notes,
            "screenshots": screenshots,
        });

        if let Some(parent) = dest.parent() {
            std::fs::create_dir_all(parent)?;
        }
        std::fs::write(dest, serde_json::to_string_pretty(&payload).unwrap())?;
        Ok(())
    }

    pub async fn export_markdown(pool: &SqlitePool, lecture_id: &str, dest: &PathBuf) -> AppResult<()> {
        let md = Self::build_markdown(pool, lecture_id, Some(dest)).await?;
        if let Some(parent) = dest.parent() {
            std::fs::create_dir_all(parent)?;
        }
        std::fs::write(dest, md)?;
        Ok(())
    }

    pub async fn export_html(pool: &SqlitePool, lecture_id: &str, dest: &PathBuf) -> AppResult<()> {
        let md = Self::build_markdown(pool, lecture_id, Some(dest)).await?;
        let row = sqlx::query!("SELECT title FROM lectures WHERE id = ?", lecture_id)
            .fetch_one(pool).await?;

        // Simple but functional HTML export with BACHAM branding
        let html = format!(r#"<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title} — BACHAM</title>
  <style>
    :root {{ --accent: #A6FF00; --bg: #111111; --surface: #1E1E1E; --text: #FFFFFF; }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{ font-family: 'Inter', -apple-system, sans-serif; background: var(--bg); color: var(--text); padding: 2rem; line-height: 1.7; }}
    .container {{ max-width: 800px; margin: 0 auto; }}
    .header {{ border-bottom: 2px solid var(--accent); padding-bottom: 1rem; margin-bottom: 2rem; }}
    .header h1 {{ font-size: 2rem; font-weight: 700; }}
    .header .badge {{ display: inline-block; background: var(--accent); color: #111; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; margin-top: 0.5rem; }}
    pre {{ background: var(--surface); padding: 1rem; border-radius: 8px; overflow-x: auto; border-left: 3px solid var(--accent); }}
    code {{ font-family: 'JetBrains Mono', monospace; font-size: 0.9em; }}
    h2 {{ font-size: 1.4rem; margin: 2rem 0 1rem; color: var(--accent); }}
    h3 {{ font-size: 1.1rem; margin: 1.5rem 0 0.5rem; }}
    p {{ margin-bottom: 1rem; }}
    ul, ol {{ margin: 0.5rem 0 1rem 1.5rem; }}
    li {{ margin-bottom: 0.25rem; }}
    .content {{ white-space: pre-wrap; }}
    .footer {{ margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #333; font-size: 0.8rem; color: #888; }}
    @media print {{ body {{ background: white; color: black; }} .header {{ border-color: #000; }} h2 {{ color: #000; }} .badge {{ background: #000; color: white; }} }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{title}</h1>
      <span class="badge">BACHAM Lecture Export</span>
    </div>
    <div class="content">{content}</div>
    <div class="footer">Generated by BACHAM — Lecture Intelligence Platform</div>
  </div>
</body>
</html>"#,
            title = html_escape(&row.title),
            content = html_escape(&md)
        );

        if let Some(parent) = dest.parent() {
            std::fs::create_dir_all(parent)?;
        }
        std::fs::write(dest, html)?;
        Ok(())
    }

    pub async fn export_pdf(pool: &SqlitePool, lecture_id: &str, dest: &PathBuf) -> AppResult<()> {
        use printpdf::*;
        use std::fs::File;
        use std::io::BufWriter;

        let row = sqlx::query!("SELECT title FROM lectures WHERE id = ?", lecture_id).fetch_one(pool).await?;
        let transcript = Self::get_transcript(pool, lecture_id).await?;
        let summary = sqlx::query!(
            "SELECT content FROM summaries WHERE lecture_id = ? ORDER BY generated_at DESC LIMIT 1",
            lecture_id
        )
        .fetch_optional(pool)
        .await
        .unwrap_or(None)
        .map(|r| r.content);

        if let Some(parent) = dest.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let (doc, page1, layer1) = PdfDocument::new(&row.title, Mm(210.0), Mm(297.0), "Layer 1");
        let current_layer = doc.get_page(page1).get_layer(layer1);

        let font = doc.add_builtin_font(BuiltinFont::Helvetica)
            .map_err(|e| crate::error::AppError::Internal(e.to_string()))?;

        current_layer.use_text(&row.title, 18.0, Mm(20.0), Mm(277.0), &font);

        if let Some(s) = summary {
            let short = if s.len() > 500 { &s[..500] } else { &s };
            current_layer.use_text("Summary:", 12.0, Mm(20.0), Mm(260.0), &font);
            current_layer.use_text(short, 9.0, Mm(20.0), Mm(252.0), &font);
        }

        if !transcript.is_empty() {
            let short = if transcript.len() > 1000 { &transcript[..1000] } else { &transcript };
            current_layer.use_text("Transcript:", 12.0, Mm(20.0), Mm(230.0), &font);
            current_layer.use_text(short, 9.0, Mm(20.0), Mm(222.0), &font);
        }

        let file = File::create(dest)?;
        let mut buf_writer = BufWriter::new(file);
        doc.save(&mut buf_writer).map_err(|e| crate::error::AppError::Internal(e.to_string()))?;
        Ok(())
    }

    async fn build_markdown(pool: &SqlitePool, lecture_id: &str, dest: Option<&PathBuf>) -> AppResult<String> {
        let row = sqlx::query!("SELECT title, course, semester, teacher FROM lectures WHERE id = ?", lecture_id)
            .fetch_one(pool).await?;

        let transcript = Self::get_transcript(pool, lecture_id).await?;
        let summary = sqlx::query!(
            "SELECT content FROM summaries WHERE lecture_id = ? ORDER BY generated_at DESC LIMIT 1",
            lecture_id
        )
        .fetch_optional(pool)
        .await
        .unwrap_or(None)
        .map(|r| r.content);

        let notes: Option<String> = sqlx::query!("SELECT content FROM notes WHERE lecture_id = ? ORDER BY updated_at DESC LIMIT 1", lecture_id)
            .fetch_optional(pool).await.unwrap_or(None)
            .map(|r| r.content);

        let mut md = format!("# {}\n\n", row.title);
        if let Some(c) = row.course { md.push_str(&format!("**Course:** {c}  \n")); }
        if let Some(s) = row.semester { md.push_str(&format!("**Semester:** {s}  \n")); }
        if let Some(t) = row.teacher { md.push_str(&format!("**Teacher:** {t}  \n")); }
        md.push('\n');

        if let Some(s) = summary {
            md.push_str("## Summary\n\n");
            md.push_str(&s);
            md.push_str("\n\n");
        }

        if let Some(ref n) = notes {
            md.push_str("## Notes\n\n");
            md.push_str(n);
            md.push_str("\n\n");
        }

        let artifacts = sqlx::query!("SELECT artifact_type, content_json FROM lecture_artifacts WHERE lecture_id = ?", lecture_id)
            .fetch_all(pool).await.unwrap_or_default();
            
        if !artifacts.is_empty() {
            md.push_str("## Artifacts\n\n");
            for a in artifacts {
                md.push_str(&format!("### {}\n\n", a.artifact_type.replace('_', " ").to_uppercase()));
                
                // If it's a JSON array of strings (e.g., action items), format it as a list
                if let Ok(json_val) = serde_json::from_str::<serde_json::Value>(&a.content_json) {
                    if let Some(arr) = json_val.as_array() {
                        for item in arr {
                            if let Some(s) = item.as_str() {
                                md.push_str(&format!("- {}\n", s));
                            } else {
                                md.push_str(&format!("- {}\n", item));
                            }
                        }
                        md.push('\n');
                    } else if let Some(obj) = json_val.as_object() {
                        for (k, v) in obj {
                            if let Some(s) = v.as_str() {
                                md.push_str(&format!("**{}**: {}\n\n", k, s));
                            } else {
                                md.push_str(&format!("**{}**: {}\n\n", k, v));
                            }
                        }
                    } else if let Some(s) = json_val.as_str() {
                        md.push_str(s);
                        md.push_str("\n\n");
                    } else {
                        md.push_str(&a.content_json);
                        md.push_str("\n\n");
                    }
                } else {
                    md.push_str(&a.content_json);
                    md.push_str("\n\n");
                }
            }
        }

        if !transcript.is_empty() {
            md.push_str("## Transcript\n\n");
            md.push_str(&transcript);
            md.push('\n');
        }

        let screenshot_rows = sqlx::query!("SELECT file_path FROM screenshots WHERE lecture_id = ? ORDER BY captured_at ASC", lecture_id)
            .fetch_all(pool).await.unwrap_or_default();

        if !screenshot_rows.is_empty() {
            md.push_str("## Visuals\n\n");
            let mut assets_dir_created = false;
            let mut assets_dir = PathBuf::new();

            if let Some(d) = dest {
                if let Some(parent) = d.parent() {
                    assets_dir = parent.join("assets");
                    if !assets_dir.exists() {
                        let _ = std::fs::create_dir_all(&assets_dir);
                    }
                    assets_dir_created = true;
                }
            }

            for row in screenshot_rows {
                let src_path = PathBuf::from(&row.file_path);
                if src_path.exists() {
                    if let Some(file_name) = src_path.file_name() {
                        if assets_dir_created {
                            let dest_path = assets_dir.join(file_name);
                            let _ = std::fs::copy(&src_path, &dest_path);
                            md.push_str(&format!("![Screenshot](assets/{})\n\n", file_name.to_string_lossy()));
                        } else {
                            // Absolute path if no destination provided
                            md.push_str(&format!("![Screenshot]({})\n\n", src_path.to_string_lossy().replace("\\", "/")));
                        }
                    }
                }
            }
        }

        Ok(md)
    }

    async fn build_folder_markdown(pool: &SqlitePool, folder_id: &str) -> AppResult<String> {
        let folder = sqlx::query!("SELECT name, subject, description FROM folders WHERE id = ?", folder_id)
            .fetch_one(pool).await?;

        let mut md = format!("# Collection: {}\n\n", folder.name);
        if let Some(s) = folder.subject { md.push_str(&format!("**Subject:** {s}  \n")); }
        if let Some(d) = folder.description { md.push_str(&format!("**Description:** {d}  \n")); }
        md.push('\n');

        let lectures = sqlx::query!("SELECT id, title FROM lectures WHERE folder_id = ? ORDER BY created_at ASC", folder_id)
            .fetch_all(pool).await?;

        if lectures.is_empty() {
            md.push_str("*This collection is empty.*\n");
            return Ok(md);
        }

        for (i, lecture) in lectures.iter().enumerate() {
            let title = &lecture.title;
            md.push_str(&format!("## {}. {}\n\n", i + 1, title));

            let summary = sqlx::query!("SELECT content FROM summaries WHERE lecture_id = ? ORDER BY generated_at DESC LIMIT 1", lecture.id)
                .fetch_optional(pool).await.unwrap_or(None).map(|r| r.content);

            if let Some(s) = summary {
                md.push_str("### Executive Summary\n");
                md.push_str(&s);
                md.push_str("\n\n");
            }

            let notes: Option<String> = sqlx::query!("SELECT content FROM notes WHERE lecture_id = ? ORDER BY updated_at DESC LIMIT 1", lecture.id)
                .fetch_optional(pool).await.unwrap_or(None).map(|r| r.content);

            if let Some(ref n) = notes {
                md.push_str("### Personal Notes\n");
                md.push_str(n);
                md.push_str("\n\n");
            }

            let flashcards = sqlx::query!("SELECT question, answer FROM flashcards WHERE lecture_id = ?", lecture.id)
                .fetch_all(pool).await?;

            if !flashcards.is_empty() {
                md.push_str("### Key Concepts (Flashcards)\n");
                for card in flashcards {
                    md.push_str(&format!("- **{}**: {}\n", card.question, card.answer));
                }
                md.push_str("\n\n");
            }
            
            md.push_str("---\n\n");
        }

        Ok(md)
    }

    pub async fn export_folder_cram_sheet(pool: &SqlitePool, folder_id: &str, dest: &PathBuf) -> AppResult<()> {
        let md = Self::build_folder_markdown(pool, folder_id).await?;
        
        let folder = sqlx::query!("SELECT name FROM folders WHERE id = ?", folder_id)
            .fetch_one(pool).await?;

        let html = format!(r#"<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title} — Exam Cram Sheet</title>
  <style>
    :root {{ --accent: #A6FF00; --bg: #111111; --surface: #1E1E1E; --text: #FFFFFF; }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{ font-family: 'Inter', -apple-system, sans-serif; background: var(--bg); color: var(--text); padding: 2rem; line-height: 1.7; }}
    .container {{ max-width: 900px; margin: 0 auto; }}
    .header {{ border-bottom: 2px solid var(--accent); padding-bottom: 1rem; margin-bottom: 2rem; }}
    .header h1 {{ font-size: 2.2rem; font-weight: 800; }}
    .header .badge {{ display: inline-block; background: var(--accent); color: #111; padding: 4px 12px; border-radius: 6px; font-size: 0.85rem; font-weight: 700; margin-top: 0.5rem; }}
    pre {{ background: var(--surface); padding: 1rem; border-radius: 8px; overflow-x: auto; border-left: 3px solid var(--accent); }}
    h2 {{ font-size: 1.6rem; margin: 3rem 0 1rem; color: var(--text); padding-bottom: 0.5rem; border-bottom: 1px solid #333; }}
    h3 {{ font-size: 1.2rem; margin: 2rem 0 0.5rem; color: var(--accent); }}
    p {{ margin-bottom: 1rem; }}
    ul, ol {{ margin: 0.5rem 0 1rem 1.5rem; }}
    li {{ margin-bottom: 0.5rem; }}
    .content {{ white-space: pre-wrap; }}
    .footer {{ margin-top: 4rem; padding-top: 1.5rem; border-top: 1px solid #333; font-size: 0.85rem; color: #888; text-align: center; }}
    @media print {{ 
        body {{ background: white; color: black; }} 
        .header {{ border-color: #000; }} 
        h3 {{ color: #333; }} 
        .badge {{ background: #000; color: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }} 
        h2 {{ page-break-before: always; }}
        h2:first-of-type {{ page-break-before: avoid; }}
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{title}</h1>
      <span class="badge">BACHAM Exam Cram Sheet</span>
    </div>
    <div class="content">{content}</div>
    <div class="footer">Generated by BACHAM — Your Personal AI Tutor</div>
  </div>
</body>
</html>"#,
            title = html_escape(&folder.name),
            content = html_escape(&md)
        );

        if let Some(parent) = dest.parent() {
            std::fs::create_dir_all(parent)?;
        }
        
        // Save as HTML since it prints to PDF beautifully
        std::fs::write(dest, html)?;
        Ok(())
    }

    async fn get_transcript(pool: &SqlitePool, lecture_id: &str) -> AppResult<String> {
        let rows = sqlx::query!("SELECT content FROM transcripts WHERE lecture_id = ? ORDER BY generated_at ASC", lecture_id)
            .fetch_all(pool).await.unwrap_or_default();
        Ok(rows.into_iter().map(|r| r.content).collect::<Vec<_>>().join("\n\n"))
    }
}

fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;")
     .replace('<', "&lt;")
     .replace('>', "&gt;")
     .replace('"', "&quot;")
}
