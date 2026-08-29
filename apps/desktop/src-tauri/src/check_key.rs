use sqlx::sqlite::SqlitePoolOptions;
use std::env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let home = env::var("USERPROFILE").unwrap();
    let db_url = format!("sqlite://{}/Documents/BACHAM/Data/bacham.db", home);
    
    let pool = SqlitePoolOptions::new()
        .connect(&db_url).await?;
        
    let candidate_keys = ["gemini_api_key", "apiKey", "geminiApiKey", "bacham.gemini", "gemini"];
    for ck in candidate_keys {
        if let Ok(Some(row)) = sqlx::query("SELECT value FROM settings WHERE key = ?")
            .bind(ck)
            .fetch_optional(&pool)
            .await 
        {
            use sqlx::Row;
            let val: String = row.get("value");
            println!("Key {}: '{}'", ck, val);
        }
    }
    
    Ok(())
}
