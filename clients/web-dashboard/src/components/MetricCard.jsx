export default function MetricCard({ title, value, subtitle }) {
  return (
    <article>
      <h3>{title}</h3>
      <strong>{value}</strong>
      <span>{subtitle}</span>
    </article>
  );
}
