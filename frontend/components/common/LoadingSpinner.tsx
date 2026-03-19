export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div
        className="h-5 w-5 animate-spin rounded-full"
        style={{
          border: '2px solid var(--border)',
          borderTopColor: 'var(--accent)',
        }}
      />
    </div>
  );
}
