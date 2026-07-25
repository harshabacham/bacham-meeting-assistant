use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FilterQuery {
    pub match_type: MatchType,
    pub conditions: Vec<FilterCondition>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum MatchType {
    All,
    Any,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FilterCondition {
    pub field: String,     // "title", "course", "teacher", "subject", "tags", "isFavorite"
    pub operator: String,  // "equals", "contains", "in", "is_true", "is_false"
    pub value: serde_json::Value, // Can be string, array of strings, boolean
}
