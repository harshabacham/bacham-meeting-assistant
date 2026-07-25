use crate::models::filter::{FilterQuery, MatchType};
use sqlx::{QueryBuilder, Sqlite};

pub fn build_filter_query<'a>(query: &mut QueryBuilder<'a, Sqlite>, filter: &FilterQuery) {
    if filter.conditions.is_empty() {
        return;
    }

    query.push(" AND (");
    let mut separated = query.separated(if filter.match_type == MatchType::All { " AND " } else { " OR " });

    for cond in &filter.conditions {
        if cond.field == "tags" {
            // Tags require a subquery
            match cond.operator.as_str() {
                "contains" | "equals" => {
                    let val = cond.value.as_str().unwrap_or("");
                    separated.push(format!("id IN (SELECT lecture_id FROM lecture_tags lt JOIN tags t ON t.id = lt.tag_id WHERE t.name LIKE '%{}%')", val.replace("'", "''")));
                },
                "in" => {
                    if let Some(arr) = cond.value.as_array() {
                        let mut tags = vec![];
                        for v in arr {
                            if let Some(s) = v.as_str() {
                                tags.push(s.replace("'", "''"));
                            }
                        }
                        if !tags.is_empty() {
                            let tags_str = tags.iter().map(|t| format!("'{}'", t)).collect::<Vec<_>>().join(",");
                            separated.push(format!("id IN (SELECT lecture_id FROM lecture_tags lt JOIN tags t ON t.id = lt.tag_id WHERE t.name IN ({}))", tags_str));
                        } else {
                            separated.push("1=0"); // Empty IN clause means false
                        }
                    }
                }
                _ => {}
            }
            continue;
        }

        let field = match cond.field.as_str() {
            "title" => "title",
            "course" => "course",
            "teacher" => "teacher",
            "subject" => "subject",
            "isFavorite" => "is_favorite",
            "folderId" => "folder_id",
            "isArchived" => "is_archived",
            _ => continue,
        };

        match cond.operator.as_str() {
            "equals" => {
                if let Some(s) = cond.value.as_str() {
                    separated.push(format!("{} = '{}'", field, s.replace("'", "''")));
                }
            },
            "contains" => {
                if let Some(s) = cond.value.as_str() {
                    separated.push(format!("{} LIKE '%{}%'", field, s.replace("'", "''")));
                }
            },
            "is_true" => {
                separated.push(format!("{} = 1", field));
            },
            "is_false" => {
                separated.push(format!("{} = 0", field));
            },
            _ => {}
        }
    }
    
    query.push(")");
}
