export default function StatusToast({ message }) {
  if (!message) return null;
  return <div className="status">{message}</div>;
}
