const CATEGORY_VARIANT = {
  language: "badge-neutral",
  framework: "badge",
  cloud: "badge-warning",
  database: "badge-success",
  "data-ml": "badge-danger",
  "soft-skill": "badge-neutral",
};

export function SkillBadge({ name, category, proficiency }) {
  const variant = CATEGORY_VARIANT[category] || "badge-neutral";
  return (
    <span className={`badge ${variant}`} title={category}>
      {name}
      {proficiency != null && ` · ${proficiency}/5`}
    </span>
  );
}
