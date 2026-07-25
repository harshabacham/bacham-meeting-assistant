use tauri::State;
use crate::error::AppResult;
use crate::database::DbState;
use crate::services::flashcard_service::{FlashcardService, Flashcard};

#[tauri::command]
pub async fn flashcards_list(
    lecture_id: String,
    state: State<'_, DbState>,
) -> AppResult<Vec<Flashcard>> {
    FlashcardService::list_flashcards(&state.pool, &lecture_id).await
}

#[tauri::command]
pub async fn flashcards_review(
    id: String,
    rating: u8,
    state: State<'_, DbState>,
) -> AppResult<Flashcard> {
    FlashcardService::review_flashcard(&state.pool, &id, rating).await
}

#[tauri::command]
pub async fn flashcards_due(
    lecture_id: Option<String>,
    state: State<'_, DbState>,
) -> AppResult<Vec<Flashcard>> {
    FlashcardService::get_due_flashcards(&state.pool, lecture_id.as_deref()).await
}

#[tauri::command]
pub async fn flashcards_create(
    lecture_id: String,
    question: String,
    answer: String,
    difficulty: String,
    state: State<'_, DbState>,
) -> AppResult<Flashcard> {
    FlashcardService::create_flashcard(&state.pool, &lecture_id, &question, &answer, &difficulty).await
}

#[tauri::command]
pub async fn flashcards_update(
    id: String,
    question: String,
    answer: String,
    state: State<'_, DbState>,
) -> AppResult<Flashcard> {
    FlashcardService::update_flashcard(&state.pool, &id, &question, &answer).await
}

#[tauri::command]
pub async fn flashcards_delete(
    id: String,
    state: State<'_, DbState>,
) -> AppResult<()> {
    FlashcardService::delete_flashcard(&state.pool, &id).await
}
